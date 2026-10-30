package handlers

import (
	"bytes"
	"embed"
	"fmt"
	"image/color"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/fogleman/gg"
	qrcode "github.com/skip2/go-qrcode"
	"golang.org/x/image/font"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/font/sfnt"
)

// Sertifikat butunlay kod orqali chiziladi (shablon rasmsiz) — saytdagi
// Inter/Manrope shriftlari va CyberAI ranglari bilan bir xil uslubda.

// Shriftlar Fontsource'dan (OFL litsenziya) — har bir og'irlik unicode qismlarga
// bo'lingan (latin, latin-ext, cyrillic, cyrillic-ext). Dinamik matn (ism, modul nomi)
// har bir harf uchun uni qamragan qism bilan yoziladi — textRuns'ga qarang.
//
//go:embed certfonts/*.ttf
var certFontFS embed.FS

// certFont — "oila-og'irlik", masalan "inter-600"
type certFont string

const (
	fontInterRegular   certFont = "inter-400"
	fontInterMedium    certFont = "inter-500"
	fontInterSemiBold  certFont = "inter-600"
	fontManropeBold    certFont = "manrope-700"
	fontManropeExtraBd certFont = "manrope-800"
)

var certSubsets = []string{"latin", "latin-ext", "cyrillic", "cyrillic-ext"}

// Manrope'da yo'q harflar (masalan, o'zbek kirilidagi Ғ, Қ) shu og'irlikdagi Inter'dan olinadi
var certFallback = map[certFont]certFont{
	fontManropeBold:    fontInterSemiBold,
	fontManropeExtraBd: fontInterSemiBold,
}

var (
	certFontsOnce sync.Once
	certFonts     map[certFont][]*sfnt.Font // certSubsets tartibida
	certFontsErr  error
)

func loadCertFonts() (map[certFont][]*sfnt.Font, error) {
	certFontsOnce.Do(func() {
		certFonts = map[certFont][]*sfnt.Font{}
		for _, name := range []certFont{fontInterRegular, fontInterMedium, fontInterSemiBold, fontManropeBold, fontManropeExtraBd} {
			family, weight, _ := strings.Cut(string(name), "-")
			for _, subset := range certSubsets {
				file := fmt.Sprintf("certfonts/%s-%s-%s.ttf", family, subset, weight)
				data, err := certFontFS.ReadFile(file)
				if err != nil {
					certFontsErr = err
					return
				}
				f, err := opentype.Parse(data)
				if err != nil {
					certFontsErr = fmt.Errorf("%s: %w", file, err)
					return
				}
				certFonts[name] = append(certFonts[name], f)
			}
		}
	})
	return certFonts, certFontsErr
}

// textRun — bitta shrift qismi bilan yoziladigan matn bo'lagi
type textRun struct {
	face font.Face
	text string
}

// Modul ID → sertifikatda ko'rsatiladigan asosiy mavzular
// (frontend/src/data/curriculum.ts dagi `concepts` bilan bir xil).
var certificateTopics = map[uint][]string{
	1: {"CIA triadasi", "Tahdidlarni modellashtirish", "Hujum vektorlari", "Chuqur himoya qatlamlari"},
	2: {"Firewall", "IDS/IPS", "VPN", "DDoS himoyasi"},
	3: {"AES shifrlash", "RSA algoritmi", "Hash funksiyalari", "TLS/SSL"},
	4: {"Minimal huquq", "Yangilanishlarni boshqarish", "MFA", "SIEM"},
}

var uzMonths = [...]string{"yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"}

func uzDate(t time.Time) string {
	return fmt.Sprintf("%d-%s, %d", t.Day(), uzMonths[t.Month()-1], t.Year())
}

type certificateData struct {
	Name        string
	ModuleID    uint
	ModuleTitle string
	Score       float64 // 0..1, modul topshiriqlari natijalarining o'rtachasi (0 — natija yo'q)
	IssuedAt    time.Time
	Code        string
	VerifyURL   string
	SignerName  string // bo'sh bo'lsa "CyberAI"
	SignerTitle string // bo'sh bo'lsa "Ta'lim direktori"
}

