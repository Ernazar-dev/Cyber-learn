package handlers

import (
	"sync"
	"time"
)

// Login bo'yicha muvaffaqiyatsiz urinishlar hisobi — ikki qatlam:
//
//  1. (login + IP): `loginMaxFailures` marta noto'g'ri parol — shu IP'dan shu loginga
//     `loginLockWindow` davomida kirib bo'lmaydi. Parolni tanlayotgan odam to'xtaydi, lekin
//     boshqa joydagi haqiqiy egasi bemalol kiraveradi (avval faqat login bo'yicha qulflanardi —
//     begona odam istalgan o'quvchini ataylab qulflab qo'ya olardi).
//  2. Faqat login: ko'p IP'dan tarqatilgan hujumga qarshi keng chegara —
//     `loginGlobalMaxFailures` xato `loginGlobalWindow` ichida.
//
// Maktabda butun sinf bitta IP orqali chiqadi, shuning uchun IP'ning o'zi bo'yicha emas.
const (
	loginMaxFailures = 8
	loginLockWindow  = 10 * time.Minute

	loginGlobalMaxFailures = 50
	loginGlobalWindow      = time.Hour
)

type loginFailures struct {
	count int
	until time.Time // shu vaqtgacha qulflangan
	reset time.Time // hisob nolga qaytadigan vaqt
}

var (
	loginMu    sync.Mutex
	loginFails = map[string]*loginFailures{}
)

func loginKeys(username, ip string) (pair, global string) {
	return "p:" + username + "|" + ip, "g:" + username
}

// lockedLocked: loginMu ushlangan holda chaqiriladi.
func lockedLocked(key string, now time.Time) (bool, time.Duration) {
	f, ok := loginFails[key]
	if !ok {
		return false, 0
	}
	if now.Before(f.until) {
		return true, f.until.Sub(now)
	}
	if now.After(f.reset) {
		delete(loginFails, key)
	}
	return false, 0
}

// loginLocked hisob shu IP uchun qulflanganmi va qancha kutish kerakligini qaytaradi.
func loginLocked(username, ip string) (bool, time.Duration) {
	pair, global := loginKeys(username, ip)
	loginMu.Lock()
	defer loginMu.Unlock()
	now := time.Now()
	if locked, wait := lockedLocked(pair, now); locked {
		return true, wait
	}
	return lockedLocked(global, now)
}

func countFailure(key string, now time.Time, max int, window, lock time.Duration) {
	f, ok := loginFails[key]
	if !ok || now.After(f.reset) {
		f = &loginFailures{reset: now.Add(window)}
		loginFails[key] = f
	}
	f.count++
	if f.count >= max {
		f.count = 0
		f.until = now.Add(lock)
		f.reset = f.until
	}
}

func loginFailed(username, ip string) {
	pair, global := loginKeys(username, ip)
	loginMu.Lock()
	defer loginMu.Unlock()
	now := time.Now()
	// Xotira o'smasin: eskirgan yozuvlarni tozalash
	if len(loginFails) > 20000 {
		for k, f := range loginFails {
			if now.After(f.reset) && now.After(f.until) {
				delete(loginFails, k)
			}
		}
	}
	countFailure(pair, now, loginMaxFailures, loginLockWindow, loginLockWindow)
	countFailure(global, now, loginGlobalMaxFailures, loginGlobalWindow, loginLockWindow)
}

// loginSucceeded faqat shu IP'dagi hisobni tozalaydi — umumiy hisob tarqatilgan hujumni
// kuzatishda davom etadi (egasi kirishi hujumchining hisobini nolga qaytarmasin).
func loginSucceeded(username, ip string) {
	pair, _ := loginKeys(username, ip)
	loginMu.Lock()
	delete(loginFails, pair)
	loginMu.Unlock()
}
