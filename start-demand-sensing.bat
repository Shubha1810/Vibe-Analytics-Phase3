@echo off
title Vibe Analytics - Demand Sensing (Phase 3)
echo.
echo  ============================================
echo   Vibe Analytics - Demand Sensing (Phase 3)
echo  ============================================
echo.
echo  Starting Backend (Flask) on port 5001...
echo  Starting Frontend (Next.js) on port 3000...
echo.

cd /d "C:\Users\2000167629\Vibe-Analytics-Phase3"

REM Start backend in a new window
start "DS-Backend" cmd /k "cd /d C:\Users\2000167629\Vibe-Analytics-Phase3\backend && python app.py"

REM Wait 3 seconds for backend to initialize
timeout /t 3 /noq >nul

REM Start frontend in a new window
start "DS-Frontend" cmd /k "cd /d C:\Users\2000167629\Vibe-Analytics-Phase3\frontend && npm run dev"

echo.
echo  Both servers starting...
echo  Backend:  http://localhost:5001
echo  Frontend: http://localhost:3000
echo.
echo  Close this window anytime - servers run independently.
echo.
timeout /t 5 /noq >nul
start http://localhost:3000
