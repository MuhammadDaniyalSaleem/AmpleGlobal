@echo off
cd /d "%~dp0"
echo Starting Ample Global Business Suite v45...
echo Open this exact address: http://127.0.0.1:5501/index.html
start "" "http://127.0.0.1:5501/index.html"
python -m http.server 5501
pause
