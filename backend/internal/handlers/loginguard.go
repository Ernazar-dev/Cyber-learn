package handlers

import (
	"sync"
	"time"
)

// Login bo'yicha muvaffaqiyatsiz urinishlar hisobi: bitta hisobga `loginMaxFailures` marta
// noto'g'ri parol kiritilsa, u `loginLockWindow` davomida vaqtincha bloklanadi.
// IP bo'yicha emas — maktabda butun sinf bitta IP orqali chiqadi.
const (
	loginMaxFailures = 8
	loginLockWindow  = 10 * time.Minute
)

type loginFailures struct {
	count int
	until time.Time // shu vaqtgacha hisob qulflangan
	reset time.Time // hisob nolga qaytadigan vaqt
}

var (
	loginMu    sync.Mutex
	loginFails = map[string]*loginFailures{}
)

// loginLocked hisob hozir qulflanganmi va qancha kutish kerakligini qaytaradi.
func loginLocked(username string) (bool, time.Duration) {
	loginMu.Lock()
	defer loginMu.Unlock()
	f, ok := loginFails[username]
	if !ok {
		return false, 0
	}
	now := time.Now()
	if now.Before(f.until) {
		return true, f.until.Sub(now)
	}
	if now.After(f.reset) {
		delete(loginFails, username)
	}
	return false, 0
}

func loginFailed(username string) {
	loginMu.Lock()
	defer loginMu.Unlock()
	now := time.Now()
	// Xotira o'smasin: eskirgan yozuvlarni tozalash
	if len(loginFails) > 10000 {
		for k, f := range loginFails {
			if now.After(f.reset) && now.After(f.until) {
				delete(loginFails, k)
			}
		}
	}
	f, ok := loginFails[username]
	if !ok || now.After(f.reset) {
		f = &loginFailures{reset: now.Add(loginLockWindow)}
		loginFails[username] = f
	}
	f.count++
	if f.count >= loginMaxFailures {
		f.count = 0
		f.until = now.Add(loginLockWindow)
		f.reset = f.until
	}
}

func loginSucceeded(username string) {
	loginMu.Lock()
	delete(loginFails, username)
	loginMu.Unlock()
}
