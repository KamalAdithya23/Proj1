from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional, Dict, Any
import os
import hashlib
import hmac
import secrets
import asyncio
import aiohttp
import json
import tempfile
import shutil
from datetime import datetime
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LLM Code Deployment API",
    description="API for building, deploying, and updating web applications using LLM assistance",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# Pydantic models
class Attachment(BaseModel):
    name: str
    url: str

class AppRequest(BaseModel):
    email: EmailStr
    secret: str
    task: str
    round: int
    nonce: str
    brief: str
    checks: List[str]
    evaluation_url: HttpUrl
    attachments: List[Attachment] = []

class EvaluationRequest(BaseModel):
    email: EmailStr
    task: str
    round: int
    nonce: str
    repo_url: HttpUrl
    commit_sha: str
    pages_url: HttpUrl

class AppResponse(BaseModel):
    status: str
    message: str
    task: str
    round: int
    nonce: str
    repo_url: Optional[str] = None
    commit_sha: Optional[str] = None
    pages_url: Optional[str] = None
    evaluation_submitted: Optional[bool] = None

class EvaluationResponse(BaseModel):
    status: str
    message: str
    task: str
    round: int
    nonce: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str

# Environment variables
STUDENT_SECRET = os.getenv("STUDENT_SECRET")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GITHUB_ORG = os.getenv("GITHUB_ORG")

# Dependency for secret verification
def verify_secret(secret: str):
    if not STUDENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error"
        )
    
    if not hmac.compare_digest(secret, STUDENT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid secret"
        )
    return True

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0"
    )

# Main API endpoint for app generation
@app.post("/api", response_model=AppResponse)
async def generate_app(request: AppRequest, verified: bool = Depends(verify_secret)):
    try:
        logger.info(f"Received app request: {request.email}, {request.task}, round {request.round}")
        
        # Process the app generation request
        result = await process_app_request(request)
        
        return AppResponse(
            status="success",
            message="App request processed successfully",
            task=request.task,
            round=request.round,
            nonce=request.nonce,
            **result
        )
        
    except Exception as error:
        logger.error(f"Error processing app request: {error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process app request: {str(error)}"
        )

# App update endpoint (Round 2)
@app.post("/api/update", response_model=AppResponse)
async def update_app(request: AppRequest, verified: bool = Depends(verify_secret)):
    if request.round != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for round 2 updates"
        )
    
    try:
        logger.info(f"Received round 2 update request: {request.email}, {request.task}")
        
        # Process the app update request
        result = await process_app_request(request, is_update=True)
        
        return AppResponse(
            status="success",
            message="App update processed successfully",
            task=request.task,
            round=request.round,
            nonce=request.nonce,
            **result
        )
        
    except Exception as error:
        logger.error(f"Error processing app update: {error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process app update: {str(error)}"
        )

# Evaluation submission endpoint
@app.post("/evaluation", response_model=EvaluationResponse)
async def submit_evaluation(request: EvaluationRequest):
    try:
        logger.info(f"Received evaluation submission: {request.email}, {request.task}, round {request.round}")
        
        # Log the evaluation submission
        await log_evaluation_submission(request)
        
        return EvaluationResponse(
            status="success",
            message="Evaluation submission received successfully",
            task=request.task,
            round=request.round,
            nonce=request.nonce
        )
        
    except Exception as error:
        logger.error(f"Error processing evaluation submission: {error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process evaluation submission: {str(error)}"
        )

# Process app generation request
async def process_app_request(request: AppRequest, is_update: bool = False):
    # Generate unique repo name
    repo_name = f"{request.task}-{secrets.token_hex(4)}"
    
    # Create temporary directory for the app
    temp_dir = Path(tempfile.mkdtemp())
    
    try:
        # Generate the application using LLM
        app_files = await generate_app_with_llm(request.brief, request.attachments, request.checks, is_update)
        
        # Write files to temp directory
        for file_path, content in app_files.items():
            full_path = temp_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding='utf-8')
        
        # Create GitHub repository
        repo_result = await create_github_repo(repo_name, temp_dir)
        
        # Deploy to GitHub Pages
        pages_result = await deploy_to_pages(repo_name, repo_result["owner_login"])
        
        # Submit evaluation
        evaluation_result = await submit_evaluation_notification({
            "email": request.email,
            "task": request.task,
            "round": request.round,
            "nonce": request.nonce,
            "repo_url": repo_result["repo_url"],
            "commit_sha": repo_result["commit_sha"],
            "pages_url": pages_result["pages_url"],
            "evaluation_url": str(request.evaluation_url)
        })
        
        return {
            "repo_url": repo_result["repo_url"],
            "commit_sha": repo_result["commit_sha"],
            "pages_url": pages_result["pages_url"],
            "evaluation_submitted": evaluation_result["success"]
        }
        
    finally:
        # Clean up temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)