var (
	cNavy     = color.RGBA{11, 23, 54, 255}
	cNavyTop  = color.RGBA{18, 34, 74, 255}
	cNavyBot  = color.RGBA{7, 15, 36, 255}
	cBlue     = color.RGBA{37, 87, 214, 255}
	cCyan     = color.RGBA{34, 184, 230, 255}
	cInk      = color.RGBA{15, 23, 42, 255}
	cMuted    = color.RGBA{100, 116, 139, 255}
	cLine     = color.RGBA{226, 232, 240, 255}
	cChipBg   = color.RGBA{238, 243, 255, 255}
	cPanelTxt = color.RGBA{159, 179, 217, 255}
	cWhite    = color.RGBA{255, 255, 255, 255}
)

const (
	certW = 2000
	certH = 1414
	// Chap panel kengligi va asosiy matn boshlanadigan x
	panelW = 560.0
	mainX  = 680.0
	mainR  = 1880.0
)

type certCanvas struct {
	*gg.Context
	fonts map[certFont][]*sfnt.Font
}

// newFace — opentype (x/image vector rasterizatori): freetype'dan farqli, ustma-ust
// konturli glif'larda (Fontsource statik shriftlari) "teshik" qoldirmaydi
func newFace(f *sfnt.Font, size float64) font.Face {
	face, err := opentype.NewFace(f, &opentype.FaceOptions{Size: size, DPI: 72, Hinting: font.HintingNone})
	if err != nil {
		return nil
	}
	return face
}

// font o'zgarmas lotin matn uchun shriftni o'rnatadi (latin qismi)
func (c *certCanvas) font(name certFont, size float64) {
	if face := newFace(c.fonts[name][0], size); face != nil {
		c.SetFontFace(face)
	}
}

// textRuns dinamik matnni (ism, modul nomi) bo'laklarga ajratadi: har bir harf uni
// qamragan birinchi qism bilan, kerak bo'lsa zaxira oiladan (certFallback) yoziladi.
func (c *certCanvas) textRuns(name certFont, size float64, text string) []textRun {
	candidates := c.fonts[name]
	if fb, ok := certFallback[name]; ok {
		candidates = append(append([]*sfnt.Font{}, candidates...), c.fonts[fb]...)
	}
	var buf sfnt.Buffer
	faces := map[*sfnt.Font]font.Face{}
	var runs []textRun
	var cur *sfnt.Font
	var sb strings.Builder
	flush := func() {
		if sb.Len() == 0 {
			return
		}
		if faces[cur] == nil {
			faces[cur] = newFace(cur, size)
		}
		runs = append(runs, textRun{faces[cur], sb.String()})
		sb.Reset()
	}
	for _, r := range text {
		f := cur
		if f == nil || r > ' ' { // bo'shliqlar joriy bo'lakda qoladi
			f = candidates[0]
			for _, cand := range candidates {
				if idx, err := cand.GlyphIndex(&buf, r); err == nil && idx != 0 {
					f = cand
					break
				}
			}
		}
		if f != cur {
			flush()
			cur = f
		}
		sb.WriteRune(r)
	}
	flush()
	return runs
}

func (c *certCanvas) runsWidth(runs []textRun) float64 {
	total := 0.0
	for _, r := range runs {
		c.SetFontFace(r.face)
		w, _ := c.MeasureString(r.text)
		total += w
	}
	return total
}

func (c *certCanvas) drawRuns(runs []textRun, x, y float64) {
	for _, r := range runs {
		c.SetFontFace(r.face)
		c.DrawString(r.text, x, y)
		w, _ := c.MeasureString(r.text)
		x += w
	}
}

// tracked harflar orasiga qo'shimcha masofa qo'yib yozadi (gg'da letter-spacing yo'q)
func (c *certCanvas) tracked(s string, x, y, spacing float64) {
	for _, r := range s {
		ch := string(r)
		c.DrawString(ch, x, y)
		w, _ := c.MeasureString(ch)
		x += w + spacing
	}
}

// shieldPath — CyberAI logotipidagi qalqon (frontend/public/favicon.svg, viewBox 64)
func shieldPath(dc *gg.Context) {
	dc.MoveTo(32, 3.5)
	dc.CubicTo(24.5, 7.5, 15, 9.6, 7.5, 10.2)
	dc.LineTo(7.5, 30)
	dc.CubicTo(7.5, 45.6, 18.9, 55.4, 32, 60.5)
	dc.CubicTo(45.1, 55.4, 56.5, 45.6, 56.5, 30)
	dc.LineTo(56.5, 10.2)
	dc.CubicTo(49, 9.6, 39.5, 7.5, 32, 3.5)
	dc.ClosePath()
}

