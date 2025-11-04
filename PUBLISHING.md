# Publishing Guide

This document explains how to publish the Universal Claude Router package to npm.

## Prerequisites

1. **npm Account**: You need an npm account with publishing permissions.
2. **GitHub Secrets**: The `NPM_TOKEN` secret must be configured in the GitHub repository.

## Setting up NPM_TOKEN

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to your account settings → Access Tokens
3. Generate a new token with "Automation" type (for CI/CD publishing)
4. Copy the token
5. Go to your GitHub repository → Settings → Secrets and variables → Actions
6. Create a new repository secret named `NPM_TOKEN` and paste the token

## Publishing Methods

### Method 1: Automated Publishing with GitHub Actions (Recommended)

The repository uses GitHub Actions to automatically publish to npm when a version tag is pushed.

**Steps:**

1. **Update the version** in `package.json`:

   ```bash
   npm version patch  # For bug fixes (0.1.0 -> 0.1.1)
   npm version minor  # For new features (0.1.0 -> 0.2.0)
   npm version major  # For breaking changes (0.1.0 -> 1.0.0)
   ```

2. **Push the version tag** to GitHub:

   ```bash
   git push origin main --follow-tags
   ```

3. **Monitor the workflow**:
   - Go to the "Actions" tab in GitHub
   - Watch the "Publish to NPM" workflow run
   - The package will be automatically published to npm

**What the workflow does:**

- Checks out the code
- Installs dependencies
- Runs type checking
- Runs linting
- Builds all packages
- Runs tests
- Publishes to npm with provenance
- Creates a release summary

### Method 2: Manual Publishing with Script

If you need to publish manually (not recommended for production), you can use the publish script:

**Steps:**

1. **Ensure you're logged into npm**:

   ```bash
   npm login
   ```

2. **Run the publish script**:

   ```bash
   npm run publish:npm
   ```

3. **Follow the prompts** to confirm the publish.

### Method 3: Direct npm publish

For emergency situations only:

```bash
npm run build
npm publish
```

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.x): Bug fixes, minor improvements
- **MINOR** (0.x.0): New features, backwards compatible
- **MAJOR** (x.0.0): Breaking changes

## Pre-publish Checklist

Before publishing a new version:

- [ ] All tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] Types check (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md is updated
- [ ] README.md is updated if needed
- [ ] Version number is bumped appropriately
- [ ] All changes are committed and pushed

## Verifying the Published Package

After publishing, verify the package:

1. **Check npm registry**:

   ```bash
   npm view universal-claude-router-cli
   ```

2. **Test global installation**:

   ```bash
   npm install -g universal-claude-router-cli
   ucr --version
   ```

3. **Test in a new project**:
   ```bash
   mkdir test-ucr && cd test-ucr
   npm init -y
   npm install universal-claude-router-cli
   npx ucr --help
   ```

## Troubleshooting

### "403 Forbidden" Error

- Ensure you're logged into npm with an account that has publishing permissions
- Check that the `NPM_TOKEN` secret is correctly configured in GitHub
- Verify the token hasn't expired

### "Package already exists" Error

- You're trying to publish a version that already exists
- Bump the version number and try again

### Build Failures

- Run `npm run clean` and then `npm install` to start fresh
- Check that all dependencies are correctly installed
- Ensure Node.js version is 18.x or higher

### GitHub Actions Workflow Not Triggering

- Ensure the tag follows the format `v*.*.*` (e.g., `v0.1.0`)
- Check that the workflow file is in `.github/workflows/publish.yml`
- Verify GitHub Actions are enabled for the repository

## Package Structure

The published package includes:

- `packages/cli/dist/` - CLI executable and commands
- `packages/core/dist/` - Core proxy server and routing logic
- `packages/shared/dist/` - Shared types and utilities
- `README.md` - Documentation
- `LICENSE` - License information
- `install.sh` - Installation script

## Support

For issues related to publishing:

1. Check existing [GitHub Issues](https://github.com/jamesthegreati/universal-claude-router/issues)
2. Review GitHub Actions workflow logs
3. Create a new issue with the "publishing" label

## References

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions - Publishing to npm](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [Semantic Versioning](https://semver.org/)
