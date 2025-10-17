# LLM Code Deployment System

A comprehensive application that can build, deploy, and update web applications using LLM assistance and GitHub Pages deployment.

## Overview

This system implements a complete workflow for:
1. **Build**: Receiving app briefs, generating applications with LLM assistance, and deploying to GitHub Pages
2. **Evaluate**: Handling evaluation requests and submitting results
3. **Revise**: Processing update requests and redeploying applications

## Features

- ✅ RESTful API endpoints for app generation and updates
- ✅ Secret-based authentication and verification
- ✅ LLM-powered application generation using OpenAI GPT-4
- ✅ Automated GitHub repository creation and management
- ✅ GitHub Pages deployment with automatic configuration
- ✅ Comprehensive error handling and retry logic
- ✅ Rate limiting and security middleware
- ✅ Request validation and sanitization
- ✅ Fallback application generation when LLM is unavailable

## Project Structure

```
src/
├── index.js                 # Main application entry point
├── routes/
│   ├── api.js              # Main API endpoints for app generation
│   └── evaluation.js       # Evaluation submission endpoints
├── middleware/
│   ├── auth.js             # Secret verification middleware
│   └── validation.js       # Request validation schemas
├── services/
│   ├── appGenerator.js     # LLM-powered app generation
│   ├── githubService.js    # GitHub API integration
│   └── evaluationService.js # Evaluation submission handling
└── utils/
    └── index.js            # Utility functions and helpers
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- GitHub Personal Access Token
- OpenAI API Key

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd llm-code-deployment

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env
```

### 3. Environment Configuration

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Student Configuration
STUDENT_SECRET=your-secret-here
STUDENT_EMAIL=student@example.com

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# GitHub Configuration
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_USERNAME=your-github-username

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. GitHub Setup

1. Create a GitHub Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with the following permissions:
     - `repo` (Full control of private repositories)
     - `public_repo` (Access public repositories)
     - `pages` (Deploy to GitHub Pages)

2. Set your GitHub username in the environment variables

### 5. OpenAI Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add the API key to your `.env` file

## Usage

### Starting the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

### API Endpoints

#### 1. Main App Generation Endpoint

**POST** `/api/`

Accepts app generation requests with the following JSON structure:

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

**Response:**
```json
{
  "status": "success",
  "message": "App request processed successfully",
  "task": "captcha-solver-abc123",
  "round": 1,
  "nonce": "ab12-cd34-ef56",
  "repo_url": "https://github.com/user/repo",
  "commit_sha": "abc123def456",
  "pages_url": "https://user.github.io/repo/",
  "evaluation_submitted": true
}
```

#### 2. App Update Endpoint (Round 2)

**POST** `/api/update`

Accepts update requests for existing applications:

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

#### 3. Evaluation Submission Endpoint

**POST** `/evaluation/`

Accepts evaluation submissions from the system:

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

#### 4. Health Check Endpoint

**GET** `/health`

Returns server status and version information.

## Workflow

### Build Phase

1. **Request Reception**: API receives POST request with app brief
2. **Secret Verification**: Validates the provided secret against configured value
3. **Request Validation**: Validates JSON structure and required fields
4. **LLM Generation**: Uses OpenAI GPT-4 to generate application code
5. **Repository Creation**: Creates new GitHub repository with unique name
6. **Code Deployment**: Pushes generated code to repository
7. **Pages Setup**: Enables GitHub Pages deployment
8. **Evaluation Submission**: Notifies evaluation system with repo details

### Evaluate Phase

1. **Submission Reception**: Receives evaluation submissions via `/evaluation/` endpoint
2. **Data Logging**: Logs submission details for tracking
3. **Confirmation**: Returns success response to submitter

### Revise Phase

1. **Update Request**: Receives round 2 update request
2. **Secret Verification**: Validates secret again
3. **Code Modification**: Uses LLM to modify existing application
4. **Repository Update**: Updates existing repository with new code
5. **Redeployment**: GitHub Pages automatically updates
6. **Evaluation Notification**: Submits updated repo details

## Error Handling

The system includes comprehensive error handling:

- **Secret Verification**: Constant-time comparison to prevent timing attacks
- **Request Validation**: Joi schema validation for all inputs
- **LLM Fallback**: Generates basic app structure if LLM service fails
- **Retry Logic**: Exponential backoff for evaluation submissions
- **Rate Limiting**: Prevents abuse with configurable limits
- **Security Headers**: Helmet.js for security best practices

## Security Features

- Secret-based authentication
- Request rate limiting
- Input validation and sanitization
- Security headers via Helmet.js
- CORS configuration
- Error message sanitization in production

## Monitoring and Logging

- Comprehensive logging at all levels (info, warn, error, debug)
- Request/response logging
- Error tracking and reporting
- Performance monitoring capabilities

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure all required environment variables
3. Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start src/index.js --name "llm-deployment"
pm2 save
pm2 startup
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **GitHub API Errors**: Verify your GitHub token has correct permissions
2. **OpenAI API Errors**: Check your API key and account limits
3. **Repository Creation Fails**: Ensure GitHub username is correct
4. **Pages Not Deploying**: Wait a few minutes for GitHub Pages to activate

### Debug Mode

Set `NODE_ENV=development` to enable debug logging and detailed error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Ensure all environment variables are properly configured
4. Verify API keys and tokens are valid and have correct permissions
