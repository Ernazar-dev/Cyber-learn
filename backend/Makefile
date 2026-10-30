BINARY=cyberai-server
PORT?=8080
DB_PATH?=cyberai.db
JWT_SECRET?=cyberai-super-secret-key-change-in-production

.PHONY: all deps build run clean dev

all: deps build

deps:
	@echo "📦 Bog'liqliklar yuklanmoqda..."
	go mod download
	go mod tidy

build: deps
	@echo "🏗️  Qurilmoqda..."
	go build -o $(BINARY) .

run: build
	@echo "🚀 Server ishga tushirilmoqda (port $(PORT))..."
	PORT=$(PORT) DB_PATH=$(DB_PATH) JWT_SECRET=$(JWT_SECRET) ./$(BINARY)

dev:
	@echo "🔄 Dev mode..."
	go run main.go

clean:
	@echo "🗑️  Tozalanmoqda..."
	rm -f $(BINARY) $(DB_PATH)

release:
	GIN_MODE=release go build -ldflags="-s -w" -o $(BINARY) .

help:
	@echo "CyberAI Backend — Buyruqlar:"
	@echo "  make deps    — Bog'liqliklarni yuklab olish"
	@echo "  make build   — Build qilish"
	@echo "  make run     — Build qilib ishga tushirish"
	@echo "  make dev     — Go run bilan ishga tushirish"
	@echo "  make clean   — Tozalash"
	@echo "  make release — Optimized production build"
