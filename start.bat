@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\" (
  echo 初回起動のため setup.bat を実行します...
  call "%~dp0setup.bat"
  exit /b %errorlevel%
)

if not exist ".next\" (
  echo ビルドが見つかりません。setup.bat を実行してください。
  pause
  exit /b 1
)

if not exist "data\meals.db" (
  echo データベースを初期化中...
  call npm run db:init
)

set PORT=3000
:find_port
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  set /a PORT+=1
  if %PORT% GTR 3010 (
    echo [エラー] 利用可能なポートが見つかりません。
    pause
    exit /b 1
  )
  goto find_port
)

echo ========================================
echo  献立記録アプリを起動中...
echo  http://localhost:%PORT%
echo  終了するにはこのウィンドウを閉じてください。
echo ========================================

start "" "http://localhost:%PORT%"
set PORT=%PORT%
call npx next start -p %PORT%
