@echo off
chcp 65001 >nul
title 記憶吞噬者 - 本機檔案同步工具
echo ====================================================
echo   記憶吞噬者 (Eaten into Memory) - 本機同步工具
echo ====================================================
echo.
echo 正在從 GitHub (origin/main) 拉取最新程式碼與素材...
git pull origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo [成功] 本機專案檔案已同步至最新版本！
) else (
    echo [提示] 若出現衝突，請先確認本機修改，或使用 git status 檢查。
)
echo.
pause
