# 🚀 Universal Claude Router

A powerful tool that enables Claude Code to work with **any LLM provider** by combining the best features from claude-code-router and opencode.

## ✨ Features

- **🔀 Smart Routing** - Route requests based on task type
- **🌐 75+ Provider Support** - Works with Anthropic, OpenAI, Google, DeepSeek, Ollama, and more
- **🔄 API Transformers** - Automatically adapt requests/responses
- **🎨 Web UI** - Beautiful interface for managing providers
- **💻 CLI Tool** - Powerful command-line interface
- **🔐 Secure Auth** - OAuth support for major providers
- **📊 Cost Tracking** - Monitor usage and costs
- **⚡ Hot Reload** - Configuration changes apply instantly

## 🚧 Status

This project is currently under active development.

## 📦 Project Structure

```
universal-claude-router/
├── packages/
│   ├── shared/     # Shared types and utilities
│   ├── core/       # Core proxy and routing logic
│   ├── cli/        # CLI tool
│   └── ui/         # Web UI
├── config/         # Configuration templates
└── docs/           # Documentation
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📄 License

MIT License

## 🙏 Acknowledgments

Built upon the excellent work of:
- [claude-code-router](https://github.com/musistudio/claude-code-router)
- [opencode](https://github.com/sst/opencode)
- [claude-code](https://github.com/anthropics/claude-code)
