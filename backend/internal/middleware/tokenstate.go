package middleware

import (
	"errors"
	"sync"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"gorm.io/gorm"
)

// Har bir so'rovda Neon'ga borib kelmaslik uchun foydalanuvchi holati qisqa muddat keshlanadi.
// Shu server ichidagi o'zgarishlar (parol, o'chirish) keshni darhol tozalaydi (ForgetUser);
// boshqa server (masalan, lokal) bazani o'zgartirsa — ko'pi bilan userStateTTL ichida kuchga kiradi.
const userStateTTL = time.Minute

type userState struct {
	exists  bool
	version int
	role    string
	expires time.Time
}

var (
	userStateMu    sync.Mutex
	userStateCache = map[uint]userState{}
)

func lookupUserState(id uint) (userState, error) {
	now := time.Now()
	userStateMu.Lock()
	s, ok := userStateCache[id]
	userStateMu.Unlock()
	if ok && now.Before(s.expires) {
		return s, nil
	}

	var u models.User
	err := database.DB.Select("id", "role", "token_version").First(&u, id).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		s = userState{exists: false}
	case err != nil:
		return userState{}, err
	default:
		s = userState{exists: true, version: u.TokenVersion, role: string(u.Role)}
	}
	s.expires = now.Add(userStateTTL)

	userStateMu.Lock()
	if len(userStateCache) > 50000 { // xotira o'smasin
		userStateCache = map[uint]userState{}
	}
	userStateCache[id] = s
	userStateMu.Unlock()
	return s, nil
}

// ForgetUser foydalanuvchining keshlangan holatini o'chiradi — parol o'zgarganda yoki
// hisob o'chirilganda chaqiriladi, shunda eski tokenlar darhol rad etiladi.
func ForgetUser(id uint) {
	userStateMu.Lock()
	delete(userStateCache, id)
	userStateMu.Unlock()
}
