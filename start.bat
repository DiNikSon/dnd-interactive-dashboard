@echo off
title DNDI — Сервер
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════╗
echo ║          DNDI — Запуск сервера       ║
echo ╚══════════════════════════════════════╝
echo.

:: Освобождаем порт 3000 если занят
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo Освобождаю порт 3000 (PID %%p)...
    taskkill /PID %%p /F >nul 2>&1
)

cd /d "%~dp0src\server"
node ./bin/www

echo.
echo Сервер остановлен.
pause
