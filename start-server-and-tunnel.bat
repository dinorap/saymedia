@echo off
setlocal EnableDelayedExpansion

REM Lấy thư mục chứa file .bat
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo Kiem tra Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker chua san sang. Thu khoi dong Docker Desktop...
  if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  )

  set /a WAIT_COUNT=0
  :wait_docker
  docker info >nul 2>&1
  if not errorlevel 1 goto docker_ready
  set /a WAIT_COUNT+=1
  if !WAIT_COUNT! geq 30 (
    echo Docker van chua san sang. Dung script.
    exit /b 1
  )
  echo Dang cho Docker san sang... (!WAIT_COUNT!/30)
  timeout /t 10 /nobreak >nul
  goto wait_docker
)

:docker_ready
echo Docker da san sang.

echo Dang khoi dong Nuxt dev server tren port 4012...
REM Danh dau Running via tunnel để tắt HMR (tránh các endpoint dev/WS không ổn qua proxy)
set "TUNNEL=1"
set "NUXT_PID="
for /f %%p in ('powershell -NoProfile -Command "$p=Start-Process -FilePath 'npm' -ArgumentList @('run','dev') -WorkingDirectory '%ROOT%' -PassThru; $p.Id"') do set "NUXT_PID=%%p"
echo Nuxt dev PID: %NUXT_PID%

echo Dang doi Nuxt san sang tai 127.0.0.1:4012 ...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 4012 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
  if !errorlevel! EQU 0 goto nuxt_ready
  timeout /t 1 /nobreak >nul
)

echo Nuxt chua san sang. Dung script.
exit /b 1

:nuxt_ready
echo Nuxt da san sang.

echo Dang khoi tao Cloudflare Tunnel (domain saymediaai.com)...

REM 👉 CHẠY TUNNEL CHUẨN (KHÔNG QUICK)
start "" cmd /k ".\cloudflared.exe tunnel run saymedia-new"

echo Mo trinh duyet toi https://saymediaai.com/ ...
REM Tunnel đôi khi cần vài giây để sẵn sàng trước khi load asset
timeout /t 8 /nobreak >nul
start "" "https://saymediaai.com/"

echo.
echo ===================================================
echo Website cua ban:
echo https://saymediaai.com
echo ===================================================

echo.
echo Nhan Ctrl+C o cua so tunnel de dung.
pause

REM Khi thoat -> kill Nuxt
echo Dung Nuxt dev...
if defined NUXT_PID taskkill /PID %NUXT_PID% /T /F >nul 2>&1

endlocal