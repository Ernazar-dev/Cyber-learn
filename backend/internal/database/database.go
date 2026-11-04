package database

import (
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"time"

	"cyberai-backend/internal/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func isPostgresURL(s string) bool {
	return strings.HasPrefix(s, "postgres://") || strings.HasPrefix(s, "postgresql://")
}

func open(dsn string) *gorm.DB {
	var dialector gorm.Dialector
	// Masofaviy bazada (Neon) har bir so'rov tarmoq orqali ~0.3–0.8s oladi — bu "sekin" emas.
	slow := 200 * time.Millisecond
	if isPostgresURL(dsn) {
		// Simple protocol: har bir so'rov serverga bir marta boradi (prepare+execute ikki marta emas) —
		// masofaviy bazada kechikishni ~2 barobar kamaytiradi va Neon pooler bilan mos ishlaydi.
		dialector = postgres.New(postgres.Config{DSN: dsn, PreferSimpleProtocol: true})
		slow = 2 * time.Second
	} else {
		dialector = sqlite.Open(dsn)
	}
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.New(log.New(os.Stdout, "\r\n", log.LstdFlags), logger.Config{
			SlowThreshold:             slow,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		}),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	return db
}

// Init bazaga ulanadi. Ustuvorlik: DATABASE_URL (PostgreSQL, masalan Neon) → DB_PATH → cyberai.db (SQLite).
// DATABASE_URL_UNPOOLED berilsa, migratsiya va boshlang'ich ma'lumotlar shu to'g'ridan-to'g'ri
// ulanish orqali bajariladi (Neon tavsiyasi), ilova esa pool'li DATABASE_URL bilan ishlaydi.
func Init() {
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		dsn = os.Getenv("DB_PATH")
	}
	if dsn == "" {
		dsn = "cyberai.db"
	}

	migrateDSN := strings.TrimSpace(os.Getenv("DATABASE_URL_UNPOOLED"))
	if migrateDSN == "" || !isPostgresURL(dsn) {
		migrateDSN = dsn
	}

	DB = open(migrateDSN)
	migrateAndSeed()

	if migrateDSN != dsn {
		if sqlDB, err := DB.DB(); err == nil {
			sqlDB.Close()
		}
		DB = open(dsn)
	}

	if isPostgresURL(dsn) {
		if sqlDB, err := DB.DB(); err == nil {
			sqlDB.SetMaxOpenConns(10)
			sqlDB.SetMaxIdleConns(5)
			sqlDB.SetConnMaxIdleTime(5 * time.Minute)
		}
		log.Println("PostgreSQL bazasiga ulandi")
	}
}

// schemaVersion — modellar (internal/models) o'zgarganda shu qiymatni oshiring: keyingi ishga
// tushishda AutoMigrate bir marta bajariladi. O'zgarmagan bo'lsa, AutoMigrate o'tkazib yuboriladi
// (masofaviy bazada u ~100 ta tekshiruv so'rovi yuborib, ishga tushishni ~1 daqiqaga cho'zadi).
// DB_FORCE_MIGRATE=true bilan majburan bajarish mumkin.
const schemaVersion = "2026-10-31.3"

type schemaMeta struct {
	Key   string `gorm:"primaryKey"`
	Value string
}

func (schemaMeta) TableName() string { return "schema_meta" }

func schemaUpToDate() bool {
	if os.Getenv("DB_FORCE_MIGRATE") == "true" || !DB.Migrator().HasTable(&schemaMeta{}) {
		return false
	}
	var m schemaMeta
	return DB.Where("key = ?", "schema_version").First(&m).Error == nil && m.Value == schemaVersion
}

func migrateAndSeed() {
	if schemaUpToDate() {
		log.Printf("Baza sxemasi dolzarb (%s) — migratsiya o'tkazib yuborildi", schemaVersion)
	} else {
		err := DB.AutoMigrate(
			&models.User{},
			&models.Module{},
			&models.ModuleProgress{},
			&models.Lesson{},
			&models.LessonRead{},
			&models.UploadedFile{},
			&models.Assignment{},
			&models.AssignmentQuestion{},
			&models.FuzzyWeights{},
			&models.Certificate{},
			&models.CTFChallenge{},
			&models.CTFSolve{},
			&schemaMeta{},
		)
		if err != nil {
			log.Fatalf("Failed to migrate database: %v", err)
		}
		DB.Save(&schemaMeta{Key: "schema_version", Value: schemaVersion})
		log.Printf("Baza sxemasi yangilandi (%s)", schemaVersion)
	}

	backfillLegacyAssignmentBatches()
	seed()
	backfillUsernames()
}

