@echo off
title DNDI — Сервер
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════╗
echo ║          DNDI — Запуск сервера       ║
echo ╚══════════════════════════════════════╝
echo.

:: Освобождаем порт 3000 если занят
netstat -ano 2>nul | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
        echo Освобождаю порт 3000 ^(PID %%p^)...
        taskkill /PID %%p /F >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)

cd /d "%~dp0src\server"
node ./bin/www

echo.
echo Сервер остановлен.
pause
