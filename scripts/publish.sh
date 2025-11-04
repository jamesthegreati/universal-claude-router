#!/bin/bash

# Universal Claude Router - NPM Publish Script
# This script builds and publishes the package to npm registry

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Universal Claude Router - Publish Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
  exit 1
fi

# Check if user is logged into npm
echo -e "${YELLOW}Checking npm authentication...${NC}"
if ! npm whoami > /dev/null 2>&1; then
  echo -e "${RED}Error: You are not logged into npm.${NC}"
  echo -e "${YELLOW}Please run: npm login${NC}"
  exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✓ Logged in as: ${NPM_USER}${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
npm run clean || true
echo -e "${GREEN}✓ Clean completed${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build the project
echo -e "${YELLOW}Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm run test || {
  echo -e "${YELLOW}Warning: Tests failed or not available. Continuing...${NC}"
}
echo ""

# Create a dry-run package to verify contents
echo -e "${YELLOW}Creating test package (dry-run)...${NC}"
npm pack --dry-run
echo ""

# Ask for confirmation
echo -e "${YELLOW}This will publish version ${CURRENT_VERSION} to npm registry.${NC}"
read -p "Do you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Publish cancelled.${NC}"
  exit 0
fi

# Publish to npm
echo ""
echo -e "${YELLOW}Publishing to npm...${NC}"
npm publish

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Successfully published!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}You can now install globally with:${NC}"
echo -e "${GREEN}npm install -g @universal-claude-router/cli${NC}"
echo ""
echo -e "${BLUE}Or install locally with:${NC}"
echo -e "${GREEN}npm install @universal-claude-router/cli${NC}"
echo ""