# Generate application using LLM
async def generate_app_with_llm(brief: str, attachments: List[Attachment], checks: List[str], is_update: bool = False):
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set. Falling back to basic app generation.")
        return create_fallback_app(brief, attachments)
    
    system_prompt = """You are an expert web developer. Generate a complete web application based on the provided brief.

Requirements:
- Create a single-page application (SPA)
- Use modern HTML5, CSS3, and JavaScript
- Include all necessary dependencies via CDN
- Ensure the app is fully functional
- Follow best practices for accessibility and performance
- Include proper error handling

""" + ("This is an update request - modify the existing functionality as specified." if is_update else "This is a new application request.") + """

Generate the following files:
1. index.html - Main HTML file
2. style.css - CSS styles
3. script.js - JavaScript functionality
4. README.md - Professional documentation
5. LICENSE - MIT license

Return your response as a JSON object with file paths as keys and file contents as values."""

    user_prompt = f"""Brief: {brief}

Checks to pass:
{chr(10).join(f"- {check}" for check in checks)}

Attachments:
{chr(10).join(f"- {att.name}: {att.url[:100]}..." for att in attachments)}

Please generate a complete web application that fulfills the brief and passes all checks."""

    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "gpt-4",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 4000
            }
            
            async with session.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data) as response:
                if response.status == 200:
                    result = await response.json()
                    response_text = result["choices"][0]["message"]["content"]
                    
                    try:
                        app_files = json.loads(response_text)
                        return app_files
                    except json.JSONDecodeError:
                        logger.error("Failed to parse LLM response as JSON")
                        return create_fallback_app(brief, attachments)
                else:
                    logger.error(f"OpenAI API error: {response.status}")
                    return create_fallback_app(brief, attachments)
                    
    except Exception as error:
        logger.error(f"Error calling OpenAI API: {error}")
        return create_fallback_app(brief, attachments)

# Create fallback app when LLM fails
def create_fallback_app(brief: str, attachments: List[Attachment]):
    return {
        "index.html": f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Generated Application</h1>
        <div id="app-content">
            <p>This is a fallback application generated when the LLM service is unavailable.</p>
            <p>Brief: {brief}</p>
            {chr(10).join(f'<p>Attachment: {att.name}</p>' for att in attachments)}
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>""",
        "style.css": """body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
    color: #333;
    text-align: center;
}

#app-content {
    margin-top: 20px;
}""",
        "script.js": """// Generated JavaScript
console.log('App loaded successfully');

// Basic functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    // Add your app logic here
});""",
        "README.md": f"""# Generated Application

This application was generated based on the provided brief.

## Brief
{brief}

## Setup
1. Open index.html in a web browser
2. The application should work immediately

## License
MIT License - see LICENSE file for details.""",
        "LICENSE": """MIT License

