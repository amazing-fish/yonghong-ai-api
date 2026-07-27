@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "certs\localhost-cert.cer" (
  echo [ERROR] 未找到 certs\localhost-cert.cer
  echo 请先执行 setup.cmd
  exit /b 1
)

certutil -user -addstore Root "certs\localhost-cert.cer"
if errorlevel 1 (
  echo [ERROR] 证书导入失败。
  exit /b 1
)

echo.
echo 已导入当前用户受信任根证书。
echo 请关闭并重新打开 Edge。
exit /b 0
