#!/bin/bash

# Universal Claude Router - Quick Start Script
# This script helps you get UCR up and running quickly

set -e

echo "🚀 Universal Claude Router - Quick Start"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. You have: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Build the project
echo "🔨 Building project..."
npm run build
echo "✅ Build complete"
echo ""

# Check if config exists
if [ ! -f "ucr.config.json" ]; then
    echo "📝 Creating configuration file..."
    
    # Ask which example to use
    echo "Which configuration would you like to use?"
    echo "1) Basic (single provider - Anthropic)"
    echo "2) Multi-provider (Anthropic, OpenAI, Ollama)"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            cp config/examples/basic.json ucr.config.json
            echo "✅ Created ucr.config.json from basic example"
            ;;
        2)
            cp config/examples/multi-provider.json ucr.config.json
            echo "✅ Created ucr.config.json from multi-provider example"
            ;;
        *)
            echo "Invalid choice. Using basic configuration."
            cp config/examples/basic.json ucr.config.json
            ;;
    esac
    echo ""
else
    echo "✅ Configuration file already exists"
    echo ""
fi

# Check for API keys
echo "🔑 Checking API keys..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY is not set"
    echo ""
    echo "To set it, run:"
    echo "  export ANTHROPIC_API_KEY='your-api-key-here'"
    echo ""
    echo "Or add it to a .env file"
    echo ""
else
    echo "✅ ANTHROPIC_API_KEY is set"
    echo ""
fi

# Summary
echo "📋 Setup Summary"
echo "=================="
echo "✅ Dependencies installed"
echo "✅ Project built"
echo "✅ Configuration file created"
echo ""

# Next steps
echo "🎯 Next Steps"
echo "=============="
echo ""
echo "1. Make sure you have set your API key(s):"
echo "   export ANTHROPIC_API_KEY='your-key-here'"
echo ""
echo "2. Start the server:"
echo "   node packages/core/dist/bin/server.js ucr.config.json"
echo ""
echo "3. In another terminal, test the server:"
echo "   node examples/test-request.js"
echo ""
echo "4. To use with Claude Code:"
echo "   export ANTHROPIC_API_URL='http://localhost:3000'"
echo "   claude-code"
echo ""
echo "📚 For more information, see:"
echo "   - README.md"
echo "   - docs/getting-started.md"
echo "   - examples/README.md"
echo ""
echo "✨ Happy routing!"
