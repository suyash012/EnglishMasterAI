// Non-ESM module for testing Mistral API
const mistralai = require('@mistralai/mistralai');
console.log('Mistral API client loaded');

// Creating a simple mock API client for testing parameters
function mockRequest(apiKey, endpoint, parameters) {
  console.log(`Mock API request to ${endpoint}`);
  console.log('Parameters:', JSON.stringify(parameters, null, 2));
  return { success: true };
}

// Override the actual request method with our mock
const originalMistral = mistralai.Mistral;
mistralai.Mistral = function(options) {
  const client = new originalMistral(options);
  
  // Override the request method to log parameters
  client._createRequest = mockRequest;
  
  return client;
};

const client = new mistralai.Mistral({ apiKey: 'dummy-key' });

// Try to make a chat completion request
try {
  // Add different parameter formats to see which ones are accepted
  const result = client.chat.complete({
    model: 'mistral-large-latest',
    messages: [{ role: 'user', content: 'Hello' }],
    temperature: 0.7,
    max_tokens: 100,
    response_format: { type: 'json_object' }
  });
  
  console.log('Request made successfully');
} catch (e) {
  console.error('Error making request:', e.message);
}