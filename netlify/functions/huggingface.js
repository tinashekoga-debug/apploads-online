const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { model, inputs, parameters } = JSON.parse(event.body);
    
    const API_KEY = process.env.HUGGINGFACE_API_KEY;
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Convert old format to new Chat Completion format
    const messages = [
      {
        role: "user",
        content: inputs
      }
    ];

    // Use the NEW router endpoint with Chat Completion API
    const response = await fetch(
      `https://router.huggingface.co/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `${model}:hf-inference`, // Add :hf-inference suffix for free tier
          messages: messages,
          max_tokens: parameters.max_new_tokens || 1024,
          temperature: parameters.temperature || 0.7,
          stream: false
        })
      }
    );

    const responseText = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Response was not JSON:', responseText);
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Invalid response from HuggingFace',
          response: responseText.substring(0, 200),
          status: response.status
        })
      };
    }

    // Convert Chat Completion response to old format for compatibility
    if (data.choices && data.choices[0]?.message?.content) {
      const convertedData = [{
        generated_text: data.choices[0].message.content
      }];
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(convertedData)
      };
    }

    // Return raw response if conversion fails
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message
      })
    };
  }
};