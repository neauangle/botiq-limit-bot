@echo off
REM Change to batch file's location so we can call it anywhere
CD /D "%~dp0" 

CALL npm install
echo: 
echo Running script...
CALL node index.js
set /p Input=