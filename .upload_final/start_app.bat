@echo off
cd /d "%~dp0"

echo Starting Backend...
cd backend
if exist "venv\Scripts\activate.bat" (
    start "SmartAttend_Backend" /B cmd /c "call venv\Scripts\activate.bat && uvicorn main:app --port 8000"
) else (
    start "SmartAttend_Backend" /B cmd /c "uvicorn main:app --port 8000"
)
cd ..

echo Starting Frontend...
cd frontend
start "SmartAttend_Frontend" /B cmd /c "npm run dev"
cd ..

exit
