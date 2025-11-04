#!/bin/bash
set -e

echo "🚀 Installing Universal Claude Router..."
echo ""

# Check Node.js version
REQUIRED_NODE_VERSION="18"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
  echo "❌ Error: Node.js version $REQUIRED_NODE_VERSION or higher is required"
  echo "   Current version: $(node -v)"
  exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "❌ Error: git is not installed"
  exit 1
fi

# Installation directory (can be overridden via UCR_INSTALL_DIR environment variable)
INSTALL_DIR="${UCR_INSTALL_DIR:-$HOME/.ucr}"
REPO_DIR="$INSTALL_DIR/repo"
REPO_URL="https://github.com/jamesthegreati/universal-claude-router.git"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Clone or update repository
if [ -d "$REPO_DIR" ]; then
  echo "📦 Updating existing installation..."
  cd "$REPO_DIR"
  git pull
else
  echo "📥 Cloning repository..."
  git clone "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build packages
echo ""
echo "🔨 Building packages..."
npm run build

# Link globally
echo ""
echo "🔗 Installing global commands..."
npm link

echo ""
echo "✅ Installation complete!"
echo ""
echo "Available commands:"
echo "  ucr --help"
echo "  ucr setup"
echo "  ucr start"
echo "  universal-claude-router --help"
echo ""
echo "Get started:"
echo "  ucr start"
echo ""
echo "To update in the future, run this script again."
