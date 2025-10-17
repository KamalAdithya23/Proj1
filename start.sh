#!/bin/bash

# FastAPI LLM Code Deployment - Startup Script

echo "🚀 Starting FastAPI LLM Code Deployment System..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.fastapi.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    echo "   Required: STUDENT_SECRET, OPENAI_API_KEY, GITHUB_TOKEN, GITHUB_USERNAME"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Check environment variables
echo "🔍 Checking environment configuration..."

if [ -z "$STUDENT_SECRET" ]; then
    echo "❌ STUDENT_SECRET not set in .env"
    exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not set in .env"
    exit 1
fi

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GITHUB_USERNAME not set in .env"
    exit 1
fi

echo "✅ Environment configuration looks good!"

# Start the application
echo "🌟 Starting FastAPI server..."
echo "📚 API Documentation available at: http://localhost:8000/docs"
echo "🔧 ReDoc available at: http://localhost:8000/redoc"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