func drawLogo(dc *gg.Context, x, y, size float64) {
	dc.Push()
	dc.Translate(x, y)
	dc.Scale(size/64, size/64)

	shieldPath(dc)
	dc.Clip()
	dc.SetHexColor("#42AEE2")
	dc.DrawRectangle(0, 0, 32, 64)
	dc.Fill()
	dc.SetHexColor("#1F6A8C")
	dc.DrawRectangle(32, 0, 32, 64)
	dc.Fill()
	dc.ResetClip()

	dc.MoveTo(32, 8.6)
	dc.CubicTo(25.6, 11.9, 18, 13.7, 12, 14.3)
	dc.LineTo(12, 30)
	dc.CubicTo(12, 42.7, 21.2, 51, 32, 55.6)
	dc.CubicTo(42.8, 51, 52, 42.7, 52, 30)
	dc.LineTo(52, 14.3)
	dc.CubicTo(46, 13.7, 38.4, 11.9, 32, 8.6)
	dc.ClosePath()
	dc.SetColor(cWhite)
	dc.SetLineWidth(2.2)
	dc.Stroke()

	dc.SetHexColor("#2F6FD0")
	for _, r := range [][4]float64{{19, 31, 3.6, 7}, {24.6, 27, 3.6, 10}, {30.2, 23, 3.6, 11}, {35.8, 19, 3.6, 11}} {
		dc.DrawRectangle(r[0], r[1], r[2], r[3])
		dc.Fill()
	}
	dc.MoveTo(46.6, 21.6)
	dc.LineTo(44.2, 31.4)
	dc.LineTo(37.4, 25.2)
	dc.ClosePath()
	dc.Fill()
	dc.MoveTo(17.5, 44.5)
	dc.LineTo(24.6, 37.2)
	dc.LineTo(29.2, 41.8)
	dc.LineTo(41.4, 28.6)
	dc.SetLineWidth(3.8)
	dc.Stroke()
	dc.Pop()
}

func (c *certCanvas) drawPanel(d certificateData) error {
	g := gg.NewLinearGradient(0, 0, panelW*0.4, certH)
	g.AddColorStop(0, cNavyTop)
	g.AddColorStop(1, cNavyBot)
	c.SetFillStyle(g)
	c.DrawRectangle(0, 0, panelW, certH)
	c.Fill()

	// Fon bezagi: pastki-chap burchakdan tarqaluvchi nozik konsentrik yoylar (faqat panel ichida)
	c.DrawRectangle(0, 0, panelW, certH)
	c.Clip()
	c.SetLineWidth(1.5)
	for i := 1; i <= 9; i++ {
		c.SetColor(color.NRGBA{255, 255, 255, uint8(30 - 2*i)})
		c.DrawCircle(-40, certH+40, float64(i)*95)
		c.Stroke()
	}
	c.ResetClip()
	// O'ng chetdagi aksent chiziq
	accent := gg.NewLinearGradient(0, 0, 0, certH)
	accent.AddColorStop(0, cCyan)
	accent.AddColorStop(1, cBlue)
	c.SetFillStyle(accent)
	c.DrawRectangle(panelW-8, 0, 8, certH)
	c.Fill()

	drawLogo(c.Context, 90, 110, 112)
	c.SetColor(cWhite)
	c.font(fontManropeExtraBd, 56)
	c.DrawString("CyberAI", 90, 300)
	c.SetColor(cPanelTxt)
	c.font(fontInterRegular, 24)
	c.DrawString("Kiberxavfsizlik ta'lim platformasi", 90, 342)

	// Modul raqami
	c.SetColor(cPanelTxt)
	c.font(fontInterSemiBold, 20)
	c.tracked("MODUL", 90, 520, 5)
	c.SetColor(cWhite)
	c.font(fontManropeExtraBd, 150)
	c.DrawString(fmt.Sprintf("%02d", d.ModuleID), 82, 670)
	c.SetFillStyle(accent)
	c.DrawRoundedRectangle(92, 700, 90, 8, 4)
	c.Fill()

	// QR kod — oq kartochka ichida
	qr, err := qrcode.New(d.VerifyURL, qrcode.Medium)
	if err != nil {
		return err
	}
	qr.DisableBorder = true
	qr.ForegroundColor = cNavy
	const card, pad = 250.0, 22.0
	cardY := float64(certH) - 150 - card
	c.SetColor(cWhite)
	c.DrawRoundedRectangle(90, cardY, card, card, 20)
	c.Fill()
	c.DrawImage(qr.Image(int(card-2*pad)), int(90+pad), int(cardY+pad))

	c.SetColor(cPanelTxt)
	c.font(fontInterRegular, 19)
	c.DrawString("Haqiqiyligini tekshirish uchun", 90, cardY+card+42)
	c.DrawString("QR kodni skanerlang", 90, cardY+card+68)
	return nil
}

