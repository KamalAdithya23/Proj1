@echo off
REM FastAPI LLM Code Deployment - Windows Startup Script

echo 🚀 Starting FastAPI LLM Code Deployment System...

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from template...
    copy env.fastapi.example .env
    echo 📝 Please edit .env file with your configuration before running again.
    echo    Required: STUDENT_SECRET, OPENAI_API_KEY, GITHUB_TOKEN, GITHUB_USERNAME
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist venv (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📦 Installing dependencies...
pip install -r requirements.txt

REM Check environment variables
echo 🔍 Checking environment configuration...

REM Start the application
echo 🌟 Starting FastAPI server...
echo 📚 API Documentation available at: http://localhost:8000/docs
echo 🔧 ReDoc available at: http://localhost:8000/redoc
uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
