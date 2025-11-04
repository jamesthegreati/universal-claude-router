# Getting Started with Universal Claude Router

This guide will help you set up and run Universal Claude Router (UCR) with Claude Code.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- An API key from at least one supported provider (Anthropic, OpenAI, etc.)
- Claude Code installed (optional, for integration testing)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/jamesthegreati/universal-claude-router.git
cd universal-claude-router
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

This will build both the `@ucr/shared` and `@ucr/core` packages.

## Configuration

### Basic Configuration

Create a configuration file named `ucr.config.json` in your project root:

```json
{
  "version": "1.0.0",
  "server": {
    "host": "localhost",
    "port": 3000
  },
  "logging": {
    "level": "info",
    "pretty": true
  },
  "providers": [
    {
      "id": "anthropic",
      "name": "Anthropic Claude",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "${ANTHROPIC_API_KEY}",
      "authType": "apiKey",
      "defaultModel": "claude-3-5-sonnet-20241022",
      "enabled": true,
      "priority": 10
    }
  ],
  "router": {
    "default": "anthropic"
  }
}
```

### Using Example Configurations

UCR comes with pre-configured examples:

```bash
# Use basic configuration
cp config/examples/basic.json ucr.config.json

# Or use multi-provider configuration
cp config/examples/multi-provider.json ucr.config.json
```

### Set Environment Variables

Set your API keys as environment variables:

```bash
# For Anthropic
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# For OpenAI (if using multi-provider)
export OPENAI_API_KEY="your-openai-api-key"

# Or create a .env file
echo "ANTHROPIC_API_KEY=your-key-here" > .env
```

## Running the Server

### Start the Server

```bash
node packages/core/dist/bin/server.js ucr.config.json
```

Or with a custom config path:

```bash
node packages/core/dist/bin/server.js /path/to/your/config.json
```

You should see output like:

```
{"level":30,"time":1699564800000,"type":"startup","message":"Starting Universal Claude Router..."}
{"level":30,"time":1699564800000,"type":"config_loaded","configPath":"/path/to/ucr.config.json","providers":1}
{"level":30,"time":1699564800000,"type":"hot_reload_enabled"}
{"level":30,"time":1699564800000,"type":"server_started","host":"localhost","port":3000,"message":"UCR server listening on http://localhost:3000"}
```

### Test the Server

Check the health endpoint:

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

List available providers:

```bash
curl http://localhost:3000/v1/providers
```

## Integration with Claude Code

### Configure Claude Code

Point Claude Code to use your UCR proxy:

```bash
# Set the API base URL to your UCR server
export ANTHROPIC_API_URL="http://localhost:3000"

# Use a dummy API key (UCR handles the real one)
export ANTHROPIC_API_KEY="dummy-key"
```

### Run Claude Code

```bash
claude-code
```

Claude Code will now route all requests through UCR, which will:
1. Detect the task type
2. Select the appropriate provider
3. Transform the request format
4. Forward to the provider
5. Transform the response back to Claude format
6. Return to Claude Code

## Testing the Setup

### Send a Test Request

You can test the proxy directly with curl:

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {
        "role": "user",
        "content": "Hello! Please respond with a brief greeting."
      }
    ],
    "max_tokens": 100
  }'
```

### Check Logs

UCR logs all requests and responses. Watch the server logs to see:
- Request received
- Task type detection
- Provider selection
- Request/response transformation
- Completion status

## Multi-Provider Setup

To set up multiple providers:

1. Copy the multi-provider example:
```bash
cp config/examples/multi-provider.json ucr.config.json
```

2. Set all required API keys:
```bash
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"
```

3. Start the server as before

4. UCR will now route requests based on task type:
   - Default tasks → Anthropic
   - Think tasks → Anthropic
   - Background tasks → Ollama (local)
   - Web search → OpenAI
   - Image tasks → OpenAI
   - Long context → Anthropic

## Using Ollama (Local Models)

### Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve
```

### Pull a Model

```bash
ollama pull llama2
```

### Configure UCR

The Ollama provider template is already included. Just ensure the service is running on `localhost:11434`.

### Test Local Model

UCR will automatically route background tasks to Ollama if configured in the router settings.

## Hot Reload

UCR supports hot-reloading of configuration. While the server is running:

1. Edit `ucr.config.json`
2. Save the file
3. UCR will automatically reload the configuration
4. Changes take effect immediately (no restart needed)

Watch the logs for:
```
{"level":30,"type":"config_reloaded","message":"Configuration reloaded"}
```

## Next Steps

- [Configuration Reference](configuration.md) - Learn about all configuration options
- [Provider Guides](providers/) - Set up specific providers
- [Custom Routing](custom-routers.md) - Write custom routing logic
- [API Reference](api.md) - Use the UCR API directly

## Troubleshooting

### Server won't start

- Check that the port (default 3000) is not already in use
- Verify your config file is valid JSON
- Check that all required environment variables are set

### Requests fail

- Verify provider API keys are correct
- Check provider base URLs
- Look at server logs for error details
- Test provider API directly to isolate issues

### Connection refused

- Ensure UCR server is running
- Check firewall settings
- Verify host and port configuration

### Rate limiting

- Configure rate limits in `server.rateLimit`
- Check provider rate limits
- Implement retry logic with backoff

## Getting Help

- Check [Troubleshooting Guide](troubleshooting.md)
- Search [GitHub Issues](https://github.com/jamesthegreati/universal-claude-router/issues)
- Ask in [Discussions](https://github.com/jamesthegreati/universal-claude-router/discussions)
