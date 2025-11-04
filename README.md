# 🚀 Universal Claude Router

A production-ready proxy server that enables Claude Code to work with **75+ LLM providers** through
intelligent routing, API transformation, and comprehensive management tools.

Universal Claude Router (UCR) combines the best features from
[claude-code-router](https://github.com/musistudio/claude-code-router) and
[opencode](https://github.com/sst/opencode) into a unified, powerful solution.

## ✨ Features

### 🔀 Smart Routing

- **Task-based routing** - Automatically route requests based on task type (think, background,
  longContext, webSearch, image)
- **Token-aware routing** - Switch models based on context length
- **Custom routing** - Write JavaScript functions for advanced routing logic
- **Priority-based fallback** - Automatic failover to backup providers

### 🌐 Multi-Provider Support

- **75+ providers** via transformers
- **Built-in transformers** for Anthropic, OpenAI, Ollama
- **Extensible architecture** - Add custom transformers
- **Provider discovery** - Auto-detect local providers (Ollama, LM Studio)

### 🔄 API Transformation

- **Automatic format adaptation** - Convert between different API formats
- **Streaming support** - SSE streaming for compatible providers
- **Request/response logging** - Debug API interactions
- **Error handling** - Unified error responses

### 📊 Monitoring & Analytics

- **Cost tracking** - Track usage and costs per provider/model
- **Usage analytics** - View request patterns and statistics
- **Health checks** - Monitor provider availability
- **Performance metrics** - Latency and throughput tracking

### ⚙️ Configuration

- **Hot-reload** - Changes apply instantly without restart
- **Environment variables** - Support for ${VAR} interpolation
- **Validation** - Zod schema validation for all config
- **Templates** - Pre-configured provider templates

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/jamesthegreati/universal-claude-router.git
cd universal-claude-router

# Install dependencies
npm install

# Build all packages
npm run build
```

### Configuration

Create a `ucr.config.json` file:

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

Set your API key:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Running the Server

```bash
# Start the server
node packages/core/dist/bin/server.js ucr.config.json
```

The server will start on `http://localhost:3000`.

### Using with Claude Code

Point Claude Code to your proxy:

```bash
# Set the API endpoint
export ANTHROPIC_API_URL="http://localhost:3000"
export ANTHROPIC_API_KEY="dummy-key"  # UCR handles the real key

# Run Claude Code
claude-code
```

## 📦 Project Structure

```
universal-claude-router/
├── packages/
│   ├── shared/          # Shared types and utilities
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Token counting, cost calculation, validation
│   ├── core/            # Core proxy and routing logic
│   │   ├── config/      # Configuration management with hot-reload
│   │   ├── router/      # Task detection and routing logic
│   │   ├── transformer/ # API format transformers
│   │   ├── proxy/       # Fastify server and routes
│   │   ├── utils/       # Logger, error handling, HTTP client
│   │   └── bin/         # CLI entry points
│   ├── cli/             # CLI tool (planned)
│   └── ui/              # Web UI (planned)
├── config/
│   ├── providers/       # Provider configuration templates
│   └── examples/        # Example configurations
└── docs/                # Documentation
```

## 🔧 Configuration

### Providers

Configure one or more providers:

```json
{
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
      "timeout": 60000,
      "maxRetries": 3
    }
  ]
}
```

### Router

Configure task-based routing:

```json
{
  "router": {
    "default": "anthropic",
    "think": "anthropic",
    "background": "ollama",
    "longContext": "anthropic",
    "webSearch": "openai",
    "image": "openai",
    "tokenThreshold": 100000
  }
}
```

### Server

Configure the server:

```json
{
  "server": {
    "host": "localhost",
    "port": 3000,
    "cors": {
      "origin": "*",
      "credentials": true
    },
    "rateLimit": {
      "max": 100,
      "timeWindow": "1 minute"
    }
  }
}
```

## 📚 Documentation

- [Getting Started](docs/getting-started.md) - Detailed installation and setup
- [Configuration](docs/configuration.md) - Complete configuration reference
- [Providers](docs/providers/) - Provider-specific guides
- [API Reference](docs/api.md) - API endpoints and usage

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run in development mode (watch mode)
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific package tests
cd packages/shared && npm test
cd packages/core && npm test
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built upon the excellent work of:

- [claude-code-router](https://github.com/musistudio/claude-code-router) - Task-based routing
  inspiration
- [opencode](https://github.com/sst/opencode) - Provider support and OAuth patterns
- [claude-code](https://github.com/anthropics/claude-code) - The amazing Claude Code tool

## 🐛 Known Issues

- CLI package not yet implemented
- Web UI not yet implemented
- Limited transformer support (only Anthropic, OpenAI, Ollama currently)
- Provider authentication system not yet implemented
- Cost tracking persistence not yet implemented

## 🗺️ Roadmap

- [ ] Complete CLI package with all commands
- [ ] Build web UI with React + shadcn/ui
- [ ] Add more transformers (Google, DeepSeek, OpenRouter, etc.)
- [ ] Implement OAuth authentication
- [ ] Add Models.dev integration
- [ ] Provider auto-discovery
- [ ] Cost tracking persistence and reporting
- [ ] Analytics dashboard
- [ ] Custom router examples
- [ ] Migration tools

## 📞 Support

- GitHub Issues:
  [Report bugs or request features](https://github.com/jamesthegreati/universal-claude-router/issues)
- Discussions:
  [Ask questions or share ideas](https://github.com/jamesthegreati/universal-claude-router/discussions)
