// Test script for Mistral API parameters
import * as mistralai from '@mistralai/mistralai';

// Initialize client with dummy key
const client = new mistralai.Mistral({
  apiKey: 'dummy-key'
});

// Try to inspect the method signature
try {
  // Get the complete method
  const chatPrototype = Object.getPrototypeOf(client.chat);
  const completeMethod = chatPrototype.complete;
  
  // Print out the method's toString to see the parameter names
  console.log('Complete method signature:', completeMethod.toString().substring(0, 1000));
  
  // Create a dummy request object to see what parameters it accepts
  const dummyRequest = {
    model: 'dummy-model',
    messages: [{ role: 'user', content: 'Hello' }]
  };
  
  // Inspect accepted parameters
  console.log('Inspecting parameters by adding them to request object:');
  
  // Try different versions of the parameter names
  const testParams = [
    'maxTokens', 'max_tokens', 
    'responseFormat', 'response_format'
  ];
  
  for (const param of testParams) {
    try {
      const testObj = { ...dummyRequest };
      testObj[param] = param === 'responseFormat' || param === 'response_format' 
        ? { type: 'json_object' } 
        : 100;
      
      console.log(`Testing parameter: ${param}`);
      
      // Don't actually make the API call, just check if the parameter is accepted
      // by the type system or if it throws a compilation error
      const methodSource = completeMethod.toString();
      if (methodSource.includes(param)) {
        console.log(`✅ Parameter '${param}' found in method source`);
      } else {
        console.log(`❌ Parameter '${param}' NOT found in method source`);
      }
    } catch (error) {
      console.log(`Error testing parameter ${param}:`, error.message);
    }
  }
  
} catch (error) {
  console.error('Error inspecting method:', error.message);
}