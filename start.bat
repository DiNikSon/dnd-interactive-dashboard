@echo off
title DNDI — Сервер
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════╗
echo ║          DNDI — Запуск сервера       ║
echo ╚══════════════════════════════════════╝
echo.

cd src\server
node ./bin/www

echo.
echo Сервер остановлен.
pause
