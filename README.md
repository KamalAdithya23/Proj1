# FastAPI LLM Code Deployment System

A Python FastAPI application that can build, deploy, and update web applications using LLM assistance and GitHub Pages deployment.

## Overview

This FastAPI system implements a complete workflow for:
1. **Build**: Receiving app briefs, generating applications with LLM assistance, and deploying to GitHub Pages
2. **Evaluate**: Handling evaluation requests and submitting results
3. **Revise**: Processing update requests and redeploying applications

## Features

- ✅ FastAPI with automatic OpenAPI documentation
- ✅ Pydantic models for request/response validation
- ✅ Secret-based authentication and verification
- ✅ LLM-powered application generation using OpenAI GPT-4
- ✅ Automated GitHub repository creation and management
- ✅ GitHub Pages deployment with automatic configuration
- ✅ Comprehensive error handling and retry logic
- ✅ Async/await for better performance
- ✅ Fallback application generation when LLM is unavailable

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.fastapi.example .env

# Edit .env with your configuration
```

### 3. Run the Application

```bash
# Development mode
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Main Endpoints

#### 1. Health Check
**GET** `/health`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

#### 2. App Generation
**POST** `/api`
```json
{
  "email": "student@example.com",
  "secret": "your-secret",
  "task": "captcha-solver-abc123",
  "round": 1,
  "nonce": "ab12-cd34-ef56",
  "brief": "Create a captcha solver that handles ?url=https://.../image.png",
  "checks": [
    "Repo has MIT license",
    "README.md is professional",
    "Page displays captcha URL passed at ?url=...",
    "Page displays solved captcha text within 15 seconds"
  ],
  "evaluation_url": "https://example.com/notify",
  "attachments": [
    {
      "name": "sample.png",
      "url": "data:image/png;base64,iVBORw..."
    }
  ]
}
```

#### 3. App Update (Round 2)
**POST** `/api/update`
```json
{
  "email": "student@example.com",
  "secret": "your-secret",
  "task": "captcha-solver-abc123",
  "round": 2,
  "nonce": "ab12-cd34-ef56",
  "brief": "Add support for SVG images and improve error handling",
  "checks": [
    "Page handles SVG images correctly",
    "Error messages are user-friendly"
  ],
  "evaluation_url": "https://example.com/notify"
}
```

#### 4. Evaluation Submission
**POST** `/evaluation`
```json
{
  "email": "student@example.com",
  "task": "captcha-solver-abc123",
  "round": 1,
  "nonce": "ab12-cd34-ef56",
  "repo_url": "https://github.com/user/repo",
  "commit_sha": "abc123def456",
  "pages_url": "https://user.github.io/repo/"
}
```

## Environment Variables

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Student Configuration
STUDENT_SECRET=your-secret-here
STUDENT_EMAIL=student@example.com

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# GitHub Configuration
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_USERNAME=your-github-username
GITHUB_ORG=your-github-org

# Database Configuration (optional)
DATABASE_URL=your-database-url
```

## Deployment Options

### 1. Railway
```bash
# Connect your GitHub repo to Railway
# Set environment variables in Railway dashboard
# Deploy automatically
```

### 2. Render
```bash
# Connect GitHub repo to Render
# Set environment variables
# Deploy automatically
```

### 3. Heroku
```bash
# Add Procfile
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile

# Deploy to Heroku
git add Procfile
git commit -m "Add Procfile for Heroku"
git push heroku main
```

### 4. Vercel
```bash
# Create vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "main.py"
    }
  ]
}
```

## Testing

### Using curl
```bash
# Health check
curl http://localhost:8000/health

# Generate app
curl -X POST http://localhost:8000/api \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "secret": "your-secret",
    "task": "test-task",
    "round": 1,
    "nonce": "test-nonce",
    "brief": "Create a simple calculator",
    "checks": ["App works"],
    "evaluation_url": "https://example.com/notify",
    "attachments": []
  }'
```

### Using Python requests
```python
import requests

# Health check
response = requests.get("http://localhost:8000/health")
print(response.json())

# Generate app
data = {
    "email": "test@example.com",
    "secret": "your-secret",
    "task": "test-task",
    "round": 1,
    "nonce": "test-nonce",
    "brief": "Create a simple calculator",
    "checks": ["App works"],
    "evaluation_url": "https://example.com/notify",
    "attachments": []
}
response = requests.post("http://localhost:8000/api", json=data)
print(response.json())
```

## Key Differences from Node.js Version

- **Async/Await**: Better performance with async operations
- **Pydantic Models**: Automatic request/response validation
- **OpenAPI Docs**: Automatic API documentation at `/docs`
- **Type Safety**: Full Python type hints
- **Better Error Handling**: HTTPException with proper status codes

## Security Features

- Secret-based authentication using HMAC comparison
- CORS middleware for cross-origin requests
- Trusted host middleware
- Input validation with Pydantic
- Rate limiting ready (can be added with slowapi)

## Monitoring and Logging

- Comprehensive logging with Python logging module
- Request/response logging
- Error tracking and reporting
- Performance monitoring capabilities

## License

MIT License - see LICENSE file for details.