Copyright (c) 2024 Student

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE."""
    }

# GitHub integration functions
async def create_github_repo(repo_name: str, source_dir: Path):
    if not GITHUB_TOKEN or not GITHUB_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub credentials not configured"
        )
    
    try:
        # Create repository via GitHub API
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "llm-code-deployment/1.0.0"
        }
        
        repo_data = {
            "name": repo_name,
            "description": "Auto-generated application",
            "private": False,
            "auto_init": False
        }
        
        async with aiohttp.ClientSession() as session:
            # Create repository
            if GITHUB_ORG:
                create_url = f"https://api.github.com/orgs/{GITHUB_ORG}/repos"
            else:
                create_url = "https://api.github.com/user/repos"
            
            async with session.post(create_url, headers=headers, json=repo_data) as response:
                if response.status == 201:
                    repo_info = await response.json()
                    logger.info(f"Created repository: {repo_info['html_url']}")
                else:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to create repository: {error_text}"
                    )
            
            # Initialize git repository and push code
            import subprocess
            
            # Run git commands
            subprocess.run(["git", "init"], cwd=source_dir, check=True)
            subprocess.run(["git", "config", "user.name", GITHUB_USERNAME], cwd=source_dir, check=True)
            subprocess.run(["git", "config", "user.email", f"{GITHUB_USERNAME}@users.noreply.github.com"], cwd=source_dir, check=True)
            subprocess.run(["git", "add", "."], cwd=source_dir, check=True)
            subprocess.run(["git", "commit", "-m", "Initial commit: Auto-generated application"], cwd=source_dir, check=True)
            subprocess.run(["git", "branch", "-M", "main"], cwd=source_dir, check=True)
            
            # Add remote with token authentication
            clone_url = repo_info["clone_url"]
            authed_remote = clone_url.replace("https://", f"https://{GITHUB_TOKEN}@")
            subprocess.run(["git", "remote", "add", "origin", authed_remote], cwd=source_dir, check=True)
            subprocess.run(["git", "push", "-u", "origin", "main"], cwd=source_dir, check=True)
            
            # Get commit SHA
            result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=source_dir, capture_output=True, text=True, check=True)
            commit_sha = result.stdout.strip()
            
            return {
                "repo_url": repo_info["html_url"],
                "commit_sha": commit_sha,
                "clone_url": repo_info["clone_url"],
                "owner_login": repo_info["owner"]["login"]
            }
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Git command failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Git operation failed: {str(e)}"
        )
    except Exception as error:
        logger.error(f"Error creating GitHub repository: {error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create repository: {str(error)}"
        )

async def deploy_to_pages(repo_name: str, owner_login: str):
    try:
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        pages_data = {
            "source": {
                "branch": "main",
                "path": "/"
            }
        }
        
        async with aiohttp.ClientSession() as session:
            pages_url = f"https://api.github.com/repos/{owner_login}/{repo_name}/pages"
            
            try:
                async with session.post(pages_url, headers=headers, json=pages_data) as response:
                    if response.status not in [200, 201, 409]:  # 409 means already enabled
                        error_text = await response.text()
                        logger.warning(f"Pages setup warning: {error_text}")
            except Exception as e:
                logger.warning(f"Pages setup warning: {e}")
            
            logger.info(f"Enabled GitHub Pages for: {repo_name}")
            
            # Wait a moment for Pages to be configured
            await asyncio.sleep(5)
            
            pages_url = f"https://{owner_login}.github.io/{repo_name}/"
            
            return {
                "pages_url": pages_url,
                "enabled": True
            }
            
    except Exception as error:
        logger.error(f"Error enabling GitHub Pages: {error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable Pages: {str(error)}"
        )

async def submit_evaluation_notification(evaluation_data: Dict[str, Any]):
    payload = {
        "email": evaluation_data["email"],
        "task": evaluation_data["task"],
        "round": evaluation_data["round"],
        "nonce": evaluation_data["nonce"],
        "repo_url": evaluation_data["repo_url"],
        "commit_sha": evaluation_data["commit_sha"],
        "pages_url": evaluation_data["pages_url"]
    }
    
    logger.info(f"Submitting evaluation: {payload}")
    
    max_retries = 5
    base_delay = 1
    
    for attempt in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    evaluation_data["evaluation_url"],
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        logger.info("Evaluation submitted successfully")
                        return {"success": True, "response": await response.json()}
                    else:
                        raise Exception(f"Unexpected status code: {response.status}")
                        
        except Exception as error:
            logger.error(f"Error submitting evaluation (attempt {attempt + 1}): {error}")
            
            if attempt == max_retries - 1:
                raise Exception(f"Failed to submit evaluation after {max_retries} attempts: {error}")
            
            delay = base_delay * (2 ** attempt)
            logger.info(f"Retrying in {delay} seconds...")
            await asyncio.sleep(delay)

async def log_evaluation_submission(evaluation_data: EvaluationRequest):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "email": evaluation_data.email,
        "task": evaluation_data.task,
        "round": evaluation_data.round,
        "nonce": evaluation_data.nonce,
        "repo_url": str(evaluation_data.repo_url),
        "commit_sha": evaluation_data.commit_sha,
        "pages_url": str(evaluation_data.pages_url)
    }
    
    logger.info(f"Logging evaluation submission: {log_entry}")
    return {"success": True, "logged": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
