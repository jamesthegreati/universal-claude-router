# CLI Reference

Complete reference for Universal Claude Router command-line interface.

## Installation

```bash
# Install globally (future)
npm install -g @ucr/cli

# Or use from monorepo
cd packages/cli
npm install && npm run build
node dist/cli.js --help
```

## Global Options

```bash
-V, --version    Output the version number
-h, --help       Display help for command
```

## Commands

### `ucr setup`

Interactive setup wizard to create a new configuration file.

**Usage:**

```bash
ucr setup
```

**Interactive Prompts:**

- Server host (default: localhost)
- Server port (default: 3000)
- CORS enabled (default: yes)
- Rate limiting enabled (default: yes)
- Provider selection (multi-select)
- Default provider
- Task-based routing (optional)

**Output:** Creates `ucr.config.json` with your configuration.

**Example Session:**

```
🚀 Universal Claude Router Setup

? Server host: localhost
? Server port: 3000
? Enable CORS? Yes
? Enable rate limiting? Yes
? Select providers:
  ✔ Anthropic Claude
  ✔ OpenAI
  ✔ Ollama
? Default provider: anthropic
? Enable task-based routing? Yes
...

✓ Setup complete!

📋 Next Steps:
1. Set API keys in environment variables
2. Start the server: ucr start -c ucr.config.json
3. Configure Claude Code
4. Test the connection
```

---

### `ucr auth`

Manage authentication credentials for providers.

#### `ucr auth login [provider]`

Authenticate with a provider.

**Usage:**

```bash
ucr auth login [provider]
```

**Arguments:**

- `provider` (optional): Provider ID (e.g., `anthropic`, `github-copilot`)

**Behavior:**

- If provider is specified, authenticates directly
- If not specified, shows interactive provider selection
- For OAuth providers (GitHub Copilot), starts device flow
- For API key providers, prompts for key

**Examples:**

```bash
# Interactive selection
ucr auth login

# Direct authentication
ucr auth login anthropic

# OAuth flow (GitHub Copilot)
ucr auth login github-copilot
```

**OAuth Flow:**

```
◇ UCR Authentication
│
◇ Starting GitHub authentication...
│
│ To authenticate:
│ 1. Visit: https://github.com/login/device
│ 2. Enter code: XXXX-XXXX
│
◆ Open browser automatically? Yes
│
◇ Waiting for authentication...
│
◇ Authentication complete
│
└ ✓ Authentication successful!
```

#### `ucr auth logout [provider]`

Remove credentials for a provider.

**Usage:**

```bash
ucr auth logout [provider]
```

**Examples:**

```bash
# Interactive selection
ucr auth logout

# Direct logout
ucr auth logout github-copilot
```

#### `ucr auth list`

List all authenticated providers.

**Usage:**

```bash
ucr auth list
```

**Output:**

```
Authenticated Providers:
  ✓ anthropic (apiKey)
  ✓ github-copilot (oauth)
  ✓ openai (bearerToken)
```

#### `ucr auth refresh [provider]`

Refresh OAuth tokens for a provider.

**Usage:**

```bash
ucr auth refresh [provider]
```

**Note:** Only works for OAuth providers with refresh tokens.

---

### `ucr providers`

Manage provider configurations.

#### `ucr providers list`

List all configured providers.

**Usage:**

```bash
ucr providers list [options]
```

**Options:**

- `-c, --config <path>`: Config file path (default: `ucr.config.json`)

**Output:**

```
Configured Providers:
  ✓ anthropic - Anthropic Claude [priority: 10]
    https://api.anthropic.com
    Default model: claude-3-5-sonnet-20241022
  ✗ openai - OpenAI [priority: 9]
    https://api.openai.com
    Default model: gpt-4
  ✓ ollama - Ollama [priority: 1]
    http://localhost:11434
    Default model: llama2
```

#### `ucr providers discover`

Auto-discover local providers (Ollama, LM Studio, LocalAI).

**Usage:**

```bash
ucr providers discover [options]
```

**Options:**

- `-c, --config <path>`: Config file path (default: `ucr.config.json`)

**Behavior:**

- Scans common local ports (11434, 1234, 8080)
- Detects Ollama, LM Studio, LocalAI
- Prompts to add discovered providers to config

**Output:**

