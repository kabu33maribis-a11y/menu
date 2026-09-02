@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  献立記録アプリを再起動中...
echo ========================================
echo.

echo 既存のサーバーを停止しています...
setlocal EnableDelayedExpansion
for /L %%P in (3000,1,3010) do (
  for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%%P " ^| findstr "LISTENING"') do (
    tasklist /FI "PID eq %%A" /FI "IMAGENAME eq node.exe" 2>nul | findstr /I "node.exe" >nul
    if not errorlevel 1 (
      echo  ポート %%P の Node.js プロセス ^(PID %%A^) を停止しました。
      taskkill /PID %%A /F >nul 2>&1
    )
  )
)
endlocal

timeout /t 3 /nobreak >nul

echo.
echo 壊れたビルドキャッシュを削除して再ビルドします...
if exist ".next\" rd /s /q ".next"
if exist "data\.init.lock" del /f /q "data\.init.lock"
call npm run build
if errorlevel 1 (
  echo [エラー] ビルドに失敗しました。
  pause
  exit /b 1
)

echo.
echo サーバーを起動します...
echo.
call "%~dp0start.bat"
exit /b %errorlevel%
