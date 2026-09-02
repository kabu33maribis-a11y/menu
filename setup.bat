@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  献立記録アプリ - 初回セットアップ
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [エラー] Node.js が見つかりません。
  echo https://nodejs.org/ から Node.js をインストールしてください。
  pause
  exit /b 1
)

echo [1/3] 依存パッケージをインストール中...
call npm install
if errorlevel 1 (
  echo [エラー] npm install に失敗しました。
  pause
  exit /b 1
)

echo.
echo [2/3] データベースを初期化中...
call npm run db:init
if errorlevel 1 (
  echo [エラー] DB 初期化に失敗しました。
  pause
  exit /b 1
)

echo.
echo [3/3] 本番ビルド中...
call npm run build
if errorlevel 1 (
  echo [エラー] ビルドに失敗しました。
  pause
  exit /b 1
)

echo.
echo ========================================
echo  セットアップ完了！
echo  次回からは start.bat をダブルクリックしてください。
echo ========================================
pause