```
◇ Provider Discovery
│
◇ Scanning for local providers...
│
└ Found 2 provider(s)

Discovered providers:
  ✓ Ollama at http://localhost:11434
  ✓ LM Studio at http://localhost:1234

◆ Add discovered providers to config? Yes
│
└ ✓ Providers added to config
```

#### `ucr providers enable <id>`

Enable a provider.

**Usage:**

```bash
ucr providers enable <id> [options]
```

**Arguments:**

- `id`: Provider ID

**Options:**

- `-c, --config <path>`: Config file path

**Example:**

```bash
ucr providers enable ollama
✓ Enabled provider: ollama
```

#### `ucr providers disable <id>`

Disable a provider.

**Usage:**

```bash
ucr providers disable <id> [options]
```

**Example:**

```bash
ucr providers disable openai
✓ Disabled provider: openai
```

#### `ucr providers test <id>`

Test provider connection and health.

**Usage:**

```bash
ucr providers test <id> [options]
```

**Output:**

```
◇ Testing provider: anthropic
│
◇ Testing connection...
│
│  ✓ Provider is reachable
│  Latency: 145ms
│
└ ✓ Test passed
```

---

### `ucr models`

Manage model configurations.

#### `ucr models list [provider]`

List available models.

**Usage:**

```bash
ucr models list [provider] [options]
```

**Arguments:**

- `provider` (optional): Filter by provider ID

**Options:**

- `-c, --config <path>`: Config file path

**Examples:**

```bash
# List all models
ucr models list

# List models for specific provider
ucr models list anthropic
```

**Output:**

```
Anthropic (anthropic):
  Default: claude-3-5-sonnet-20241022
  Available models:
    - claude-3-5-sonnet-20241022
    - claude-3-opus-20240229
    - claude-3-haiku-20240307

OpenAI (openai):
  Default: gpt-4
  Available models:
    - gpt-4
    - gpt-4-turbo
    - gpt-3.5-turbo
```

#### `ucr models set <provider/model>`

Set default model for a provider.

**Usage:**

```bash
ucr models set <provider/model> [options]
```

**Arguments:**

- `provider/model`: Provider ID and model ID separated by `/`

**Example:**

```bash
ucr models set anthropic/claude-3-opus-20240229
✓ Set default model for anthropic: claude-3-opus-20240229
```

#### `ucr models info <provider/model>`

Show detailed model information.

**Usage:**

```bash
ucr models info <provider/model> [options]
```

**Example:**

```bash
ucr models info anthropic/claude-3-5-sonnet-20241022
```

**Output:**

```
Model: anthropic/claude-3-5-sonnet-20241022
Provider: Anthropic Claude

Details:
  Name: Claude 3.5 Sonnet
  Context Window: 200,000 tokens
  Max Output: 4,096 tokens
  Input Cost: $0.003/1K tokens
  Output Cost: $0.015/1K tokens
  Streaming: ✓
  Vision: ✓
  Function Calling: ✓

Description: Most intelligent model with best-in-class performance
Tags: reasoning, coding, analysis
```

---

### `ucr config`

Manage configuration files.

#### `ucr config init`

Initialize a new configuration file with wizard.

**Usage:**

```bash
ucr config init [options]
```

**Options:**

- `-o, --output <path>`: Output path (default: `ucr.config.json`)

**Behavior:** Similar to `ucr setup` but with more control over output location.

#### `ucr config validate [path]`

Validate configuration file.

**Usage:**

```bash
ucr config validate [path]
```

**Arguments:**

- `path` (optional): Config file path (default: `ucr.config.json`)

**Output Success:**

```
✓ Configuration is valid

Configuration Summary:
  Providers: 3
  Default router: anthropic
  Server port: 3000
```

**Output Error:**

```
✗ Configuration is invalid: Expected string, got number at providers[0].apiKey
```

#### `ucr config show [path]`

Display current configuration.

**Usage:**

```bash
ucr config show [path]
```

**Output:** Displays the raw JSON configuration file.

#### `ucr config edit [path]`

Open configuration in editor.

**Usage:**

```bash
ucr config edit [path]
```

**Behavior:**

- Opens config file in `$EDITOR` (default: vi)
- Waits for editor to close
- Use for manual config editing

---

## Configuration File

