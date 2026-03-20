@echo off
setlocal

REM Lấy thư mục chứa file .bat (chính là thư mục dự án)
set "ROOT=%~dp0"
cd /d "%ROOT%"

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
