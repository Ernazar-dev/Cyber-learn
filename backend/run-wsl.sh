#!/usr/bin/env bash
# CyberAI backend'ni WSL (Ubuntu) ichida ishga tushiradi.
# Ishlatish (WSL terminalida):  bash run-wsl.sh
# Port .env ichidagi PORT dan olinadi (hozir 8081).
set -e
cd "$(dirname "$0")"
echo "Building..."
go build -o srv .
echo "Starting backend..."
exec ./srv