### Structure

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
    "pretty": true,
    "file": "./ucr.log"
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
      "priority": 10,
      "timeout": 30000,
      "maxRetries": 3
    }
  ],
  "router": {
    "default": "anthropic",
    "think": "anthropic",
    "background": "openai",
    "longContext": "google",
    "webSearch": "perplexity",
    "image": "openai",
    "tokenThreshold": 100000,
    "customRouter": "./routers/custom.js"
  },
  "features": {
    "costTracking": true,
    "analytics": true,
    "healthChecks": true,
    "autoDiscovery": false
  },
  "auth": {
    "storePath": "~/.ucr/credentials.json",
    "encryption": false
  }
}
```

### Environment Variables

Use `${VAR_NAME}` syntax in config for environment variable interpolation:

```json
{
  "providers": [
    {
      "apiKey": "${ANTHROPIC_API_KEY}"
    }
  ]
}
```

---

## Examples

### Complete Setup Flow

```bash
# 1. Create configuration
ucr setup

# 2. Authenticate providers
ucr auth login anthropic
ucr auth login github-copilot
ucr auth login openai

# 3. Verify setup
ucr auth list
ucr providers list

# 4. Test connections
ucr providers test anthropic
ucr providers test github-copilot

# 5. Discover local providers
ucr providers discover

# 6. Start server
ucr start -c ucr.config.json
```

### Managing Multiple Configs

```bash
# Development config
ucr setup -o ucr.dev.json
ucr start -c ucr.dev.json

# Production config
ucr setup -o ucr.prod.json
ucr start -c ucr.prod.json

# Testing
ucr config validate ucr.prod.json
ucr providers list -c ucr.prod.json
```

### Automation Scripts

```bash
#!/bin/bash
# setup-ucr.sh

# Create config
ucr config init -o ucr.config.json

# Enable providers
ucr providers enable anthropic
ucr providers enable ollama

# Set default models
ucr models set anthropic/claude-3-5-sonnet-20241022
ucr models set ollama/llama2

# Test connections
ucr providers test anthropic
ucr providers test ollama

echo "UCR setup complete!"
```

---

## Environment Variables

### Config-Related

- `UCR_CONFIG`: Default config file path
- `UCR_HOST`: Default server host
- `UCR_PORT`: Default server port

### Provider API Keys

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `GITHUB_COPILOT_TOKEN` (set via CLI)

### Editor

- `EDITOR`: Editor for `ucr config edit` (default: vi)

---

## Exit Codes

- `0`: Success
- `1`: Error (config invalid, authentication failed, etc.)

---

## Credential Storage

Credentials are stored in `~/.ucr/credentials.json`:

```json
{
  "anthropic": {
    "provider": "anthropic",
    "type": "apiKey",
    "apiKey": "sk-ant-..."
  },
  "github-copilot": {
    "provider": "github-copilot",
    "type": "oauth",
    "accessToken": "ghu_...",
    "refreshToken": "ghr_...",
    "expiresAt": 1234567890000
  }
}
```

**Security:**

- File permissions: 0600 (user-only)
- Location: User home directory
- Never committed to git

---

## Tips & Tricks

### Aliases

```bash
alias ucr-start='ucr start -c ucr.config.json'
alias ucr-dev='ucr start -c ucr.dev.json'
alias ucr-test='ucr providers test'
```

### Shell Completion

```bash
# Generate completion (future feature)
ucr completion bash > /etc/bash_completion.d/ucr
ucr completion zsh > ~/.zsh/completions/_ucr
```

### JSON Processing

```bash
# Extract provider IDs
ucr config show | jq -r '.providers[].id'

# Count enabled providers
ucr config show | jq '[.providers[] | select(.enabled != false)] | length'

# List models by provider
ucr config show | jq '.providers[] | {id: .id, model: .defaultModel}'
```

---

## Troubleshooting

### Command Not Found

```bash
# Use full path
node packages/cli/dist/cli.js --help

# Or create alias
alias ucr='node /path/to/packages/cli/dist/cli.js'
```

### Permission Denied

```bash
chmod +x packages/cli/dist/cli.js
```

### Config Not Found

```bash
# Specify config explicitly
ucr providers list -c /path/to/config.json

# Or set environment variable
export UCR_CONFIG=/path/to/config.json
ucr providers list
```

### Authentication Issues

```bash
# Clear and re-authenticate
ucr auth logout provider-name
ucr auth login provider-name

# Check credentials
cat ~/.ucr/credentials.json | jq .
```

---

## See Also

- [Getting Started Guide](getting-started.md)
- [GitHub Copilot Provider](providers/github-copilot.md)
- [Configuration Reference](configuration.md)
- [API Documentation](api.md)
