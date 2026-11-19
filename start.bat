@echo off
rem Meng's Blog 本地启动（首次运行前先在 server 和 web 目录各跑一次 npm install）
cd /d "%~dp0"
if not exist server\node_modules (
  echo [1/3] 安装后端依赖...
  cd server && call npm install --no-audit --no-fund && cd ..
)
if not exist web\dist (
  echo [2/3] 构建前端...
  cd web && call npm run build && cd ..
)
echo [3/3] 启动服务器: http://127.0.0.1:3000
cd server
node src/index.js
pause