var usernameUnsafe = regexp.MustCompile(`[^a-z0-9._]+`)

// usernameFromName ismdan login yasaydi: "Davron Aliev" → "davron.aliev".
func usernameFromName(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.NewReplacer("'", "", "`", "", "ʻ", "", "ʼ", "", "‘", "", "’", "").Replace(s)
	s = strings.Join(strings.Fields(s), ".")
	s = strings.Trim(usernameUnsafe.ReplaceAllString(s, ""), "._")
	if len(s) > 28 {
		s = s[:28]
	}
	if len(s) < 3 {
		s = "user"
	}
	return s
}

// backfillUsernames login'i yo'q (eski) foydalanuvchilarga ismidan login beradi.
// Idempotent: login'i bor yozuvlar o'zgarmaydi. Parollar tegilmaydi.
func backfillUsernames() {
	var users []models.User
	DB.Where("username IS NULL OR username = ''").Order("id asc").Find(&users)
	for _, u := range users {
		base := usernameFromName(u.Name)
		candidate := base
		for i := 2; ; i++ {
			var count int64
			DB.Model(&models.User{}).Where("username = ?", candidate).Count(&count)
			if count == 0 {
				break
			}
			candidate = fmt.Sprintf("%s%d", base, i)
		}
		DB.Model(&models.User{}).Where("id = ?", u.ID).Update("username", candidate)
		log.Printf("Login biriktirildi: %s → %s", u.Name, candidate)
	}
}

// backfillLegacyAssignmentBatches assigns a shared BatchID to "hamma
// o'quvchilar" (all-students) assignment rows created before the BatchID
// column existed, so CreateAssignment/Register can treat them as one
// broadcast batch (see Register in handlers/auth.go). It infers batches
// using the same identity the frontend already groups cards by — one-time
// and idempotent: rows that already have a BatchID are skipped.
func backfillLegacyAssignmentBatches() {
	var rows []models.Assignment
	DB.Where("batch_id IS NULL OR batch_id = ''").Order("created_at asc").Find(&rows)
	if len(rows) == 0 {
		return
	}

	type groupKey struct {
		title       string
		description string
		moduleID    uint
		aType       models.AssignmentType
		day         string
	}
	groups := make(map[groupKey][]uint)
	for _, a := range rows {
		k := groupKey{a.Title, a.Description, a.TargetModuleID, a.AssignmentType, a.DateAssigned.Format("2006-01-02")}
		groups[k] = append(groups[k], a.ID)
	}

	for _, ids := range groups {
		if len(ids) < 2 {
			continue // targeted at a single student, not a broadcast batch
		}
		DB.Model(&models.Assignment{}).Where("id IN ?", ids).Update("batch_id", uuid.NewString())
	}
}

