# CyberAI — kiberxavfsizlik ta'lim platformasi

- `backend/` — Go + Gin + GORM (PostgreSQL/Neon yoki lokal SQLite)
- `frontend/` — React + Vite + Ant Design
- `render.yaml` — Render'ga deploy qilish uchun Blueprint (bepul tarif)

## Lokal ishga tushirish

```bash
# Backend (backend/.env — namuna: backend/.env.example)
cd backend && go build -o cyberai-backend.exe . && ./cyberai-backend.exe

# Frontend (frontend/.env — namuna: frontend/.env.example)
cd frontend && npm install && npm run dev
```

## Render'ga deploy (free)

1. Loyihani GitHub'ga yuklang (`.env`, `backups/`, `*.db` `.gitignore` orqali yuklanmaydi).
2. Render → **New → Blueprint** → repozitoriyni tanlang. `render.yaml` ikkita servis yaratadi:
   `cyberai-backend` (Go web service) va `cyber-learn` (statik sayt).
3. So'ralgan qiymatlarni kiriting:
   - `DATABASE_URL` — Neon'ning **pooled** manzili (`backend/.env` dagi bilan bir xil)
   - `DATABASE_URL_UNPOOLED` — Neon'ning to'g'ridan-to'g'ri manzili
   - `TEACHER_PASSWORD` — o'qituvchi (`teacher`) paroli, kamida 8 belgi. Bo'sh qolsa bazadagi parol o'zgarmaydi.
   - `CERT_SIGNER_NAME` — sertifikatdagi imzo egasining ismi (bo'sh qolsa "CyberAI")
   - `GOOGLE_AI_API_KEY` (backend) — AI yordamchi kaliti (ixtiyoriy). Faqat serverda turadi, brauzerga chiqmaydi.
4. Deploy tugagach sayt `https://cyber-learn.onrender.com` (yoki Render bergan nom) manzilida ochiladi.
   Frontend va backend bir-birining manzilini Render orqali avtomatik oladi.

### O'qituvchi parolini o'zgartirish

Render → `cyberai-backend` → **Environment** → `TEACHER_PASSWORD` qiymatini o'zgartiring → **Save Changes**.
Servis qayta ishga tushadi va ishga tushishda bazadagi `teacher` hisobining paroli yangisiga almashtiriladi.
Lokal serverda xuddi shu ishni `backend/.env` dagi `TEACHER_PASSWORD` orqali qilasiz.

### Bepul tarif cheklovlari

- Backend 15 daqiqa so'rovsiz turgach "uxlaydi"; keyingi birinchi so'rov ~30–60 soniya kutadi.
  Kerak bo'lsa, tashqi monitoring (masalan, UptimeRobot) bilan `/health` ni har 10 daqiqada chaqirib turish mumkin.
- Server diski vaqtinchalik — shuning uchun yuklangan fayllar diskda emas, bazada (Neon) saqlanadi.
- `JWT_SECRET` Render tomonidan yaratiladi; u o'zgarsa, foydalanuvchilar qayta kirishi kerak bo'ladi.
