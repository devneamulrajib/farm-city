@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "C:\data\db" mkdir "C:\data\db"
if not exist "C:\data\log" mkdir "C:\data\log"

set "BIN="
for /d %%D in ("C:\Program Files\MongoDB\Server\*") do set "BIN=%%D\bin"

if not defined BIN (
  echo MongoDB Community Server was not found under
  echo   C:\Program Files\MongoDB\Server
  echo.
  echo Install it from https://www.mongodb.com/try/download/community
  echo then double-click this file again.
  pause
  exit /b 1
)

if not exist "%BIN%\mongod.exe" (
  echo mongod.exe was not found in "%BIN%".
  pause
  exit /b 1
)

echo.
echo Farm City needs MongoDB as a single-node replica set named rs0.
echo If Windows says port 27017 is already in use, the MongoDB Windows
echo service is probably still running. Open Command Prompt as Administrator
echo and run:
echo.
echo   net stop MongoDB
echo.
echo Then run this file again.
echo.
echo Starting MongoDB. Leave the "Farm City MongoDB" window open.
echo.

start "Farm City MongoDB" "%BIN%\mongod.exe" --replSet rs0 --bind_ip 127.0.0.1 --port 27017 --dbpath C:\data\db --logpath C:\data\log\mongod.log

echo Waiting for MongoDB to accept connections...
timeout /t 6 /nobreak >nul

"%BIN%\mongosh.exe" --quiet --eval "try { const s = rs.status(); if (s.ok) { print('Replica set rs0 is already running.'); } } catch (e) { rs.initiate({_id:'rs0', members:[{_id:0, host:'127.0.0.1:27017'}]}); print('Replica set rs0 started.'); }"

echo.
echo If you saw "Replica set rs0 started" or "already running", MongoDB is ready.
echo Leave the Farm City MongoDB window open while you use the shop.
echo You can close this window.
pause
