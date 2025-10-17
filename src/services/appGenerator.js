const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const { createGitHubRepo, deployToPages } = require('./githubService');
const { submitEvaluation } = require('./evaluationService');

// Lazy OpenAI client factory to avoid requiring OPENAI_API_KEY at startup
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

// Process app generation request
async function processAppRequest(requestData, isUpdate = false) {
  const { email, task, round, nonce, brief, checks, evaluation_url, attachments } = requestData;
  
  try {
    // Generate unique repo name
    const repoName = `${task}-${uuidv4().substring(0, 8)}`;
    
    // Create temporary directory for the app
    const tempDir = path.join(__dirname, '../temp', repoName);
    await fs.ensureDir(tempDir);
    
    try {
      // Generate the application using LLM
      const appFiles = await generateAppWithLLM(brief, attachments, checks, isUpdate);
      
      // Write files to temp directory
      for (const [filePath, content] of Object.entries(appFiles)) {
        const fullPath = path.join(tempDir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content);
      }
      
      // Create GitHub repository
      const repoResult = await createGitHubRepo(repoName, tempDir);
      
      // Deploy to GitHub Pages
      const pagesResult = await deployToPages(repoName, repoResult.ownerLogin);
      
      // Submit evaluation
      const evaluationResult = await submitEvaluation({
        email,
        task,
        round,
        nonce,
        repo_url: repoResult.repoUrl,
        commit_sha: repoResult.commitSha,
        pages_url: pagesResult.pagesUrl,
        evaluation_url
      });
      
      return {
        repo_url: repoResult.repoUrl,
        commit_sha: repoResult.commitSha,
        pages_url: pagesResult.pagesUrl,
        evaluation_submitted: evaluationResult.success
      };
      
    } finally {
      // Clean up temp directory
      await fs.remove(tempDir);
    }
    
  } catch (error) {
    console.error('Error in processAppRequest:', error);
    throw error;
  }
}

// Generate application using LLM
async function generateAppWithLLM(brief, attachments, checks, isUpdate = false) {
  const openai = getOpenAIClient();
  if (!openai) {
    console.warn('OPENAI_API_KEY not set. Falling back to basic app generation.');
    return createFallbackApp(brief, attachments);
  }
  const systemPrompt = `You are an expert web developer. Generate a complete web application based on the provided brief.

Requirements:
- Create a single-page application (SPA)
- Use modern HTML5, CSS3, and JavaScript
- Include all necessary dependencies via CDN
- Ensure the app is fully functional
- Follow best practices for accessibility and performance
- Include proper error handling

${isUpdate ? 'This is an update request - modify the existing functionality as specified.' : 'This is a new application request.'}

Generate the following files:
1. index.html - Main HTML file
2. style.css - CSS styles
3. script.js - JavaScript functionality
4. README.md - Professional documentation
5. LICENSE - MIT license

Return your response as a JSON object with file paths as keys and file contents as values.`;

  const userPrompt = `Brief: ${brief}

Checks to pass:
${checks.map(check => `- ${check}`).join('\n')}

Attachments:
${attachments.map(att => `- ${att.name}: ${att.url.substring(0, 100)}...`).join('\n')}

Please generate a complete web application that fulfills the brief and passes all checks.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const response = completion.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const appFiles = JSON.parse(response);
      return appFiles;
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError);
      // Fallback: create a basic app structure
      return createFallbackApp(brief, attachments);
    }
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Fallback: create a basic app structure
    return createFallbackApp(brief, attachments);
  }
}

// Create fallback app when LLM fails
function createFallbackApp(brief, attachments) {
  return {
    'index.html': `<!DOCTYPE html>
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
            <p>Brief: ${brief}</p>
            ${attachments.map(att => `<p>Attachment: ${att.name}</p>`).join('')}
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
    'style.css': `body {
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
}`,
    'script.js': `// Generated JavaScript
console.log('App loaded successfully');

// Basic functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    // Add your app logic here
});`,
    'README.md': `# Generated Application

This application was generated based on the provided brief.

## Brief
${brief}

## Setup
1. Open index.html in a web browser
2. The application should work immediately

## License
MIT License - see LICENSE file for details.`,
    'LICENSE': `MIT License

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
SOFTWARE.`
  };
}

module.exports = {
  processAppRequest
};
