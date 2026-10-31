package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/handlers"
	"cyberai-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present; real environment variables always take priority.
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️  .env fayli topilmadi, muhit o'zgaruvchilari ishlatiladi")
	}

	if len(os.Getenv("JWT_SECRET")) < 32 {
		log.Fatal("JWT_SECRET o'rnatilmagan yoki 32 belgidan qisqa. backend/.env fayliga uzun tasodifiy qiymat yozing (namuna: .env.example).")
	}

	// Initialize database
	database.Init()

	// Yangiliklarni orqa fonda oldindan yuklash — birinchi ochilishda kutish bo'lmasin
	handlers.WarmNewsCache()

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.DebugMode)
	}

	r := gin.Default()
	r.MaxMultipartMemory = 64 << 20

	// ALLOWED_ORIGINS — vergul bilan ajratilgan frontend manzillari (.env).
	allowedOrigins := []string{}
	for _, o := range strings.Split(os.Getenv("ALLOWED_ORIGINS")+","+os.Getenv("ALLOWED_ORIGIN"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			// Render (render.yaml, fromService: host) servisning ichki nomini beradi: "cyber-learn-ab12".
			// Ochiq manzil — "https://cyber-learn-ab12.onrender.com".
			if !strings.Contains(o, "://") {
				if !strings.Contains(o, ".") && o != "localhost" {
					o += ".onrender.com"
				}
				o = "https://" + o
			}
			allowedOrigins = append(allowedOrigins, strings.TrimSuffix(o, "/"))
		}
	}
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"http://localhost:5173"}
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Mijoz IP'si (rate limit shunga tayanadi). X-Forwarded-For'ni mijoz o'zi yozib yubora oladi —
	// Render uni tozalamaydi, shuning uchun unga ishonilmaydi. Render oldida doim Cloudflare turadi
	// va u haqiqiy IP'ni True-Client-IP'ga yozadi (mijoz uni soxtalashtira olmaydi).
	// Boshqa hostingda: CLIENT_IP_HEADER=<sarlavha nomi>; bo'sh bo'lsa — TCP ulanish manzili.
	_ = r.SetTrustedProxies(nil)
	if h := os.Getenv("CLIENT_IP_HEADER"); h != "" {
		r.TrustedPlatform = h
	} else if os.Getenv("RENDER") != "" {
		r.TrustedPlatform = "True-Client-IP"
	}

	// Har bir javobga xavfsizlik sarlavhalari, JSON tanasi hajmi chegarasi va IP bo'yicha
	// umumiy limit — bitta manbadan so'rov oqimi serverni bo'g'ib qo'ymasin. Limit keng:
	// maktabda butun sinf bitta IP orqali chiqadi.
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.BodyLimit(1 << 20))
	r.Use(middleware.RateLimit(1500, time.Minute))

	// Health check
	// Backend manzili brauzerda ochilganda 404 emas, tushunarli javob
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "CyberAI Backend", "health": "/health", "api": "/api"})
	})
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "CyberAI Backend"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Fayl yuklash — faqat o'qituvchi (fayllar bazada saqlanadi, Neon hajmi cheklangan).
		// Ko'rish ochiq: darslardagi fayl havolalari <iframe>/<a> orqali tokensiz ochiladi.
		api.POST("/upload", middleware.Auth(), middleware.TeacherOnly(), middleware.RateLimit(30, time.Hour), handlers.UploadFile)
		api.GET("/files/:name", handlers.GetUploadedFile)

		// Rankings (public leaderboard)
		api.GET("/rankings", handlers.GetRankings)

		// Certificate verification (public lookup by code)
		api.GET("/certificate/verify/:code", handlers.VerifyCertificate)

		// Cybersecurity news feed (public, proxied through backend)
		api.GET("/news", handlers.GetNews)

		// Auth (public)
		auth := api.Group("/auth")
		{
			// Login: urinishlar hisob bo'yicha cheklanadi (handlers/loginguard.go);
			// IP bo'yicha esa keng limit — maktabda butun sinf bitta IP'dan kiradi.
			auth.POST("/login", middleware.RateLimit(120, time.Minute), handlers.Login)
			auth.POST("/register", middleware.RateLimit(60, 10*time.Minute), handlers.Register)
			auth.GET("/me", middleware.Auth(), handlers.Me)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.Auth())
		{
			// Students
			protected.GET("/students", middleware.TeacherOnly(), handlers.GetStudents)
			protected.DELETE("/students/:id", middleware.TeacherOnly(), handlers.DeleteStudent)
			protected.PUT("/students/:id/credentials", middleware.TeacherOnly(), handlers.SetStudentCredentials)
			protected.GET("/students/me/progress", handlers.GetMyProgress)
			protected.GET("/students/:id", handlers.GetStudent)

			// Modules
			protected.GET("/modules", handlers.GetModules)
			protected.GET("/modules/:id", handlers.GetModule)
			protected.GET("/modules/:id/certificate", handlers.GetModuleCertificate)

			// CTF challenges (per-module and aggregated)
			protected.GET("/modules/:id/ctf", handlers.GetModuleCTFChallenges)
			protected.GET("/ctf", handlers.GetAllCTFChallenges)
			protected.POST("/ctf", middleware.TeacherOnly(), handlers.CreateCTFChallenge)
			protected.DELETE("/ctf/:id", middleware.TeacherOnly(), handlers.DeleteCTFChallenge)
			// Flag'ni tanlab topish (brute force) va bcrypt orqali CPU'ni band qilishga qarshi
			protected.POST("/ctf/:id/submit", middleware.RateLimitUser(20, time.Minute), handlers.SubmitCTFFlag)

			// Assessment (fuzzy)
			// Diagnostika: savollar va baholash serverda. Javobni tez-tez qayta yuborib
			// to'g'risini terib topmaslik uchun topshirish soni cheklangan.
			protected.GET("/diagnostic", handlers.GetDiagnostic)
			protected.POST("/diagnostic/start", handlers.StartDiagnostic)
			protected.POST("/assessment/submit", middleware.RateLimitUser(10, 10*time.Minute), handlers.SubmitAssessment)

			// Lessons
			protected.GET("/lessons", handlers.GetLessons)
			protected.POST("/lessons", middleware.TeacherOnly(), handlers.CreateLesson)
			protected.DELETE("/lessons/:id", middleware.TeacherOnly(), handlers.DeleteLesson)
			protected.POST("/lessons/:id/read", handlers.MarkLessonRead)

			// Assignments
			protected.GET("/assignments", handlers.GetAssignments)
			protected.GET("/assignments/:id", handlers.GetAssignment)
			protected.POST("/assignments", middleware.TeacherOnly(), handlers.CreateAssignment)
			// Javoblarni cheksiz qayta yuborib to'g'risini "terib" topishni sekinlashtiradi
			protected.POST("/assignments/:id/start", middleware.RateLimitUser(60, time.Minute), handlers.StartAssignment)
			protected.POST("/assignments/:id/complete", middleware.RateLimitUser(20, time.Minute), handlers.CompleteAssignment)

			// Analytics
			protected.GET("/analytics", handlers.GetAnalytics)

			// AI yordamchi — Gemini kaliti faqat serverda
			protected.GET("/assistant/status", handlers.AssistantStatus)
			protected.POST("/assistant", middleware.RateLimitUser(15, time.Minute), handlers.AskAssistant)

			// Fuzzy weights
			protected.GET("/fuzzy-weights", handlers.GetFuzzyWeights)
			protected.PUT("/fuzzy-weights", middleware.TeacherOnly(), handlers.UpdateFuzzyWeights)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
		// Sarlavhasini sekin yuboruvchi ulanishlar serverni band qilmasin (slowloris).
		// Read/WriteTimeout qo'yilmaydi — 64 MB gacha fayl yuklash/yuklab olish sekin tarmoqda uzoq davom etadi.
		ReadHeaderTimeout: 15 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}

	go func() {
		log.Printf("🚀 CyberAI Backend server started on port %s", port)
		log.Printf("📖 Health check: http://localhost:%s/health", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Render qayta deploy qilganda/uxlatganda SIGTERM yuboradi — boshlangan so'rovlar tugashini kutamiz
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("Server to'xtatilmoqda...")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Shutdown xatosi: %v", err)
	}
}
