# UCR Examples

This directory contains example scripts and configurations for Universal Claude Router.

## Quick Start Example

### 1. Set up the server

```bash
# Copy example config
cp config/examples/basic.json ucr.config.json

# Set your API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Build the project
npm run build

# Start the server
node packages/core/dist/bin/server.js ucr.config.json
```

The server should start on `http://localhost:3000`.

### 2. Test the server

In a new terminal:

```bash
# Test with the example script
node examples/test-request.js
```

You should see a response from the Claude model routed through UCR.

### 3. Check server health

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": 1699564800000
}
```

### 4. List providers

```bash
curl http://localhost:3000/v1/providers
```

Response:

```json
{
  "providers": [
    {
      "id": "anthropic",
      "name": "Anthropic Claude",
      "enabled": true,
      "models": []
    }
  ]
}
```

## Using with Claude Code

Point Claude Code to use your UCR proxy:

```bash
# Set the API base URL
export ANTHROPIC_API_URL="http://localhost:3000"

# Use a dummy API key (UCR handles the real one)
export ANTHROPIC_API_KEY="dummy-key"

# Run Claude Code
claude-code
```

Now all Claude Code requests will be routed through UCR, allowing you to:

- Use different providers based on task type
- Switch between models dynamically
- Track usage and costs
- Apply custom routing logic

## Multi-Provider Setup

For a more advanced setup with multiple providers:

```bash
# Use the multi-provider example
cp config/examples/multi-provider.json ucr.config.json

# Set API keys for all providers
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"

# Start the server
node packages/core/dist/bin/server.js ucr.config.json
```

With this setup:

- Default tasks → Anthropic
- Think tasks → Anthropic
- Background tasks → Ollama (local)
- Web search → OpenAI
- Image tasks → OpenAI
- Long context → Anthropic

## Using Ollama (Local Models)

### Install and start Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Or on Linux
curl https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve
```

### Pull a model

```bash
ollama pull llama2
```

### Configure UCR

Edit `ucr.config.json` to include the Ollama provider:

```json
{
  "providers": [
    {
      "id": "ollama",
      "name": "Ollama Local",
      "baseUrl": "http://localhost:11434",
      "authType": "none",
      "defaultModel": "llama2",
      "enabled": true
    }
  ],
  "router": {
    "default": "ollama"
  }
}
```

Now UCR will route requests to your local Ollama instance!

## Custom Routing

You can write custom routing logic in JavaScript. Create a file `custom-router.js`:

```javascript
// custom-router.js
export default function customRouter(request, context) {
  const { providers, taskType, tokenCount } = context;

  // Route long requests to a specific provider
  if (tokenCount > 50000) {
    return 'anthropic';
  }

  // Route based on time of day
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    // Use local model at night to save costs
    return 'ollama';
  }

  // Default routing
  return 'anthropic';
}
```

Then reference it in your config:

```json
{
  "router": {
    "customRouter": "./custom-router.js"
  }
}
```

## Testing Different Providers

Create a simple test script:

```javascript
// test-providers.js
const providers = ['anthropic', 'openai', 'ollama'];

for (const provider of providers) {
  const request = {
    model: 'test',
    messages: [{ role: 'user', content: 'Say hello!' }],
    max_tokens: 50,
  };

  // Make request to /v1/messages
  // Check response
}
```

## Troubleshooting

### Server won't start

- Check that port 3000 is available
- Verify your config file is valid JSON
- Make sure environment variables are set

### Requests fail

- Check server logs for errors
- Verify API keys are correct
- Test the provider API directly

### Ollama not working

- Make sure Ollama is running: `ollama serve`
- Check Ollama is on port 11434
- Verify you have a model pulled: `ollama list`

## More Examples

See the `/config/examples/` directory for more configuration examples:

- `basic.json` - Single provider setup
- `multi-provider.json` - Multiple providers with task routing

## Documentation

For more information, see:

- [Getting Started Guide](../docs/getting-started.md)
- [Configuration Reference](../docs/configuration.md)
- [Main README](../README.md)
