@echo off
REM LLM Code Deployment - Windows Startup Script

echo 🚀 Starting LLM Code Deployment System...

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from template...
    copy env.example .env
    echo 📝 Please edit .env file with your configuration before running again.
    echo    Required: STUDENT_SECRET, OPENAI_API_KEY, GITHUB_TOKEN, GITHUB_USERNAME
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

REM Create temp directory
if not exist temp mkdir temp

REM Start the application
echo 🌟 Starting server...
npm start

pause
