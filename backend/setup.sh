#!/usr/bin/env bash
# ============================================================
# CyberAI Backend — o'rnatish va ishga tushirish skripti
# ============================================================
set -e

echo "🔍 Go tekshirilmoqda..."
if ! command -v go &> /dev/null; then
    echo "❌ Go o'rnatilmagan. https://go.dev/dl/ dan yuklab oling"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
echo "✅ Go $GO_VERSION topildi"

echo ""
echo "📦 Bog'liqliklar yuklanmoqda..."
go mod download
go mod tidy

echo ""
echo "🏗️  Server qurilmoqda..."
go build -o cyberai-server .

echo ""
echo "✅ Muvaffaqiyatli qurildi: cyberai-server"
echo ""
echo "🚀 Ishga tushirish:"
echo "   ./cyberai-server"
echo ""
echo "⚙️  Muhit o'zgaruvchilari (ixtiyoriy):"
echo "   PORT=8080 ./cyberai-server"
echo "   DB_PATH=./data/cyberai.db ./cyberai-server"
echo "   JWT_SECRET=your-secret ./cyberai-server"
