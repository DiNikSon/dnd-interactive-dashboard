@echo off
title DNDI — Настройка
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════╗
echo ║        DNDI — Первичная настройка    ║
echo ╚══════════════════════════════════════╝
echo.

:: Проверяем наличие Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не установлен!
    echo Скачай с https://nodejs.org и запусти setup.bat снова.
    pause
    exit /b 1
)

echo [1/4] Установка зависимостей сервера...
cd src\server
call npm install
if errorlevel 1 goto :error
cd ..\..

echo.
echo [2/4] Установка зависимостей клиента...
cd src\client
call npm install
if errorlevel 1 goto :error
cd ..\..

echo.
echo [3/4] Сборка клиента...
cd src\client
call npm run build
if errorlevel 1 goto :error
cd ..\..

echo.
echo [4/4] Открытие порта 3000 в брандмауэре (нужны права администратора)...
netsh advfirewall firewall show rule name="DNDI" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="DNDI" dir=in action=allow protocol=TCP localport=3000
) else (
    echo      Правило уже существует, пропускаем.
)

echo.
echo ╔══════════════════════════════════════╗
echo ║   Готово! Запусти start.bat          ║
echo ╚══════════════════════════════════════╝
echo.
pause
exit /b 0

:error
echo.
echo [ОШИБКА] Что-то пошло не так. Проверь вывод выше.
pause
exit /b 1
