@echo off
title Starting FANOS AI Platform...
echo ===================================================
echo     Starting FANOS AI Unified Cybersecurity Platform
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Docker services (Database, Redis, Backend, Frontend)...
docker compose up -d

echo.
echo [2/2] Checking container statuses...
docker compose ps

echo.
echo ===================================================
echo  FANOS AI is now online!
echo  - Web Application: http://localhost:3000
echo  - API Docs:        http://localhost:3000/api/docs
echo  - Health Check:    http://localhost:3000/health
echo ===================================================
echo.
pause
