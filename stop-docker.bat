@echo off
title Stopping FANOS AI Platform...
echo ===================================================
echo     Stopping FANOS AI Docker Containers
echo ===================================================
echo.

cd /d "%~dp0"

docker compose stop

echo.
echo ===================================================
echo  All FANOS AI containers stopped cleanly.
echo  Your database data and settings are safely saved.
echo ===================================================
echo.
pause
