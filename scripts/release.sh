#!/bin/bash

# Universal Claude Router - Release Script
# This script helps create a new release by bumping version and creating a tag

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Universal Claude Router - Release Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
  exit 1
fi

# Check if git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Git working directory is not clean.${NC}"
  echo -e "${YELLOW}Please commit or stash your changes before releasing.${NC}"
  git status --short
  exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Ask for version bump type
echo -e "${YELLOW}Select version bump type:${NC}"
echo "  1) patch  (bug fixes)"
echo "  2) minor  (new features)"
echo "  3) major  (breaking changes)"
echo "  4) custom (specify exact version)"
echo ""

read -p "Enter choice (1-4): " CHOICE

case $CHOICE in
  1)
    BUMP_TYPE="patch"
    ;;
  2)
    BUMP_TYPE="minor"
    ;;
  3)
    BUMP_TYPE="major"
    ;;
  4)
    read -p "Enter new version (e.g., 1.0.0): " CUSTOM_VERSION
    if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo -e "${RED}Error: Invalid version format. Use semver format (e.g., 1.0.0)${NC}"
      exit 1
    fi
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""

# Bump version
if [ -n "$CUSTOM_VERSION" ]; then
  echo -e "${YELLOW}Setting version to ${CUSTOM_VERSION}...${NC}"
  npm version "$CUSTOM_VERSION" --no-git-tag-version
  NEW_VERSION=$CUSTOM_VERSION
else
  echo -e "${YELLOW}Bumping version ($BUMP_TYPE)...${NC}"
  NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version | sed 's/v//')
fi

echo -e "${GREEN}✓ Version bumped to: ${NEW_VERSION}${NC}"
echo ""

# Commit version bump
echo -e "${YELLOW}Committing version bump...${NC}"
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}"
echo -e "${GREEN}✓ Changes committed${NC}"
echo ""

# Create tag
TAG_NAME="v${NEW_VERSION}"
echo -e "${YELLOW}Creating tag: ${TAG_NAME}${NC}"
git tag -a "$TAG_NAME" -m "Release version ${NEW_VERSION}"
echo -e "${GREEN}✓ Tag created${NC}"
echo ""

# Push changes and tag
echo -e "${YELLOW}Ready to push to remote repository.${NC}"
echo -e "${BLUE}This will trigger the GitHub Actions publish workflow.${NC}"
echo ""
read -p "Push changes and tag to trigger publish? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Release cancelled.${NC}"
  echo -e "${YELLOW}To undo the version bump and tag:${NC}"
  echo "  git tag -d $TAG_NAME"
  echo "  git reset --hard HEAD~1"
  exit 0
fi

echo ""
echo -e "${YELLOW}Pushing to remote...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"
git push origin "$TAG_NAME"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Release initiated!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Version ${NEW_VERSION} has been tagged and pushed.${NC}"
echo -e "${BLUE}Check GitHub Actions for publish status:${NC}"
echo -e "${GREEN}https://github.com/jamesthegreati/universal-claude-router/actions${NC}"
echo ""
echo -e "${BLUE}Once published, install with:${NC}"
echo -e "${GREEN}npm install -g @universal-claude-router/cli@${NEW_VERSION}${NC}"
echo ""
