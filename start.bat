@echo off
title DNDI — Сервер
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════╗
echo ║          DNDI — Запуск сервера       ║
echo ╚══════════════════════════════════════╝
echo.

:: Ищем свободный порт начиная с 3000
set PORT=3000
:find_port
netstat -ano 2>nul | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo Порт %PORT% занят, пробую следующий...
    set /a PORT=%PORT%+1
    goto find_port
)
echo Использую порт %PORT%.
echo.

cd /d "%~dp0src\server"
set PORT=%PORT%
node ./bin/www

echo.
echo Сервер остановлен.
pause
