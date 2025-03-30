// Simple test script to check Mistral API imports and initialization
import * as mistralai from '@mistralai/mistralai';

console.log('Mistral API exports:', Object.keys(mistralai));

// Try to initialize a client
try {
  const dummyKey = 'dummy-key';
  const client = new mistralai.Mistral({ apiKey: dummyKey });
  console.log('Client initialized successfully');

  // Inspect completions API structure
  const chatMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client.chat));
  console.log('Chat API methods:', chatMethods);

  // Check if complete method exists
  const completeMethod = chatMethods.find(m => m === 'createCompletions' || m === 'complete' || m === 'completions');
  console.log('Completion method found:', completeMethod);

  // Check the structure of the client object more thoroughly
  const props = [];
  let obj = client;
  do {
    props.push(...Object.getOwnPropertyNames(obj));
    obj = Object.getPrototypeOf(obj);
  } while (obj !== Object.prototype);
  
  console.log('All properties of client:', props);
} catch (error) {
  console.error('Client initialization failed:', error.message);
}