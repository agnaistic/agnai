@echo off
pushd %~dp0

REM Detect if launched from shortcut
set "fromShortcut=false"
if /I "%~1"=="fromShortcut" set "fromShortcut=true"

REM Check if dotenv is installed
where dotenv >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo "dotenv-cli not found. Installing globally..."
    call npm install -g dotenv-cli
)

REM Check if agnai is installed
where agnai >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo "agnai not found. Installing globally..."
    call npm install -g agnai
)

REM Get desktop path
set "desktop=%USERPROFILE%\Desktop"

if "%fromShortcut%"=="false" if not exist "%desktop%\Agnai.lnk" (
    echo "Creating desktop shortcut..."
    cscript //nologo create-shortcut.vbs
)

REM Run agnai with dotenv
call dotenv -e .env agnai

pause
popd