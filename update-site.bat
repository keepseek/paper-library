@echo off
rem Meng's Blog 一键更新：Agentero vault -> data.json -> 构建 -> 部署 GitHub Pages
cd /d "%~dp0"
echo [1/3] 同步 Agentero vault...
node sync-vault.mjs || goto :err
echo.
echo [2/3] 构建前端...
cd web
call npm run build || goto :err
cd /d "%~dp0"
echo.
echo [3/3] 部署到 GitHub Pages...
node deploy-pages.cjs || goto :err
echo.
echo 完成！https://www.meng-s-blog.top/
pause
exit /b 0

:err
echo.
echo 更新失败，请检查上面的错误。
pause
exit /b 1
