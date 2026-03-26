@echo off
setlocal EnableDelayedExpansion

REM Thu muc du an
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ===================================================
echo   DANG KHOI DONG NUXT PRODUCTION (NITRO SERVER)
echo ===================================================

set "ALLOW_RUNTIME_MIGRATIONS=true"

set "ENV_FILE=%ROOT%.env"

REM Khong duoc de dau cach truoc dau & trong lenh set cua CMD
for /f %%p in ('powershell -NoProfile -Command "$p = Start-Process cmd -ArgumentList '/k set PORT=4012& set HOST=0.0.0.0& node --env-file=\"%ENV_FILE%\" .output/server/index.mjs' -WorkingDirectory '%ROOT%' -PassThru; $p.Id"') do set "NUXT_PID=%%p"

echo Nuxt (Nitro) PID: %NUXT_PID%

REM Cho server san sang
echo Dang cho Nitro Server san sang tai 127.0.0.1:4012 ...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 4012 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
  if !errorlevel! EQU 0 goto nuxt_ready
  timeout /t 1 /nobreak >nul
)

echo Nitro Server chua san sang. Dung script.
goto cleanup

:nuxt_ready
echo [+] Nitro Server da san sang tren Port 4012.

timeout /t 2 /nobreak >nul

REM Neu Nginx chua chay thi thu khoi dong tu folder nginx-1.29.6
set "NGINX_DIR=%ROOT%nginx-1.29.6"
set "NGINX_EXE=%NGINX_DIR%\nginx.exe"

REM Kiem tra nhanh port 80; neu chua mo thi start Nginx
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 80 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
if !errorlevel! NEQ 0 (
  if exist "%NGINX_EXE%" (
    echo Dang khoi dong Nginx...
    REM -p de Nginx tim logs/conf theo dung thu muc
    start "" /B "%NGINX_EXE%" -p "%NGINX_DIR%" -c conf\nginx.conf
    timeout /t 1 /nobreak >nul
  ) else (
    echo Khong tim thay Nginx tai: "%NGINX_EXE%"
  )
)

echo Kiem tra Nginx tren 127.0.0.1:80 ...
for /l %%i in (1,1,20) do (
  REM TCP connect nhanh (timeout ~400ms) de tranh bi treo khi port bi drop/filtered.
  powershell -NoProfile -Command "$client = New-Object System.Net.Sockets.TcpClient; $iar = $client.BeginConnect('127.0.0.1',80,$null,$null); if($iar.AsyncWaitHandle.WaitOne(400,$false)){ $client.EndConnect($iar) | Out-Null; $client.Close(); exit 0 } else { $client.Close(); exit 1 }" >nul 2>&1
  if !errorlevel! EQU 0 goto nginx_ready
  timeout /t 1 /nobreak >nul
)
echo [-] Nginx chua san sang tren port 80. Dung script.
goto cleanup

:nginx_ready
echo [+] Nginx da san sang tren Port 80.

set "TUNNEL_NAME=saymedia-new"

echo Dang khoi tao Cloudflare Tunnel...
echo Domain: https://saymediaai.com

REM 👉 Chay tunnel truc tiep vao ten tunnel da duoc config san (khong dung --url de tranh xung dot route Nginx)
.\cloudflared.exe tunnel run %TUNNEL_NAME%

:cleanup
echo.
echo Dang dung he thong (Nitro Server)...

if defined NUXT_PID (
  taskkill /PID %NUXT_PID% /T /F >nul 2>&1
)

REM kill them port 4012 cho chac
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4012') do taskkill /F /PID %%a >nul 2>&1

echo Da dung tat ca cac tien trinh.

endlocal