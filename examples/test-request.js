#!/usr/bin/env node

/**
 * Simple script to test the UCR proxy server
 * Usage: node examples/test-request.js
 */

const http = require('http');

const request = {
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'Hello! Please respond with a brief greeting and tell me what you are.',
    },
  ],
  max_tokens: 100,
};

const data = JSON.stringify(request);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('Sending test request to UCR proxy...\n');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}\n`);

  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      console.log('Response:');
      console.log(JSON.stringify(response, null, 2));

      if (response.content && response.content[0]) {
        console.log('\nAssistant:', response.content[0].text);
      }

      if (response.usage) {
        console.log('\nUsage:');
        console.log(`  Input tokens: ${response.usage.input_tokens}`);
        console.log(`  Output tokens: ${response.usage.output_tokens}`);
      }
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  console.log('\nMake sure the UCR server is running:');
  console.log('  node packages/core/dist/bin/server.js ucr.config.json');
});

req.write(data);
req.end();