// drawSeal — o'ng pastdagi "tasdiqlangan" muhri
func (c *certCanvas) drawSeal(cx, cy, r float64, year int) {
	g := gg.NewLinearGradient(cx-r, cy-r, cx+r, cy+r)
	g.AddColorStop(0, cCyan)
	g.AddColorStop(1, cBlue)
	c.SetFillStyle(g)
	c.DrawCircle(cx, cy, r)
	c.Fill()
	c.SetColor(cWhite)
	c.DrawCircle(cx, cy, r-14)
	c.Fill()
	c.SetColor(cBlue)
	c.SetLineWidth(1.5)
	c.SetDash(3, 5)
	c.DrawCircle(cx, cy, r-24)
	c.Stroke()
	c.SetDash()

	// Aylana bo'ylab matn
	text := "CYBERAI  •  TASDIQLANGAN  •  CYBERAI  •  TASDIQLANGAN  •  "
	c.font(fontInterSemiBold, 15)
	tr := r - 40
	total := 0.0
	for _, ch := range text {
		w, _ := c.MeasureString(string(ch))
		total += w + 2
	}
	scale := 2 * math.Pi * tr / total // matn aylanani to'liq to'ldirsin
	angle := -math.Pi / 2
	c.SetColor(cNavy)
	for _, ch := range text {
		w, _ := c.MeasureString(string(ch))
		step := (w + 2) * scale / tr
		c.Push()
		c.Translate(cx, cy)
		c.Rotate(angle + step/2 + math.Pi/2)
		c.DrawStringAnchored(string(ch), 0, -tr, 0.5, 0.5)
		c.Pop()
		angle += step
	}

	drawLogo(c.Context, cx-32, cy-50, 64)
	c.SetColor(cNavy)
	c.font(fontManropeExtraBd, 24)
	c.DrawStringAnchored(fmt.Sprint(year), cx, cy+38, 0.5, 0.5)
}

