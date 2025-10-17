const Joi = require('joi');

// Validation schemas
const appRequestSchema = Joi.object({
  email: Joi.string().email().required(),
  secret: Joi.string().required(),
  task: Joi.string().required(),
  round: Joi.number().integer().min(1).max(2).required(),
  nonce: Joi.string().required(),
  brief: Joi.string().required(),
  checks: Joi.array().items(Joi.string()).required(),
  evaluation_url: Joi.string().uri().required(),
  attachments: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    url: Joi.string().required()
  })).optional().default([])
});

const evaluationRequestSchema = Joi.object({
  email: Joi.string().email().required(),
  task: Joi.string().required(),
  round: Joi.number().integer().min(1).max(2).required(),
  nonce: Joi.string().required(),
  repo_url: Joi.string().uri().required(),
  commit_sha: Joi.string().required(),
  pages_url: Joi.string().uri().required()
});

// Middleware for validating app requests
const validateRequest = (req, res, next) => {
  const { error, value } = appRequestSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request format',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.body = value;
  next();
};

// Middleware for validating evaluation requests
const validateEvaluationRequest = (req, res, next) => {
  const { error, value } = evaluationRequestSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid evaluation request format',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.body = value;
  next();
};

module.exports = {
  validateRequest,
  validateEvaluationRequest
};
