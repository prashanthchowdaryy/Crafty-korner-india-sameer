@echo off
cd /d "%~dp0"
rem Rebuilds the site (use after editing the Blog sheet in inventory.xlsx). Products are managed in /admin.
python build.py
pause