// syncTeacherAccount .env dagi TEACHER_USERNAME / TEACHER_PASSWORD bilan boshqariladigan o'qituvchi
// hisobini moslaydi. Faqat aynan shu loginli hisobga tegadi: u bo'lsa parolini yangilaydi;
// bazada umuman o'qituvchi bo'lmasa, yangisini yaratadi. Bazada boshqa (haqiqiy) o'qituvchilar
// bo'lsa, ularning login/paroli hech qachon o'zgartirilmaydi. Parol logga yozilmaydi.
func syncTeacherAccount() {
	username := strings.ToLower(strings.TrimSpace(os.Getenv("TEACHER_USERNAME")))
	password := os.Getenv("TEACHER_PASSWORD")
	if username == "" {
		username = "teacher"
	}

	var teacher models.User
	exists := DB.Where("role = ? AND username = ?", models.RoleTeacher, username).First(&teacher).Error == nil

	if password == "" {
		return
	}
	if len(password) < 8 {
		// Server to'xtamasin (Render'da sayt butunlay ochilmay qolardi) — eski parol amalda qoladi
		log.Println("⚠️  TEACHER_PASSWORD 8 belgidan qisqa — e'tiborga olinmadi, bazadagi parol o'zgarmadi.")
		return
	}

	if !exists {
		var teacherCount int64
		DB.Model(&models.User{}).Where("role = ?", models.RoleTeacher).Count(&teacherCount)
		if teacherCount > 0 {
			return // bazada o'z o'qituvchilari bor — ularga tegmaymiz
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		DB.Create(&models.User{Name: username, Username: &username, Role: models.RoleTeacher, Password: string(hash)})
		log.Printf("O'qituvchi hisobi yaratildi: login %q (parol .env da)", username)
		return
	}

	// Lokal kompyuter va Render bitta Neon bazasiga ulangan bo'lsa, ikkala .env dagi parol farq qilganda
	// har bir ishga tushish parolni "o'ziniki"ga qaytarib, token_version'ni oshirardi — o'qituvchini
	// tez-tez "Sessiya tugadi" bilan chiqarib yuborardi (Render free har uyg'onishda qayta ishga tushadi).
	// Shuning uchun masofaviy bazadagi parolni faqat Render'dagi server (RENDER=true) yangilaydi.
	// Majburlash kerak bo'lsa: TEACHER_PASSWORD_SYNC=true.
	remote := isPostgresURL(strings.TrimSpace(os.Getenv("DATABASE_URL")))
	if remote && os.Getenv("RENDER") == "" && os.Getenv("TEACHER_PASSWORD_SYNC") != "true" {
		if bcrypt.CompareHashAndPassword([]byte(teacher.Password), []byte(password)) != nil {
			log.Println("ℹ️  Lokal server: TEACHER_PASSWORD masofaviy bazadagidan farq qiladi — o'zgartirilmadi (parolni Render'da boshqaring).")
		}
		return
	}

	updates := map[string]interface{}{}
	if bcrypt.CompareHashAndPassword([]byte(teacher.Password), []byte(password)) != nil {
		hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		updates["password"] = string(hash)
		// Parol o'zgardi — eski parol bilan olingan barcha tokenlar bekor bo'ladi
		updates["token_version"] = gorm.Expr("token_version + 1")
	}
	if len(updates) > 0 {
		DB.Model(&teacher).Updates(updates)
		log.Println("O'qituvchi paroli .env bo'yicha yangilandi — eski sessiyalar bekor qilindi")
	}
}

func seed() {
	syncTeacherAccount()

	// Seed modules
	var moduleCount int64
	DB.Model(&models.Module{}).Count(&moduleCount)
	if moduleCount == 0 {
		modules := []models.Module{
			{
				Title:       "Kiberxavfsizlik asoslari",
				OrderIndex:  1,
				Description: "Kiberxavfsizlikning asosiy tamoyillari: CIA triad, tahdidlarni modellashtirish va himoya qatlamlari.",
				Content:     "Kiberxavfsizlik tizimlar, tarmoqlar va ilovalarni raqamli hujumlardan himoya qilish amaliyotidir. CIA Triadi — Maxfiylik, Butunlik va Mavjudlik — barcha xavfsizlik printsiplarining asosini tashkil etadi. Maxfiylik faqat ruxsat etilgan tomonlarga ma'lumotga kirishga imkon beradi. Butunlik ma'lumotning o'zgarmasligini ta'minlaydi. Mavjudlik esa tizimlarning kerak paytda ishlashini kafolatlaydi.",
			},
			{
				Title:       "Tarmoq xavfsizligi",
				OrderIndex:  2,
				Description: "Tarmoq hujumlarini - Man-in-the-Middle, DDoS va paket ushlashni aniqlash va qarshi turish.",
				Content:     "Tarmoq hujumlari turli xil shakllarda kelishi mumkin. Man-in-the-Middle (MitM) hujumida tajovuzkor ikki tomon o'rtasidagi aloqani ushlaydi. DDoS hujumi tizimni haddan tashqari ko'p so'rovlar bilan yuklab, uni foydalanib bo'lmaydigan holga keltiradi.",
			},
			{
				Title:       "Kriptografiya",
				OrderIndex:  3,
				Description: "Simmetrik/asimmetrik shifrlash va hash algoritmlari orqali xavfsiz aloqa.",
				Content:     "Kriptografiya ma'lumotni shifrlash va maxfiy saqlash fani. Simmetrik shifrlashda bir xil kalit ishlatiladi. Asimmetrik shifrlashda ochiq va yopiq kalit juftligi ishlatiladi. Hash funksiyalar ma'lumot yaxlitligini tekshirishda ishlatiladi.",
			},
			{
				Title:       "Tizim himoyasi",
				OrderIndex:  4,
				Description: "Endpoint xavfsizligi, kirish nazorati, ko'p faktorli autentifikatsiya va SIEM monitoring.",
				Content:     "Tizim himoyasi endpoint xavfsizligini, kirish nazoratini va monitoring tizimlarini o'z ichiga oladi. Ko'p faktorli autentifikatsiya (MFA) kirish xavfsizligini oshiradi. SIEM tizimlari xavfsizlik hodisalarini real vaqtda kuzatib boradi.",
			},
		}
		DB.Create(&modules)
		log.Println("Seeded 4 modules")
	}

	// Rename old titles of the network module for already-seeded databases
	DB.Model(&models.Module{}).Where("title IN ?", []string{"Tarmoq xavflari", "Tarmoq xavsizligi"}).Update("title", "Tarmoq xavfsizligi")

	// Seed fuzzy weights
	var fwCount int64
	DB.Model(&models.FuzzyWeights{}).Count(&fwCount)
	if fwCount == 0 {
		fw := models.FuzzyWeights{
			Rule1Weight:           0.2,
			Rule2Weight:           0.5,
			Rule3Weight:           0.9,
			BeginnerThreshold:     0.4,
			IntermediateThreshold: 0.7,
		}
		DB.Create(&fw)
		log.Println("Seeded fuzzy weights")
	}

	// Seed demo students
	var studentCount int64
	DB.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&studentCount)
	if studentCount == 0 && os.Getenv("SEED_DEMO_DATA") == "true" {
		var modules []models.Module
		DB.Order("order_index asc").Find(&modules)

		// moduleScores[studentIdx][moduleOrderIndex] = score (0.0–1.0)
		// Only completed modules get a non-zero score.
		moduleScores := []map[int]float64{
			// Davron — faqat 1-modulni tugatgan, 78%
			{1: 0.78},
			// Madina — 1 va 2-modulni tugatgan
			{1: 0.82, 2: 0.75},
			// Jasur — barcha 4 ta modulni tugatgan
			{1: 0.91, 2: 0.88, 3: 0.85, 4: 0.95},
		}

		demoStudents := []struct {
			name            string
			age             int
			diagnosticScore float64
			level           models.Level
			fuzzyScore      float64
			speed           float64
			errors          float64
			completedMods   []int
		}{
			{
				name: "Davron Aliev", age: 20,
				diagnosticScore: 0.35, level: models.LevelBeginner, fuzzyScore: 0.32,
				speed: 0.7, errors: 0.6, completedMods: []int{1},
			},
			{
				name: "Madina Karimova", age: 21,
				diagnosticScore: 0.65, level: models.LevelIntermediate, fuzzyScore: 0.62,
				speed: 0.4, errors: 0.3, completedMods: []int{1, 2},
			},
			{
				name: "Jasur Nematov", age: 22,
				diagnosticScore: 0.88, level: models.LevelAdvanced, fuzzyScore: 0.85,
				speed: 0.2, errors: 0.1, completedMods: []int{1, 2, 3, 4},
			},
		}

		for si, ds := range demoStudents {
			// XP: 30 (diagnostic bonus) + 50*orderIndex per completed module
			xp := 30
			for _, cid := range ds.completedMods {
				xp += 50 * cid
			}

			student := models.User{
				Name:                    ds.name,
				Age:                     ds.age,
				Role:                    models.RoleStudent,
				DiagnosticScore:         ds.diagnosticScore,
				Level:                   ds.level,
				FuzzyScore:              ds.fuzzyScore,
				CompletedModulesCount:   len(ds.completedMods),
				Speed:                   ds.speed,
				Errors:                  ds.errors,
				HasCompletedInitialTest: true,
				LastFuzzyScore:          ds.fuzzyScore,
				LastFuzzyLevel:          ds.level,
				HasFuzzyResult:          true,
				XP:                      xp,
			}
			DB.Create(&student)

			scores := moduleScores[si]
			for _, mod := range modules {
				unlocked := false
				completed := false
				score := 0.0
				for _, cid := range ds.completedMods {
					if int(mod.ID) == cid {
						completed = true
						unlocked = true
						score = scores[mod.OrderIndex] // real ball
						break
					}
				}
				if !unlocked {
					switch ds.level {
					case models.LevelBeginner:
						unlocked = mod.OrderIndex == 1
					case models.LevelIntermediate:
						unlocked = mod.OrderIndex <= 2
					case models.LevelAdvanced:
						unlocked = true
					}
				}
				mp := models.ModuleProgress{
					UserID:    student.ID,
					ModuleID:  mod.ID,
					Unlocked:  unlocked,
					Completed: completed,
					Score:     score,
				}
				DB.Create(&mp)
			}
		}
		log.Println("Seeded 3 demo students with module scores")
	}

	seedCTFChallenges()
}

