@echo off
setlocal EnableDelayedExpansion

REM Lấy thư mục chứa file .bat (chính là thư mục dự án)
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo Kiem tra Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker chua san sang. Thu khoi dong Docker Desktop...
  if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  ) else (
    echo Khong tim thay Docker Desktop tai duong dan mac dinh.
    echo Vui long mo Docker Desktop thu cong, sau do script se tiep tuc khi Docker san sang.
  )

  set /a WAIT_COUNT=0
  :wait_docker
  docker info >nul 2>&1
  if not errorlevel 1 goto docker_ready
  set /a WAIT_COUNT+=1
  if !WAIT_COUNT! geq 30 (
    echo Docker van chua san sang sau 5 phut. Dung script.
    exit /b 1
  )
  echo Dang cho Docker san sang... (!WAIT_COUNT!/30)
  timeout /t 10 /nobreak >nul
  goto wait_docker
)

:docker_ready
echo Docker da san sang.

echo Dang khoi dong Nuxt dev server tren port 4012...
set "TUNNEL=1"
set "NUXT_PID="
REM Chạy Nuxt dev nền và lấy PID để có thể stop khi dừng tunnel
for /f %%p in ('powershell -NoProfile -Command "$p=Start-Process -FilePath 'npm' -ArgumentList @('run','dev') -WorkingDirectory '%ROOT%' -PassThru -WindowStyle Hidden; $p.Id"') do set "NUXT_PID=%%p"
echo Nuxt dev PID: %NUXT_PID%

REM Chờ Nuxt thật sự listen port 4012 trước khi khởi tạo tunnel
echo Dang doi Nuxt san sang tai 127.0.0.1:4012 ...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 4012 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
  if !errorlevel! EQU 0 goto nuxt_ready
  timeout /t 1 /nobreak >nul
)
echo Nuxt chua san sang tren port 4012. Kiem tra log nuxt dev.
exit /b 1

:nuxt_ready
echo Nuxt da san sang.

REM Cho cloudflared 1 it thoi gian de tu dong reconnection (neu co)
timeout /t 2 /nobreak >nul

echo Dang khoi tao Cloudflare Tunnel toi http://127.0.0.1:4012 ...
.\cloudflared.exe tunnel --url http://127.0.0.1:4012

echo.
echo Ca Nuxt dev server va Cloudflare Tunnel dang chay trong CUNG mot cua so nay.
echo Nhan Ctrl+C de dung Tunnel (va co the dung ca Nuxt neu muon).

REM Tunnel kết thúc (ví dụ Ctrl+C) -> dừng Nuxt luôn để không còn process treo
echo Dung Nuxt dev...
if defined NUXT_PID taskkill /PID %NUXT_PID% /T /F >nul 2>&1
echo Da dung.

endlocal
