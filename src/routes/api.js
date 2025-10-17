const express = require('express');
const router = express.Router();
const { validateRequest } = require('../middleware/validation');
const { verifySecret } = require('../middleware/auth');
const { processAppRequest } = require('../services/appGenerator');
const { submitEvaluation } = require('../services/evaluationService');

// Main API endpoint for receiving app briefs
router.post('/', verifySecret, validateRequest, async (req, res) => {
  try {
    console.log('Received app request:', {
      email: req.body.email,
      task: req.body.task,
      round: req.body.round,
      nonce: req.body.nonce
    });

    // Process the app generation request
    const result = await processAppRequest(req.body);
    
    res.json({
      status: 'success',
      message: 'App request processed successfully',
      task: req.body.task,
      round: req.body.round,
      nonce: req.body.nonce,
      ...result
    });

  } catch (error) {
    console.error('Error processing app request:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process app request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Endpoint for handling round 2 updates
router.post('/update', verifySecret, validateRequest, async (req, res) => {
  try {
    if (req.body.round !== 2) {
      return res.status(400).json({
        status: 'error',
        message: 'This endpoint is only for round 2 updates'
      });
    }

    console.log('Received round 2 update request:', {
      email: req.body.email,
      task: req.body.task,
      round: req.body.round,
      nonce: req.body.nonce
    });

    // Process the app update request
    const result = await processAppRequest(req.body, true);
    
    res.json({
      status: 'success',
      message: 'App update processed successfully',
      task: req.body.task,
      round: req.body.round,
      nonce: req.body.nonce,
      ...result
    });

  } catch (error) {
    console.error('Error processing app update:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process app update',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
