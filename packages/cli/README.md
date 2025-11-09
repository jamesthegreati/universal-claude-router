# UCR CLI

Command-line interface for Universal Claude Router.

## Installation

```bash
npm install -g @ucr/cli
```

Or use directly from the monorepo:

```bash
cd packages/cli
npm install
npm run build
node dist/cli.js --help
```

## Commands

### Setup

Interactive setup wizard to create a configuration file:

```bash
ucr setup
```

This will guide you through:

- Server configuration (host, port, CORS, rate limiting)
- Provider selection
- Routing configuration
- Task-based routing setup

### Authentication

Manage authentication credentials for providers:

```bash
# Login to a provider
ucr auth login [provider]

# Login to GitHub Copilot (OAuth)
ucr auth login github-copilot

# Login with API key
ucr auth login anthropic

# List authenticated providers
ucr auth list

# Logout from a provider
ucr auth logout [provider]

# Refresh OAuth tokens
ucr auth refresh [provider]
```

### Providers

Manage provider configurations:

```bash
# List all providers
ucr providers list

# List providers from specific config
ucr providers list -c path/to/config.json

# Auto-discover local providers (Ollama, LM Studio)
ucr providers discover

# Enable a provider
ucr providers enable ollama

# Disable a provider
ucr providers disable openai

# Test provider connection
ucr providers test anthropic
```

### Models

Manage model configurations:

```bash
# List all models
ucr models list

# List models for a specific provider
ucr models list anthropic

# Set default model for a provider
ucr models set anthropic/claude-3-5-sonnet-20241022

# Show model details
ucr models info openai/gpt-4
```

### Configuration

Manage configuration files:

```bash
# Initialize new configuration
ucr config init

# Validate configuration
ucr config validate

# Validate specific file
ucr config validate path/to/config.json

# Show configuration
ucr config show

# Edit configuration in default editor
ucr config edit
```

## Examples

### Quick Start

```bash
# 1. Create configuration
ucr setup

# 2. Authenticate with providers
ucr auth login anthropic
ucr auth login github-copilot

# 3. Verify providers
ucr providers list

# 4. Test connections
ucr providers test anthropic

# 5. Start server
ucr start -c ucr.config.json
```

### Using with Environment Variables

Set API keys in environment:

```bash
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export GOOGLE_API_KEY="your-key"

ucr setup
```

### Auto-Discovery

Discover and add local providers:

```bash
# Make sure Ollama or LM Studio is running
ucr providers discover

# This will add discovered providers to your config
```

### Provider Management

```bash
# List all providers with status
ucr providers list

# Enable/disable providers
ucr providers enable ollama
ucr providers disable openai

# Test connections
ucr providers test ollama
ucr providers test anthropic
```

### OAuth Authentication

For providers like GitHub Copilot that use OAuth:

```bash
ucr auth login github-copilot

# This will:
# 1. Start device flow
# 2. Show you a code and URL
# 3. Open browser automatically (optional)
# 4. Wait for you to authenticate
# 5. Save credentials securely
```

## Configuration Files

UCR looks for configuration in these locations:

1. File specified with `-c` flag
2. `ucr.config.json` in current directory
3. `~/.ucr/config.json`

### Configuration Structure

```json
{
  "version": "1.0.0",
  "server": {
    "host": "localhost",
    "port": 3000
  },
  "providers": [
    {
      "id": "anthropic",
      "name": "Anthropic Claude",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "${ANTHROPIC_API_KEY}",
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

## Credentials Storage

Credentials are stored securely in:

- Location: `~/.ucr/credentials.json`
- Format: JSON with provider-specific auth data
- Permissions: User-only access

### Credential Types

- **API Key**: Simple API key authentication
- **Bearer Token**: OAuth bearer tokens
- **OAuth**: Full OAuth flow with access and refresh tokens

## Tips

### Using with Claude Code

```bash
# 1. Start UCR server
ucr start -c ucr.config.json

# 2. Configure Claude Code
export ANTHROPIC_API_URL="http://localhost:3000"

# 3. Run Claude Code
claude-code
```

### Custom Routers

Use custom routing logic:

```json
{
  "router": {
    "customRouter": "./examples/routers/cost-optimized.js"
  }
}
```

### Provider Discovery

UCR can automatically discover:

- **Ollama**: http://localhost:11434
- **LM Studio**: http://localhost:1234
- **LocalAI**: http://localhost:8080

Run `ucr providers discover` to find and add them.

### Debugging

Enable verbose logging:

```json
{
  "logging": {
    "level": "debug",
    "pretty": true
  }
}
```

## Supported Providers

UCR supports 13+ providers out of the box:

- Anthropic Claude
- OpenAI
- GitHub Copilot (OAuth)
- Google Gemini
- DeepSeek
- OpenRouter
- Groq
- Cohere
- Mistral AI
- Perplexity
- Together AI
- Replicate
- Ollama (local)

## Advanced Usage

### Task-Based Routing

Configure different providers for different tasks:

```json
{
  "router": {
    "default": "ollama",
    "think": "anthropic",
    "background": "openai",
    "longContext": "google",
    "webSearch": "perplexity",
    "image": "openai"
  }
}
```

### Provider Priority

Set priority for automatic failover:

```json
{
  "providers": [
    { "id": "primary", "priority": 10 },
    { "id": "backup", "priority": 5 },
    { "id": "fallback", "priority": 1 }
  ]
}
```

### Testing Providers

Test provider connectivity:

```bash
# Test single provider
ucr providers test anthropic

# Test all providers
for provider in $(ucr providers list | grep ✓ | awk '{print $2}'); do
  ucr providers test $provider
done
```

## Troubleshooting

### Authentication Issues

```bash
# List current credentials
ucr auth list

# Re-authenticate
ucr auth logout provider-name
ucr auth login provider-name
```

### Configuration Issues

```bash
# Validate config
ucr config validate

# Check for errors
ucr config show | jq .
```

### Connection Issues

```bash
# Test provider connectivity
ucr providers test provider-name

# Check if provider is enabled
ucr providers list
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
