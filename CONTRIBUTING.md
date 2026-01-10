# Contributing to RevClear

Thank you for your interest in contributing to RevClear! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

1. **Fork the repository** and clone it locally
2. **Install dependencies**:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```
3. **Set up environment variables**: Copy `.env.example` to `.env` and configure
4. **Run the development servers**:
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend
   cd frontend && npm run dev
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Use conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, semicolons, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Ensure all tests pass: `npm test`
4. Ensure TypeScript compiles: `npm run build`
5. Update documentation if needed
6. Submit a pull request with a clear description

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

## Security Guidelines

**IMPORTANT**: This is a healthcare application handling PHI/PII.

- Never commit secrets, credentials, or API keys
- Never log sensitive data (passwords, tokens, PHI)
- Always use parameterized queries (no SQL injection)
- Follow HIPAA security guidelines
- Report security vulnerabilities privately

## Testing

- Write tests for new features
- Ensure existing tests pass
- Test edge cases and error handling

## Documentation

- Update README if adding new features
- Document API changes
- Add inline comments for complex logic

## Questions?

Open an issue for questions or discussion topics.

---

Thank you for contributing to RevClear!
