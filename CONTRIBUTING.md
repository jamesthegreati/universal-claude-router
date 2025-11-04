# Contributing to Universal Claude Router

Thank you for your interest in contributing to Universal Claude Router! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [GitHub Issues](https://github.com/jamesthegreati/universal-claude-router/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Relevant logs or error messages

### Suggesting Features

1. Check [GitHub Discussions](https://github.com/jamesthegreati/universal-claude-router/discussions) for similar ideas
2. Open a new discussion to propose your feature
3. Explain the use case and benefits
4. Be open to feedback and iteration

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Write or update tests
5. Ensure all tests pass
6. Update documentation
7. Commit with clear messages
8. Push to your fork
9. Open a pull request

## Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/universal-claude-router.git
cd universal-claude-router

# Install dependencies
npm install

# Build all packages
npm run build
```

### Development Workflow

```bash
# Watch mode for development
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

## Project Structure

```
universal-claude-router/
├── packages/
│   ├── shared/          # Shared types and utilities
│   ├── core/            # Core proxy and routing
│   ├── cli/             # CLI tool (planned)
│   └── ui/              # Web UI (planned)
├── config/              # Configuration templates
├── docs/                # Documentation
└── scripts/             # Build and utility scripts
```

## Coding Guidelines

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for public APIs
- Use interfaces for object shapes
- Use enums for fixed sets of values
- Avoid `any` where possible

### Code Style

- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Extract complex logic into separate functions

### Testing

- Write tests for new features
- Update tests when changing behavior
- Aim for good test coverage
- Use descriptive test names
- Test edge cases and error conditions

### Documentation

- Update README.md for user-facing changes
- Update docs/ for detailed documentation
- Add inline comments for complex logic
- Include examples where helpful

## Package-Specific Guidelines

### @ucr/shared

- Pure TypeScript types and utilities
- No dependencies on other UCR packages
- Keep utilities small and focused
- Provide comprehensive type definitions

### @ucr/core

- Core functionality and business logic
- Depend on @ucr/shared
- Use dependency injection for testability
- Handle errors gracefully
- Log important events

### @ucr/cli (planned)

- User-friendly command-line interface
- Clear help text and examples
- Validate user input
- Provide helpful error messages
- Use colors and formatting appropriately

### @ucr/ui (planned)

- React + TypeScript
- Use shadcn/ui components
- Responsive design
- Accessibility first
- Follow React best practices

## Adding a New Transformer

To add support for a new provider:

1. Create a new file in `packages/core/src/transformer/transformers/`
2. Extend `BaseTransformer` class
3. Implement required methods:
   - `transformRequest()` - Convert Claude format to provider format
   - `transformResponse()` - Convert provider format to Claude format
   - `transformStreamChunk()` - (Optional) Handle streaming
4. Register in `packages/core/src/transformer/registry.ts`
5. Add tests
6. Document in `docs/providers/`

Example:

```typescript
import { BaseTransformer } from '../base.js';
import type { ClaudeCodeRequest, ClaudeCodeResponse, Provider } from '@ucr/shared';

export class MyProviderTransformer extends BaseTransformer {
  readonly provider = 'my-provider';

  async transformRequest(request: ClaudeCodeRequest, provider: Provider) {
    // Transform request
    return {
      url: `${provider.baseUrl}/v1/chat`,
      method: 'POST',
      headers: this.buildAuthHeader(provider),
      body: { /* transformed body */ },
    };
  }

  async transformResponse(response: any, original: ClaudeCodeRequest) {
    // Transform response
    return {
      id: this.generateId(),
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: response.text }],
      model: original.model,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: response.input_tokens || 0,
        output_tokens: response.output_tokens || 0,
      },
    };
  }
}
```

## Commit Messages

Use clear, descriptive commit messages:

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and PRs when relevant

Examples:
```
Add OpenRouter transformer

Implement streaming support for OpenAI

Fix token counting for multi-line messages

Update README with installation instructions
```

## Review Process

1. Maintainers review all pull requests
2. Address feedback and requested changes
3. Keep the discussion focused and respectful
4. Be patient - reviews take time
5. Once approved, a maintainer will merge

## Release Process

(For maintainers)

1. Update version numbers in package.json files
2. Update CHANGELOG.md
3. Create a git tag
4. Push tag to trigger release workflow
5. GitHub Actions will build and publish to npm

## Questions?

- Ask in [GitHub Discussions](https://github.com/jamesthegreati/universal-claude-router/discussions)
- Check existing [Issues](https://github.com/jamesthegreati/universal-claude-router/issues)
- Review [Documentation](docs/)

Thank you for contributing to Universal Claude Router! 🚀
