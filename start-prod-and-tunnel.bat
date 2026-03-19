@echo off
setlocal

REM Thu muc du an
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo Dang khoi dong Nuxt PRODUCTION (npm run start) tren port 4012...
start /B "" npm run start

REM Cho server co thoi gian khoi dong truoc khi mo tunnel
timeout /t 10 /nobreak >nul

echo Dang khoi tao Cloudflare Tunnel toi http://localhost:4012 ...
.\cloudflared.exe tunnel --url http://localhost:4012

echo.
echo Dang chay:
echo  - npm run start (production)
echo  - cloudflared tunnel --url http://localhost:4012
echo.
echo Nhan Ctrl+C de dung Tunnel. Neu muon dung ca server, dong cua so nay lai.

endlocal

