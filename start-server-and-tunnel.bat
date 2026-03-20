@echo off
setlocal

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
  if %WAIT_COUNT% geq 30 (
    echo Docker van chua san sang sau 5 phut. Dung script.
    exit /b 1
  )
  echo Dang cho Docker san sang... (%WAIT_COUNT%/30)
  timeout /t 10 /nobreak >nul
  goto wait_docker
)

:docker_ready
echo Docker da san sang.

echo Dang khoi dong Nuxt dev server tren port 4012...
start /B "" npm run dev

REM Cho Nuxt co thoi gian khoi dong truoc khi mo tunnel (co the giam/thay doi neu muon)
timeout /t 10 /nobreak >nul

echo Dang khoi tao Cloudflare Tunnel toi http://localhost:4012 ...
.\cloudflared.exe tunnel --url http://localhost:4012

echo.
echo Ca Nuxt dev server va Cloudflare Tunnel dang chay trong CUNG mot cua so nay.
echo Nhan Ctrl+C de dung Tunnel (va co the dung ca Nuxt neu muon).

endlocal
