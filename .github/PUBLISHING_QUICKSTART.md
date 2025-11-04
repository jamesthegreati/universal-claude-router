# Quick Start: Publishing to NPM

## Prerequisites (One-time Setup)

1. **Create an npm access token**:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token

2. **Add token to GitHub**:
   - Go to https://github.com/jamesthegreati/universal-claude-router/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

## Publishing a New Version

### Method 1: Using the Release Script (Recommended)

```bash
# 1. Make sure all your changes are committed
git status

# 2. Run the release script
npm run release

# 3. Follow the prompts:
#    - Choose version bump type (patch/minor/major)
#    - Confirm the release
#
# The script will:
#    - Bump version in package.json
#    - Create a git tag
#    - Push to GitHub
#    - Trigger automated publish via GitHub Actions
```

### Method 2: Manual Tag Creation

```bash
# 1. Update version manually
npm version patch  # or minor/major

# 2. Push with tags
git push origin main --follow-tags

# This triggers the GitHub Actions workflow automatically
```

### Method 3: Manual Publish (Emergency Only)

```bash
npm login
npm run publish:npm
```

## What Happens After You Push a Tag?

1. GitHub Actions workflow starts automatically
2. Runs tests and builds
3. Publishes to npm with provenance
4. Package becomes available: `npm install -g @universal-claude-router/cli`

## Monitoring the Publish

Watch the workflow at: https://github.com/jamesthegreati/universal-claude-router/actions

## Verifying the Published Package

```bash
# Check it's available
npm view @universal-claude-router/cli

# Install and test
npm install -g @universal-claude-router/cli
ucr --version
```

## Version Numbering Guide

- **Patch** (0.1.x): Bug fixes, minor tweaks
- **Minor** (0.x.0): New features, no breaking changes
- **Major** (x.0.0): Breaking changes

## Troubleshooting

### "NPM_TOKEN not found"

- Verify the secret is set in GitHub repository settings
- Check the secret name is exactly `NPM_TOKEN`

### "Permission denied on npm"

- Ensure your npm account has publish permissions
- You may need to be added as a maintainer on npm

### "Workflow didn't trigger"

- Ensure tag format is `v*.*.*` (e.g., `v0.1.0`)
- Check GitHub Actions are enabled for the repo

## Need Help?

See the full documentation in [PUBLISHING.md](../PUBLISHING.md)
