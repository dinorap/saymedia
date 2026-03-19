@echo off
setlocal

REM Lấy thư mục chứa file .bat (chính là thư mục dự án)
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo Dang khoi dong Nuxt dev server tren port 4012...
start "Nuxt Dev Server" cmd /k "npm run dev"

REM Cho Nuxt co thoi gian khoi dong truoc khi mo tunnel (co the giam/thay doi neu muon)
timeout /t 10 /nobreak >nul

echo Dang khoi tao Cloudflare Tunnel toi http://localhost:4012 ...
start "Cloudflare Tunnel" cmd /k ".\cloudflared.exe tunnel --url http://localhost:4012"

echo.
echo Da mo 2 cua so:
echo  - Mot cua so chay: npm run dev
echo  - Mot cua so chay: cloudflared tunnel --url http://localhost:4012
echo.
echo Hay khong dong cac cua so nay neu muon website luon online.

endlocal
