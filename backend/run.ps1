# Build and run the backend WITHOUT `go run`.
# `go run` compiles to AppData\Local\go-build and is blocked by
# Windows Application Control policy on this machine, so we build
# the binary into this folder and run it from here instead.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Building cyberai-backend.exe ..." -ForegroundColor Cyan
go build -o cyberai-backend.exe .

if (-not $env:PORT) { $env:PORT = "8081" }
Write-Host "Starting backend on port $($env:PORT) ..." -ForegroundColor Green
.\cyberai-backend.exe
