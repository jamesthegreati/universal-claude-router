# UCR Setup and Authentication Guide

## Overview

This guide explains how to set up and authenticate the Universal Claude Router (UCR) with various AI
model providers.

## Quick Start

### 1. Initial Setup

Run the interactive setup wizard:

```bash
ucr setup
```

This will guide you through:

- **Server Configuration**: Set host, port, CORS, and rate limiting
- **Provider Selection**: Choose which providers to use
- **Router Configuration**: Configure default providers and task-based routing
- **API Keys**: Instructions for setting up each provider

### 2. Authenticate with Providers

After setup, authenticate with your chosen providers:

```bash
ucr auth login
```

Or specify a provider directly:

```bash
ucr auth login google
ucr auth login anthropic
```

### 3. Start the UCR Server

```bash
ucr start
```

Or use the background server:

```bash
ucr code
```

This will automatically start the server and launch Claude Code.

## Supported Providers

### Anthropic Claude (Recommended)

- **Base URL**: `https://api.anthropic.com`
- **Models**: claude-3.5-sonnet-20241022, claude-3.5-haiku-20241022, claude-3-opus-20240229
- **Get API Key**: https://console.anthropic.com/account/keys
- **Use Case**: Highest quality outputs, best for complex reasoning

### OpenAI

- **Base URL**: `https://api.openai.com/v1`
- **Models**: gpt-4-turbo, gpt-4o, gpt-4o-mini
- **Get API Key**: https://platform.openai.com/api-keys
- **Use Case**: Cost-effective, fast inference with GPT-4o

### Google Gemini

- **Base URL**: `https://generativelanguage.googleapis.com`
- **Models**: gemini-2.0-flash, gemini-2.0-flash-thinking-exp-1219, gemini-1.5-pro, gemini-1.5-flash
- **Get API Key**: https://aistudio.google.com/app/apikey
- **Use Case**: Fast reasoning models, good for code generation
- **Custom Models**: Supports any Gemini model in the v1beta API

### DeepSeek

- **Base URL**: `https://api.deepseek.com`
- **Models**: deepseek-chat, deepseek-coder
- **Get API Key**: https://platform.deepseek.com/api_keys
- **Use Case**: Reasoning-focused models, cost-effective

### OpenRouter

- **Base URL**: `https://openrouter.ai/api/v1`
- **Models**: 200+ models from various providers
- **Get API Key**: https://openrouter.ai/keys
- **Use Case**: Access to multiple providers through one API

### Groq

- **Base URL**: `https://api.groq.com`
- **Models**: mixtral-8x7b-32768, llama2-70b-4096
- **Get API Key**: https://console.groq.com/keys
- **Use Case**: Ultra-fast inference for streaming

### GitHub Copilot

- **Base URL**: `https://api.githubcopilot.com`
- **Auth Type**: OAuth (Device Code Flow)
- **Use Case**: Integrated with GitHub, no manual token needed

### Ollama (Local)

- **Base URL**: `http://localhost:11434`
- **Auth Type**: None
- **Models**: llama2, mistral, neural-chat, etc.
- **Use Case**: Run models locally, no API key required

## Configuration

### Configuration File (`ucr.config.json`)

```json
{
  "version": "1.0.0",
  "server": {
    "host": "localhost",
    "port": 3000,
    "cors": {
      "origin": "*",
      "credentials": true
    },
    "rateLimit": {
      "max": 100,
      "timeWindow": "1m"
    }
  },
  "logging": {
    "level": "info",
    "pretty": true
  },
  "providers": [
    {
      "id": "google",
      "name": "Google Gemini",
      "baseUrl": "https://generativelanguage.googleapis.com",
      "apiKey": "${GOOGLE_API_KEY}",
      "authType": "apiKey",
      "defaultModel": "gemini-2.0-flash",
      "enabled": true,
      "priority": 7,
      "models": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
    }
  ],
  "router": {
    "default": "google",
    "think": "google",
    "background": "google",
    "longContext": "anthropic"
  },
  "features": {
    "costTracking": true,
    "analytics": true,
    "healthChecks": true
  }
}
```

### Environment Variables

Set your API keys as environment variables:

```bash
export GOOGLE_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export DEEPSEEK_API_KEY="your-key-here"
export OPENROUTER_API_KEY="your-key-here"
export GROQ_API_KEY="your-key-here"
```

## Authentication Commands

### Login

```bash
ucr auth login [provider]
```

### Logout

```bash
ucr auth logout [provider]
```

### List authenticated providers

```bash
ucr auth list
```

### Refresh OAuth tokens

```bash
ucr auth refresh [provider]
```

## Using UCR with Claude Code

### 1. Set up UCR

```bash
ucr setup
```

### 2. Authenticate with providers

```bash
ucr auth login google
```

### 3. Launch Claude Code with UCR

```bash
ucr code
```

This will:

- Start the UCR server automatically
- Configure Claude Code to use UCR as the proxy
- Route all requests through your configured providers

### 4. Use Custom Models in Claude Code

When Claude Code connects to UCR, you can use any model from your configured providers:

```javascript
// In Claude Code, specify the model
const response = await claude.messages.create({
  model: 'gemini-2.0-flash',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

UCR will automatically:

- Route the request to Google Gemini
- Transform the request to the correct API format
- Transform the response back to Claude format
- Cache responses for cost optimization

## Troubleshooting

### "Invalid Google response: no candidates"

This error occurs when:

1. **Safety Filter Blocked**: Google blocked the content for safety reasons
2. **Invalid API Key**: The `GOOGLE_API_KEY` is incorrect or expired
3. **Wrong Model Name**: The model name is not supported by the API
4. **Rate Limited**: You've exceeded your API quota

**Solutions**:

- Check your API key in `ucr.config.json`
- Verify the model name in the provider configuration
- Try with a different provider
- Check your API quota at https://aistudio.google.com

### "Authentication failed"

1. Verify the API key is correct
2. Make sure the environment variable is set
3. Run `ucr auth list` to see authenticated providers
4. Re-authenticate: `ucr auth logout [provider] && ucr auth login [provider]`

### "Server failed to start"

1. Check if the port is already in use
2. Try a different port in setup
3. Check server logs: `ucr start --verbose`

## Advanced Configuration

### Custom Router

```json
{
  "router": {
    "customRouter": "./my-router.js"
  }
}
```

### Task-Based Routing

```json
{
  "router": {
    "default": "google",
    "think": "anthropic",
    "background": "openai",
    "longContext": "groq",
    "codeGeneration": "deepseek"
  }
}
```

### Provider Metadata

For Vertex AI support, add metadata:

```json
{
  "id": "google",
  "baseUrl": "https://us-central1-aiplatform.googleapis.com",
  "metadata": {
    "projectId": "my-project",
    "location": "us-central1"
  }
}
```

## Performance Tips

1. **Use Groq for streaming**: Fastest inference for real-time responses
2. **Use DeepSeek for reasoning**: Best cost-to-quality ratio for complex tasks
3. **Use Ollama locally**: No API latency for simple tasks
4. **Cache responses**: Enabled by default for non-streaming requests
5. **Set appropriate timeouts**: Adjust in provider config for slower models

## Security

- Never commit API keys to version control
- Use environment variables for sensitive data
- Store credentials in `~/.ucr/credentials.json` (encrypted)
- Restrict access to `ucr.config.json` (chmod 600)

## Support

For issues or questions:

1. Check the [CLI Reference](./cli-reference.md)
2. Review provider documentation
3. Check GitHub issues
4. Enable debug logging: `UCR_LOG_LEVEL=debug ucr start`
