#!/bin/bash

# LLM Code Deployment - Startup Script

echo "🚀 Starting LLM Code Deployment System..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    echo "   Required: STUDENT_SECRET, OPENAI_API_KEY, GITHUB_TOKEN, GITHUB_USERNAME"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check environment variables
echo "🔍 Checking environment configuration..."

if [ -z "$STUDENT_SECRET" ]; then
    echo "❌ STUDENT_SECRET not set in .env"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY not set in .env"
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

# Create temp directory
mkdir -p temp

# Start the application
echo "🌟 Starting server..."
npm start
