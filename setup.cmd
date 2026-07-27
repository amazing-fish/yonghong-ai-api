@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "PYTHON_EXE=%~1"
if not defined PYTHON_EXE set "PYTHON_EXE=python"

"%PYTHON_EXE%" -c "import struct,sys; assert sys.version_info >= (3,10), sys.version; assert struct.calcsize('P')*8 == 64, 'Python must be 64-bit'; print(sys.version); print(sys.executable)"
if errorlevel 1 (
  echo.
  echo [ERROR] 未找到可用的 64 位 Python 3.10+。
  echo 可显式指定：setup.cmd "C:\Path\To\python.exe"
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo 正在创建虚拟环境...
  "%PYTHON_EXE%" -m venv .venv
  if errorlevel 1 exit /b 1
)

set "VENV_PYTHON=%CD%\.venv\Scripts\python.exe"

"%VENV_PYTHON%" -m pip install --upgrade pip
if errorlevel 1 exit /b 1

"%VENV_PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 exit /b 1

if not exist ".env" copy /y ".env.example" ".env" >nul

"%VENV_PYTHON%" -m scripts.generate_dev_cert
if errorlevel 1 exit /b 1

echo.
echo 初始化完成：
echo 1. 编辑 .env，填写 MODEL_API_KEY 和 MODEL_NAME
 echo 2. 执行 trust_dev_cert.cmd
 echo 3. 执行 run.cmd
exit /b 0
