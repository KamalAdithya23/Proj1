const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'llm-code-deployment/1.0.0',
  request: { headers: { 'X-GitHub-Api-Version': '2022-11-28' } }
});

// Create GitHub repository and push code
async function createGitHubRepo(repoName, sourceDir) {
  try {
    const username = process.env.GITHUB_USERNAME;
    
    // Create repository (user or org)
    const org = process.env.GITHUB_ORG;
    let repo;
    try {
      if (org) {
        repo = await octokit.rest.repos.createInOrg({
          org,
          name: repoName,
          description: 'Auto-generated application',
          private: false,
          auto_init: false
        });
      } else {
        repo = await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          description: 'Auto-generated application',
          private: false,
          auto_init: false
        });
      }
    } catch (createErr) {
      const status = createErr?.status;
      const docs = 'https://docs.github.com/rest/repos/repos#create-a-repository-for-the-authenticated-user';
      const hint = 'Check that your token allows repo creation for the target owner (user/org) and includes repo/public_repo and pages permissions (or fine-grained equivalents).';
      throw new Error(`Failed to create repository (status ${status ?? 'unknown'}). ${hint} Docs: ${docs}`);
    }
    
    console.log(`Created repository: ${repo.data.html_url}`);
    
    // Initialize git repository
    const git = simpleGit(sourceDir);
    await git.init();
    await git.addConfig('user.name', username);
    await git.addConfig('user.email', process.env.STUDENT_EMAIL || `${username}@users.noreply.github.com`);

    // Add all files and commit
    await git.add('.');
    await git.commit('Initial commit: Auto-generated application');

    // Ensure main branch
    await git.branch(['-M', 'main']);

    // Authenticate remote using token (avoid logging the URL with token)
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is not set. Please configure it in your environment.');
    }
    // Use clone_url from API and inject token for push
    const cloneUrl = repo.data.clone_url; // e.g., https://github.com/owner/repo.git
    const authedRemote = cloneUrl.replace('https://', `https://${token}@`);
    await git.addRemote('origin', authedRemote);
    await git.push('origin', 'main');
    
    // Get the latest commit SHA
    const log = await git.log();
    const commitSha = log.latest.hash;
    
    return {
      repoUrl: repo.data.html_url,
      commitSha: commitSha,
      cloneUrl: repo.data.clone_url,
      ownerLogin: repo.data.owner?.login || username
    };
    
  } catch (error) {
    console.error('Error creating GitHub repository:', error);
    throw error;
  }
}

// Enable GitHub Pages and configure deployment
async function deployToPages(repoName, ownerLoginParam) {
  try {
    const username = process.env.GITHUB_USERNAME;
    const ownerLogin = ownerLoginParam || username;
    
    // Enable GitHub Pages (API v3 request)
    try {
      await octokit.request('POST /repos/{owner}/{repo}/pages', {
        owner: ownerLogin,
        repo: repoName,
        source: { branch: 'main', path: '/' }
      });
    } catch (pagesErr) {
      if (pagesErr?.status !== 409) {
        throw pagesErr;
      }
    }
    
    console.log(`Enabled GitHub Pages for: ${repoName}`);
    
    // Wait a moment for Pages to be configured
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pagesUrl = `https://${ownerLogin}.github.io/${repoName}/`;
    
    return {
      pagesUrl: pagesUrl,
      enabled: true
    };
    
  } catch (error) {
    console.error('Error enabling GitHub Pages:', error);
    throw error;
  }
}

// Update existing repository
async function updateRepository(repoName, sourceDir) {
  try {
    const git = simpleGit(sourceDir);
    
    // Add all changes
    await git.add('.');
    await git.commit('Update: Modified application');
    
    // Push changes
    await git.push('origin', 'main');
    
    // Get the latest commit SHA
    const log = await git.log();
    const commitSha = log.latest.hash;
    
    return {
      commitSha: commitSha,
      updated: true
    };
    
  } catch (error) {
    console.error('Error updating repository:', error);
    throw error;
  }
}

module.exports = {
  createGitHubRepo,
  deployToPages,
  updateRepository
};
