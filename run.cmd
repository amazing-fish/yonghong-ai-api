@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] 未找到 .venv\Scripts\python.exe
  echo 请先执行 setup.cmd
  exit /b 1
)

set "PYTHONPATH=%CD%"

echo 项目目录：%CD%
echo PYTHONPATH：%PYTHONPATH%
echo 正在启动 HTTPS 服务...
echo 健康检查：https://127.0.0.1:8443/api/v1/health
echo.

".venv\Scripts\python.exe" -m scripts.run_server
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] 服务异常退出，退出码：%EXIT_CODE%
  pause
)
exit /b %EXIT_CODE%
