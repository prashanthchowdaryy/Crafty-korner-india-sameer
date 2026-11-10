@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3.10 or newer from python.org and tick "Add python.exe to PATH", then run this again.
  pause
  exit /b 1
)
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo Could not install the requirements. Check your internet connection and try again.
  pause
  exit /b 1
)
echo.
echo Website: http://localhost:8000    Admin panel: http://localhost:8000/admin/
echo Keep this window open while you use the site. Close it to stop the site.
start "" /min cmd /c "timeout /t 4 >nul & start http://localhost:8000/admin/"
python app.py
pause
