#!/bin/bash

# Universal Claude Router - Project Setup Script
# This script initializes the monorepo structure

echo "🚀 Setting up Universal Claude Router..."

# Create directory structure
mkdir -p packages/{shared,core,cli,ui}/{src,test}
mkdir -p packages/shared/src/{types,utils}
mkdir -p packages/core/src/{proxy,router,transformer,provider,auth,config,utils}
mkdir -p packages/core/src/transformer/transformers
mkdir -p packages/core/src/auth/providers
mkdir -p packages/cli/src/{commands,interactive}
mkdir -p packages/ui/src/{components,pages,api,hooks,lib}
mkdir -p packages/ui/src/components/ui
mkdir -p config/{providers,examples}
mkdir -p docs/providers
mkdir -p .github/workflows
mkdir -p scripts

echo "✅ Directory structure created"

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "universal-claude-router",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "prettier": "^3.2.5",
    "turbo": "^1.12.4",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "eslint": "^8.56.0"
  }
}
EOF

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
EOF

# Create base tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", ".turbo"]
}
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
.turbo/
.next/
out/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
logs/
*.log.*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/
.nyc_output/

# Misc
*.tsbuildinfo
.cache/
EOF

# Create .prettierrc
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
EOF

# Create package.json for shared package
cat > packages/shared/package.json << 'EOF'
{
  "name": "@ucr/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vitest": "^1.2.2"
  }
}
EOF

# Create tsconfig for shared package
cat > packages/shared/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF

# Create placeholder index files
echo "export * from './types';" > packages/shared/src/index.ts
echo "// Types will be implemented here" > packages/shared/src/types/index.ts
echo "// Utilities will be implemented here" > packages/shared/src/utils/index.ts

# Create README
cat > README.md << 'EOF'
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
EOF

# Create LICENSE
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 Universal Claude Router Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

echo "✅ Project structure initialized!"
echo ""
echo "Next steps:"
echo "1. cd universal-claude-router"
echo "2. git add ."
echo "3. git commit -m 'Initial project structure'"
echo "4. git push origin main"
echo ""
echo "Then the GitHub Coding Agent can build the full implementation!"