exports.handler = async (event, context) => {
  const logs = [];
  
  try {
    logs.push('Function started');
    
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    logs.push(`API Key exists: ${!!apiKey}`);
    logs.push(`API Key length: ${apiKey ? apiKey.length : 0}`);
    
    if (!apiKey) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          error: 'No API key found in environment',
          logs 
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        logs,
        apiKeyPreview: apiKey.substring(0, 8) + '...'
      })
    };
    
  } catch (error) {
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        error: error.message,
        logs 
      })
    };
  }
};
