const express = require('express');
const router = express.Router();
const { validateEvaluationRequest } = require('../middleware/validation');
const { logEvaluationSubmission } = require('../services/evaluationService');

// Evaluation endpoint for receiving repo details
router.post('/', validateEvaluationRequest, async (req, res) => {
  try {
    console.log('Received evaluation submission:', {
      email: req.body.email,
      task: req.body.task,
      round: req.body.round,
      repo_url: req.body.repo_url,
      pages_url: req.body.pages_url
    });

    // Log the evaluation submission
    await logEvaluationSubmission(req.body);
    
    res.json({
      status: 'success',
      message: 'Evaluation submission received successfully',
      task: req.body.task,
      round: req.body.round,
      nonce: req.body.nonce
    });

  } catch (error) {
    console.error('Error processing evaluation submission:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process evaluation submission',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
