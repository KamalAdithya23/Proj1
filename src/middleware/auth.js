const crypto = require('crypto');

// Secret verification middleware
const verifySecret = (req, res, next) => {
  const providedSecret = req.body.secret;
  const expectedSecret = process.env.STUDENT_SECRET;
  
  if (!expectedSecret) {
    console.error('STUDENT_SECRET not configured');
    return res.status(500).json({
      status: 'error',
      message: 'Server configuration error'
    });
  }
  
  // Use constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(
    Buffer.from(providedSecret, 'utf8'),
    Buffer.from(expectedSecret, 'utf8')
  )) {
    console.warn('Invalid secret provided:', {
      email: req.body.email,
      task: req.body.task,
      ip: req.ip
    });
    
    return res.status(401).json({
      status: 'error',
      message: 'Invalid secret'
    });
  }
  
  next();
};

module.exports = {
  verifySecret
};
