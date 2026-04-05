@echo off
cd /d "%~dp0"
echo Starting the Resume Builder application locally...
start http://localhost:5173
call npm run dev
pause
