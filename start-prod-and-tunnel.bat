@echo off
setlocal EnableDelayedExpansion

REM Thu muc du an
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo Dang khoi dong Nuxt PRODUCTION (npm run preview) tren port 4012...

set "ALLOW_RUNTIME_MIGRATIONS=true"
set "NUXT_PID="

REM 👉 Start Nuxt va lay PID
for /f %%p in ('powershell -NoProfile -Command "$p=Start-Process -FilePath 'npm' -ArgumentList @('run','preview','--','--port','4012') -WorkingDirectory '%ROOT%' -PassThru; $p.Id"') do set "NUXT_PID=%%p"

echo Nuxt PID: %NUXT_PID%

REM Cho server san sang
echo Dang cho Nuxt preview san sang tai 127.0.0.1:4012 ...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 4012 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
  if !errorlevel! EQU 0 goto nuxt_preview_ready
  timeout /t 1 /nobreak >nul
)

echo Nuxt preview chua san sang. Dung script.
goto cleanup

:nuxt_preview_ready
echo Nuxt preview da san sang.

timeout /t 2 /nobreak >nul

set "TUNNEL_NAME=saymedia-new"

echo Dang khoi tao Cloudflare Tunnel...
echo Domain: https://saymediaai.com

REM 👉 Chay tunnel (foreground)
.\cloudflared.exe tunnel run %TUNNEL_NAME%

REM 👉 Khi Ctrl+C → xuống đây
:cleanup
echo.
echo Dang dung Nuxt dev...

if defined NUXT_PID (
  taskkill /PID %NUXT_PID% /T /F >nul 2>&1
)

echo Da dung tat ca.

endlocal