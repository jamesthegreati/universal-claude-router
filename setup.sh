#!/bin/bash

# Universal Claude Router - Enhanced Project Setup Script
# This script initializes the monorepo structure with improved error handling

set -e  # Exit on error

echo "🚀 Setting up Universal Claude Router..."

# Function to kill all UCR processes
kill_ucr_processes() {
    echo "🛑 Stopping all UCR processes..."
    pkill -f "ucr-server" 2>/dev/null || true
    pkill -f "ucr" 2>/dev/null || true
    pkill -f "node.*ucr" 2>/dev/null || true
    sleep 2
    echo "✓ All UCR processes stopped"
}

# Function to force clean installation
force_clean() {
    echo "🧹 Force cleaning installation..."
    kill_ucr_processes
    
    # Remove node_modules
    rm -rf node_modules
    rm -rf packages/*/node_modules
    
    # Remove build artifacts
    rm -rf dist
    rm -rf packages/*/dist
    rm -rf .turbo
    
    # Remove lock files
    rm -f package-lock.json
    rm -f packages/*/package-lock.json
    
    echo "✓ Clean complete"
}

# Check if force clean is requested
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    echo "⚠️  Force mode enabled"
    force_clean
fi

# Trap errors and offer to force clean
trap 'echo ""; echo "❌ Setup failed!"; echo ""; echo "Try running with --force flag to clean and retry:"; echo "  ./setup.sh --force"; exit 1' ERR

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

echo "✓ Directory structure created"

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
    "clean": "turbo run clean && rm -rf node_modules",
    "setup:force": "./setup.sh --force"
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
