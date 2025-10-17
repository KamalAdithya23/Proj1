# Sample API Test Script

# Test the health endpoint
echo "Testing health endpoint..."
curl -X GET http://localhost:3000/health

echo -e "\n\nTesting main API endpoint with sample request..."

# Sample request for app generation
curl -X POST http://localhost:3000/api/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "secret": "your-secret-here",
    "task": "test-app-123",
    "round": 1,
    "nonce": "test-nonce-123",
    "brief": "Create a simple calculator app that can add, subtract, multiply, and divide two numbers",
    "checks": [
      "App has input fields for two numbers",
      "App has buttons for all four operations",
      "App displays the result correctly",
      "App has proper styling"
    ],
    "evaluation_url": "https://example.com/evaluate",
    "attachments": []
  }'

echo -e "\n\nTesting evaluation endpoint..."

# Sample evaluation submission
curl -X POST http://localhost:3000/evaluation/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "task": "test-app-123",
    "round": 1,
    "nonce": "test-nonce-123",
    "repo_url": "https://github.com/user/test-app-123",
    "commit_sha": "abc123def456",
    "pages_url": "https://user.github.io/test-app-123/"
  }'
