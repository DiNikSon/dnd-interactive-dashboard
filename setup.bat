@echo off

:: ── Авто-повышение до администратора ─────────────────────────────────────────
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\dndi_elevate.vbs"
    echo UAC.ShellExecute "%~f0", "", "%~dp0", "runas", 1 >> "%temp%\dndi_elevate.vbs"
    "%temp%\dndi_elevate.vbs"
    del "%temp%\dndi_elevate.vbs" >nul 2>&1
    exit /b
)
chcp 65001 >nul
:: Запущен с правами администратора — устанавливаем рабочую директорию
cd /d "%~dp0"
:: ─────────────────────────────────────────────────────────────────────────────

title DNDI — Настройка

echo.
echo ╔══════════════════════════════════════╗
echo ║        DNDI — Первичная настройка    ║
echo ╚══════════════════════════════════════╝
echo.

:: Проверяем наличие Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js не найден. Устанавливаю из _redist...
    call :install_node
    goto :check_node_version
)

:check_node_version
:: Проверяем версию Node.js (нужен v22+)
for /f "tokens=1 delims=." %%v in ('node -e "process.stdout.write(process.version.slice(1))" 2^>nul') do set NODE_MAJOR=%%v
if "%NODE_MAJOR%"=="" (
    echo [ОШИБКА] Не удалось определить версию Node.js.
    echo Установи вручную из папки _redist.
    pause
    exit /b 1
)
if %NODE_MAJOR% LSS 22 (
    echo [!] Node.js v%NODE_MAJOR% слишком старый, нужен v22+. Устанавливаю из _redist...
    call :install_node
)

echo Найден Node.js:
node --version
echo.

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
echo [4/4] Открытие портов 3000-3009 в брандмауэре...
netsh advfirewall firewall show rule name="DNDI" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="DNDI" dir=in action=allow protocol=TCP localport=3000-3009
) else (
    netsh advfirewall firewall set rule name="DNDI" new localport=3000-3009
    echo      Правило обновлено.
)

echo.
echo ╔══════════════════════════════════════╗
echo ║   Готово! Запусти start.bat          ║
echo ╚══════════════════════════════════════╝
echo.
pause
exit /b 0

:: ── Установка Node.js из локального дистрибутива ─────────────────────────────
:install_node
set NODE_INSTALLER=
for %%f in ("%~dp0_redist\node-*.msi") do set NODE_INSTALLER=%%f
if "%NODE_INSTALLER%"=="" (
    echo [ОШИБКА] Установщик Node.js не найден в папке _redist!
    pause
    exit /b 1
)
echo Устанавливаю %NODE_INSTALLER%...
msiexec /i "%NODE_INSTALLER%" /qb ADDLOCAL=ALL
:: Обновляем PATH для текущей сессии
for /f "tokens=*" %%p in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do (
    for /f "tokens=2,*" %%a in ("%%p") do set "SYSTEM_PATH=%%b"
)
set "PATH=%SYSTEM_PATH%;%PATH%"
goto :eof

:error
echo.
echo [ОШИБКА] Что-то пошло не так. Проверь вывод выше.
pause
exit /b 1
