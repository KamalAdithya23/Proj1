const request = require('supertest');
const app = require('../src/index');

describe('LLM Code Deployment API', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('API Endpoints', () => {
    const validRequest = {
      email: 'test@example.com',
      secret: 'test-secret',
      task: 'test-task-123',
      round: 1,
      nonce: 'test-nonce-123',
      brief: 'Create a simple test application',
      checks: ['App loads successfully', 'Has proper styling'],
      evaluation_url: 'https://example.com/evaluate',
      attachments: []
    };

    it('should reject requests without secret', async () => {
      const invalidRequest = { ...validRequest };
      delete invalidRequest.secret;
      
      await request(app)
        .post('/api/')
        .send(invalidRequest)
        .expect(400);
    });

    it('should reject requests with invalid secret', async () => {
      const invalidRequest = { ...validRequest, secret: 'wrong-secret' };
      
      await request(app)
        .post('/api/')
        .send(invalidRequest)
        .expect(401);
    });

    it('should reject requests with invalid JSON structure', async () => {
      const invalidRequest = {
        email: 'invalid-email',
        secret: 'test-secret'
      };
      
      await request(app)
        .post('/api/')
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('Evaluation Endpoint', () => {
    const validEvaluation = {
      email: 'test@example.com',
      task: 'test-task-123',
      round: 1,
      nonce: 'test-nonce-123',
      repo_url: 'https://github.com/user/repo',
      commit_sha: 'abc123def456',
      pages_url: 'https://user.github.io/repo/'
    };

    it('should accept valid evaluation submissions', async () => {
      await request(app)
        .post('/evaluation/')
        .send(validEvaluation)
        .expect(200);
    });

    it('should reject invalid evaluation submissions', async () => {
      const invalidEvaluation = { ...validEvaluation };
      delete invalidEvaluation.repo_url;
      
      await request(app)
        .post('/evaluation/')
        .send(invalidEvaluation)
        .expect(400);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app)
        .get('/unknown-route')
        .expect(404);
    });
  });
});
