const axios = require('axios');

// Submit evaluation to the evaluation URL
async function submitEvaluation(evaluationData) {
  const { email, task, round, nonce, repo_url, commit_sha, pages_url, evaluation_url } = evaluationData;
  
  const payload = {
    email,
    task,
    round,
    nonce,
    repo_url,
    commit_sha,
    pages_url
  };
  
  console.log('Submitting evaluation:', payload);
  
  try {
    const response = await axios.post(evaluation_url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (response.status === 200) {
      console.log('Evaluation submitted successfully');
      return { success: true, response: response.data };
    } else {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error submitting evaluation:', error.message);
    
    // Implement retry logic with exponential backoff
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const delay = baseDelay * Math.pow(2, attempt - 1); // 1, 2, 4, 8, 16 seconds
      
      console.log(`Retrying evaluation submission (attempt ${attempt}/${maxRetries}) in ${delay}ms...`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const response = await axios.post(evaluation_url, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        if (response.status === 200) {
          console.log('Evaluation submitted successfully on retry');
          return { success: true, response: response.data };
        }
        
      } catch (retryError) {
        console.error(`Retry attempt ${attempt} failed:`, retryError.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to submit evaluation after ${maxRetries} attempts: ${retryError.message}`);
        }
      }
    }
  }
}

// Log evaluation submission locally
async function logEvaluationSubmission(evaluationData) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...evaluationData
  };
  
  console.log('Logging evaluation submission:', logEntry);
  
  // In a production system, you would save this to a database
  // For now, we'll just log it to the console
  return { success: true, logged: true };
}

module.exports = {
  submitEvaluation,
  logEvaluationSubmission
};
