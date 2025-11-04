# Setup Instructions for NPM Publishing

This document provides step-by-step instructions for setting up automated npm publishing for the
Universal Claude Router package.

## Overview

The package is configured to publish automatically via GitHub Actions when a version tag is pushed.
This ensures consistent, secure, and auditable releases.

## One-Time Setup (Required Before First Publish)

### Step 1: Create npm Account and Get Publishing Permissions

1. **Create npm account** (if you don't have one):
   - Visit https://www.npmjs.com/signup
   - Complete the registration

2. **Verify publishing permissions**:
   - The package is named `universal-claude-router-cli` (unscoped)
   - Any npm account can publish unscoped packages with unique names

### Step 2: Generate npm Access Token

1. Log in to https://www.npmjs.com
2. Click your profile icon → "Access Tokens"
3. Click "Generate New Token" → "Automation"
4. Give it a name like "GitHub Actions - Universal Claude Router"
5. **Copy the token immediately** (you won't be able to see it again)

### Step 3: Add Token to GitHub Secrets

1. Go to your GitHub repository:

   ```
   https://github.com/jamesthegreati/universal-claude-router/settings/secrets/actions
   ```

2. Click "New repository secret"

3. Enter:
   - **Name**: `NPM_TOKEN` (exactly as shown)
   - **Secret**: Paste the token from Step 2

4. Click "Add secret"

### Step 4: Verify Setup

You can verify the setup by triggering a test workflow:

1. Go to: https://github.com/jamesthegreati/universal-claude-router/actions
2. Select "Publish to NPM" workflow
3. Click "Run workflow" → "Run workflow"
4. Check the logs to ensure it runs (it may skip publish if no version change)

## Publishing Your First Release

Once setup is complete, publish your first release:

```bash
# From your local repository
npm run release
```

Follow the prompts:

1. Choose "patch" (to bump from 0.1.0 to 0.1.1)
2. Confirm when prompted
3. The script will push the tag and trigger GitHub Actions
4. Watch the workflow at: https://github.com/jamesthegreati/universal-claude-router/actions

Within a few minutes, your package will be available:

```bash
npm install -g universal-claude-router-cli
```

## Publishing Subsequent Releases

After the first release, the process is simple:

```bash
# 1. Make your changes and commit them
git add .
git commit -m "feat: add new feature"

# 2. Run the release script
npm run release

# 3. Choose version bump type:
#    - patch: Bug fixes (0.1.1 → 0.1.2)
#    - minor: New features (0.1.1 → 0.2.0)
#    - major: Breaking changes (0.1.1 → 1.0.0)

# 4. Confirm and let GitHub Actions publish
```

## Troubleshooting

### "NPM_TOKEN secret not found"

**Cause**: The secret wasn't set correctly in GitHub.

**Solution**:

1. Verify the secret name is exactly `NPM_TOKEN`
2. Check it's in the correct repository
3. Regenerate the token if needed

### "403 Forbidden" when publishing

**Cause**: npm token doesn't have publish permissions.

**Solution**:

1. Verify your npm account has publish permissions
2. Check the token type is "Automation" (not "Read-only")
3. Regenerate the token with proper permissions

### Package name already taken

**Cause**: Someone else owns the package name.

**Solution**: If `universal-claude-router-cli` is taken, you'll need to:

1. Choose a different package name
2. Update `package.json` with the new name
3. Update all documentation

### Workflow fails on tests

**Cause**: Tests are failing in CI.

**Solution**:

1. Run tests locally: `npm test`
2. Fix any failing tests
3. Commit and push fixes
4. Create a new release

## Security Best Practices

1. **Never commit the npm token** to the repository
2. **Rotate tokens regularly** (every 6-12 months)
3. **Use Automation tokens** for CI/CD, not personal tokens
4. **Enable 2FA** on your npm account
5. **Review publish logs** after each release

## Getting Help

- **Publishing Guide**: See [PUBLISHING.md](../PUBLISHING.md)
- **Quick Reference**: See [PUBLISHING_QUICKSTART.md](./PUBLISHING_QUICKSTART.md)
- **Script Documentation**: See [scripts/README.md](../scripts/README.md)
- **GitHub Issues**: https://github.com/jamesthegreati/universal-claude-router/issues

## Checklist

Before attempting your first publish, ensure:

- [ ] npm account created
- [ ] npm Automation token generated
- [ ] `NPM_TOKEN` secret added to GitHub repository
- [ ] Repository cloned locally
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Release script is executable: `chmod +x scripts/release.sh`

Once all items are checked, you're ready to publish! 🚀
