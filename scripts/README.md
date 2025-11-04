# Scripts

This directory contains utility scripts for managing the Universal Claude Router project.

## Available Scripts

### 🚀 release.sh

**Purpose**: Create and publish a new release

**Usage**:
```bash
npm run release
# or
./scripts/release.sh
```

**What it does**:
1. Checks that your git working directory is clean
2. Shows the current version
3. Prompts you to select version bump type (patch/minor/major) or specify a custom version
4. Updates package.json and package-lock.json with the new version
5. Commits the version change
6. Creates a git tag (e.g., `v0.1.1`)
7. Pushes the commit and tag to GitHub
8. Triggers the GitHub Actions publish workflow

**Requirements**:
- Clean git working directory (no uncommitted changes)
- Push access to the main branch

**Example output**:
```
========================================
Universal Claude Router - Release Script
========================================

Current version: 0.1.0

Select version bump type:
  1) patch  (bug fixes)
  2) minor  (new features)
  3) major  (breaking changes)
  4) custom (specify exact version)

Enter choice (1-4): 1

✓ Version bumped to: 0.1.1
✓ Changes committed
✓ Tag created

Ready to push to remote repository.
This will trigger the GitHub Actions publish workflow.

Push changes and tag to trigger publish? (yes/no): yes

✓ Release initiated!
```

---

### 📦 publish.sh

**Purpose**: Manually publish the package to npm (not recommended for production use)

**Usage**:
```bash
npm run publish:npm
# or
./scripts/publish.sh
```

**What it does**:
1. Verifies you're logged into npm
2. Cleans previous builds
3. Installs dependencies
4. Builds the project
5. Runs tests
6. Shows a dry-run of what will be published
7. Prompts for confirmation
8. Publishes to npm

**Requirements**:
- Logged into npm (`npm login`)
- Publishing permissions for `@universal-claude-router/cli`

**When to use**:
- Emergency hotfixes
- Testing publish process locally
- When GitHub Actions is unavailable

**⚠️ Warning**: For production releases, prefer using `release.sh` which triggers the automated GitHub Actions workflow.

---

### 🔧 quick-start.sh

**Purpose**: Quick setup for development or testing

**Usage**:
```bash
./scripts/quick-start.sh
```

---

### 📊 benchmark.ts

**Purpose**: Performance benchmarking

**Usage**:
```bash
# First compile it
npx ts-node scripts/benchmark.ts
```

---

### 🧪 load-test.sh

**Purpose**: Load testing for the proxy server

**Usage**:
```bash
./scripts/load-test.sh
```

## Workflow

### For Regular Releases

Use the **release.sh** script:

```bash
# Make your changes, commit them
git add .
git commit -m "feat: add new feature"

# Create a release
npm run release

# Select version bump type
# The script will handle the rest
```

The GitHub Actions workflow will:
- Run tests
- Build the project
- Publish to npm
- Create release notes

### For Manual Publishing (Emergency Only)

Use the **publish.sh** script:

```bash
# Ensure you're logged in
npm login

# Publish
npm run publish:npm
```

## Troubleshooting

### "Git working directory is not clean"

Commit or stash your changes:
```bash
git status
git add .
git commit -m "Your commit message"
# or
git stash
```

### "Not logged into npm"

Log in to npm:
```bash
npm login
```

### "Permission denied"

Make the script executable:
```bash
chmod +x scripts/release.sh
chmod +x scripts/publish.sh
```

### "GitHub Actions workflow not triggered"

1. Check that the tag was pushed: `git ls-remote --tags origin`
2. Verify the tag format matches `v*.*.*` (e.g., `v0.1.0`)
3. Check GitHub Actions tab in the repository

## Notes

- Always test your changes locally before creating a release
- Follow semantic versioning (patch/minor/major)
- The `prepublishOnly` script in package.json ensures the project is built before publishing
- GitHub Actions provides better security with secrets management
- Manual publishing should only be used for emergencies

## Additional Resources

- [PUBLISHING.md](../PUBLISHING.md) - Detailed publishing guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contributing guidelines
- [GitHub Actions Workflow](../.github/workflows/publish.yml) - Automated publish workflow