func renderCertificatePNG(d certificateData) ([]byte, error) {
	fonts, err := loadCertFonts()
	if err != nil {
		return nil, err
	}
	c := &certCanvas{Context: gg.NewContext(certW, certH), fonts: fonts}

	c.SetColor(cWhite)
	c.Clear()

	// O'ng yuqori burchakdagi nozik nuqtali to'r
	c.SetColor(color.NRGBA{37, 87, 214, 40})
	for y := 50.0; y <= 140; y += 30 {
		for x := mainR - 180; x <= mainR+60; x += 30 {
			c.DrawCircle(x, y, 2.4)
			c.Fill()
		}
	}

	if err := c.drawPanel(d); err != nil {
		return nil, err
	}

	// ── Sarlavha ──
	c.SetColor(cBlue)
	c.font(fontInterSemiBold, 24)
	c.tracked("SERTIFIKAT", mainX, 175, 8)

	c.SetColor(cNavy)
	c.font(fontManropeExtraBd, 66)
	c.DrawString("Modulni tugatganlik to'g'risida", mainX, 262)

	c.SetColor(cMuted)
	c.font(fontInterRegular, 28)
	c.DrawString("Ushbu sertifikat egasi", mainX, 380)

	// ── Ism (uzun bo'lsa kichraytiriladi) ──
	name := strings.TrimSpace(d.Name)
	size := 100.0
	nameRuns := c.textRuns(fontManropeExtraBd, size, name)
	for size > 56 && c.runsWidth(nameRuns) > mainR-mainX {
		size -= 4
		nameRuns = c.textRuns(fontManropeExtraBd, size, name)
	}
	c.SetColor(cBlue)
	// Bosh harf balandligi ~0.75·size — yuqoridagi yozuvdan doim bir xil masofa
	nameBottom := 380 + 40 + size*0.8
	c.drawRuns(nameRuns, mainX, nameBottom)
	ul := gg.NewLinearGradient(mainX, 0, mainX+180, 0)
	ul.AddColorStop(0, cCyan)
	ul.AddColorStop(1, cBlue)
	c.SetFillStyle(ul)
	c.DrawRoundedRectangle(mainX, nameBottom+30, 180, 7, 3.5)
	c.Fill()

	// ── Modul ──
	y := nameBottom + 110
	c.SetColor(cMuted)
	c.font(fontInterRegular, 28)
	c.DrawString("quyidagi modul topshiriqlarini muvaffaqiyatli bajarib, modulni tugatdi:", mainX, y)
	y += 72
	c.SetColor(cInk)
	c.drawRuns(c.textRuns(fontManropeBold, 50, d.ModuleTitle), mainX, y)

	// ── Mavzular (chip'lar) ──
	if topics := certificateTopics[d.ModuleID]; len(topics) > 0 {
		y += 70
		c.SetColor(cMuted)
		c.font(fontInterSemiBold, 18)
		c.tracked("O'ZLASHTIRILGAN MAVZULAR", mainX, y, 3)
		y += 26
		c.font(fontInterMedium, 24)
		x := mainX
		const chipH, padX, gap = 50.0, 22.0, 12.0
		for _, t := range topics {
			w, _ := c.MeasureString(t)
			if x+w+2*padX > mainR {
				x = mainX
				y += chipH + gap
			}
			c.SetColor(cChipBg)
			c.DrawRoundedRectangle(x, y, w+2*padX, chipH, chipH/2)
			c.Fill()
			c.SetColor(cBlue)
			c.DrawStringAnchored(t, x+padX, y+chipH/2, 0, 0.38)
			x += w + 2*padX + gap
		}
	}

	// ── Ko'rsatkichlar qatori ──
	statsY := 960.0
	c.SetColor(cLine)
	c.SetLineWidth(2)
	c.DrawLine(mainX, statsY-50, mainR, statsY-50)
	c.Stroke()
	result := "—" // faqat o'qituvchi qo'lda belgilagan topshiriqlarda natija bo'lmaydi
	if d.Score > 0 {
		result = fmt.Sprintf("%d%%", int(math.Round(d.Score*100)))
	}
	stats := [][2]string{
		{"NATIJA", result},
		{"BERILGAN SANA", uzDate(d.IssuedAt)},
		{"SERTIFIKAT ID", strings.ToUpper(d.Code)},
	}
	colW := (mainR - mainX) / 3
	for i, s := range stats {
		x := mainX + float64(i)*colW
		if i > 0 {
			c.SetColor(cLine)
			c.DrawLine(x-30, statsY-10, x-30, statsY+70)
			c.Stroke()
		}
		c.SetColor(cMuted)
		c.font(fontInterSemiBold, 17)
		c.tracked(s[0], x, statsY+8, 3)
		c.SetColor(cNavy)
		c.font(fontManropeBold, 38)
		c.DrawString(s[1], x, statsY+62)
	}

	// ── Imzo ──
	signer := d.SignerName
	if signer == "" {
		signer = "CyberAI"
	}
	signerTitle := d.SignerTitle
	if signerTitle == "" {
		signerTitle = "Ta'lim direktori"
	}
	sigY := 1270.0
	c.SetColor(cNavy)
	signerRuns := c.textRuns(fontManropeExtraBd, 34, signer)
	for sz := 32.0; sz >= 22 && c.runsWidth(signerRuns) > 560; sz -= 2 {
		signerRuns = c.textRuns(fontManropeExtraBd, sz, signer)
	}
	c.drawRuns(signerRuns, mainX, sigY-22)
	c.SetColor(cInk)
	c.SetLineWidth(2)
	c.DrawLine(mainX, sigY, mainX+420, sigY)
	c.Stroke()
	c.drawRuns(c.textRuns(fontInterSemiBold, 22, signerTitle), mainX, sigY+38)
	c.SetColor(cMuted)
	c.font(fontInterRegular, 20)
	c.DrawString("CyberAI ta'lim platformasi", mainX, sigY+68)

	c.drawSeal(mainR-130, 1245, 125, d.IssuedAt.Year())

	var buf bytes.Buffer
	if err := c.EncodePNG(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