func seedCTFChallenges() {
	var ctfCount int64
	DB.Model(&models.CTFChallenge{}).Count(&ctfCount)
	freshSeed := ctfCount == 0

	var modules []models.Module
	DB.Order("order_index asc").Find(&modules)
	if freshSeed && len(modules) < 4 {
		return
	}

	defaults := []struct {
		title       string
		description string
		difficulty  models.CTFDifficulty
		points      int
		hint        string
		flag        string
	}{
		{
			title:       "Yashirin xabar",
			description: "Terminalga tushib qolgan quyidagi qator Base64 formatida kodlangan: `Y3liZXJhaXtiYXNlNjRfc2hpZnJfZW1hc30=`. Uni dekodlab, ochiq matnni flag sifatida kiriting.",
			difficulty:  models.CTFDifficultyEasy,
			points:      50,
			hint:        "Base64 — bu shifrlash emas, kodlash usuli. `base64 -d` buyrug'i yoki onlayn dekoderdan foydalaning.",
			flag:        "cyberai{base64_shifr_emas}",
		},
		{
			title:       "Ushlangan paket",
			description: "Tarmoq trafigini kuzatish paytida quyidagi hex (o'n oltilik) ketma-ketlik ushlandi: `637962657261697b6d616e5f6f72746164615f747572616d616e7d`. Buni matnga o'girib, flag'ni kiriting.",
			difficulty:  models.CTFDifficultyMedium,
			points:      75,
			hint:        "Har bir juft hex raqam bitta ASCII belgini bildiradi. Onlayn hex-to-text konverterdan foydalaning.",
			flag:        "cyberai{man_ortada_turaman}",
		},
		{
			title:       "Qadimiy shifr",
			description: "Tsezar shifrining 13 pozitsiyali varianti bilan yashiringan xabar: `plorenv{ebg13_ba_hpu}`. Har bir harf alifboda 13 pozitsiyaga siljitilgan. Asl matnni tiklab, flag sifatida kiriting.",
			difficulty:  models.CTFDifficultyMedium,
			points:      75,
			hint:        "Bu ROT13 — 13 pozitsiyaga siljitilgan Caesar shifri. Uni yana 13 pozitsiyaga siljitsangiz asl matn chiqadi.",
			flag:        "cyberai{rot13_on_uch}",
		},
		{
			title:       "Konfiguratsiya sizishi",
			description: "Tizim konfiguratsiya faylidan quyidagi qator topildi: `59336c695a584a686158746c626d646661324674583268316358567866513d3d`. Qator ikki qavat kodlangan: avval bir formatni, so'ng natijani yana boshqa formatda dekodlash kerak. Flag'ni tiklang.",
			difficulty:  models.CTFDifficultyHard,
			points:      100,
			hint:        "Birinchi qatlam hex (\"Ushlangan paket\" kabi). Chiqqan matn oxiridagi `=` belgilari esa ikkinchi qatlam Base64 ekanini bildiradi.",
			flag:        "cyberai{eng_kam_huquq}",
		},
	}

	for i, d := range defaults {
		if !freshSeed {
			// Avval seed qilingan topshiriqdagi savol/flag xatosini sarlavha bo'yicha tuzatish
			var existing models.CTFChallenge
			if DB.Where("title = ?", d.title).First(&existing).Error != nil {
				continue
			}
			if existing.Description == d.description && existing.Hint == d.hint &&
				bcrypt.CompareHashAndPassword([]byte(existing.FlagHash), []byte(d.flag)) == nil {
				continue
			}
			hash, err := bcrypt.GenerateFromPassword([]byte(d.flag), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("CTF flag hash xatosi: %v", err)
				continue
			}
			DB.Model(&existing).Updates(map[string]any{"description": d.description, "hint": d.hint, "flag_hash": string(hash)})
			continue
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(d.flag), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("CTF flag hash xatosi: %v", err)
			continue
		}
		DB.Create(&models.CTFChallenge{
			ModuleID:    modules[i].ID,
			Title:       d.title,
			Description: d.description,
			Difficulty:  d.difficulty,
			Points:      d.points,
			Hint:        d.hint,
			FlagHash:    string(hash),
		})
	}
	log.Println("Seeded 4 default CTF challenges")
}
