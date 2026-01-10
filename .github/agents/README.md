# RevClear AI Agents

This directory contains AI agent skills and prompts for GitHub Copilot and other AI assistants.

## Overview

These skills provide reusable capabilities for code analysis, security auditing, and project maintenance.

## Structure

```
agents/
├── README.md              # This file
├── prompts/               # Reusable prompt templates
│   └── cleanup-report.md  # Code cleanup analysis template
└── skills/                # Copilot agent skills
    ├── api-inventory.md         # API endpoint catalog
    ├── dead-code-finder.md      # Orphaned file detection
    ├── dependency-analyzer.md   # npm dependency analysis
    ├── public-release-checklist.md  # Pre-release verification
    ├── security-audit.md        # Security vulnerability scanner
    └── tech-stack-scanner.md    # Technology overview generator
```

## Skills Reference

### 🔒 Security Audit
**File:** `skills/security-audit.md`

Scans repository for security vulnerabilities before public release:
- Exposed dev routes in production
- Unauthenticated endpoints
- Hardcoded secrets
- Environment variable leaks
- Sensitive files not in .gitignore

### 📋 API Inventory
**File:** `skills/api-inventory.md`

Catalogs all API endpoints with:
- Authentication status (protected/public)
- Rate limiting configuration
- Swagger documentation coverage
- Route file locations

### 🗑️ Dead Code Finder
**File:** `skills/dead-code-finder.md`

Identifies technical debt:
- Orphaned files not imported anywhere
- Unused exports
- Unreachable routes
- Stale documentation

### 📦 Dependency Analyzer
**File:** `skills/dependency-analyzer.md`

Analyzes npm packages:
- Unused dependencies
- Missing dependencies
- Misplaced dev dependencies
- Security vulnerabilities

### 🔧 Tech Stack Scanner
**File:** `skills/tech-stack-scanner.md`

Generates technology overview:
- Frontend frameworks
- Backend runtime & libraries
- Database & ORM
- AI/ML integrations
- Cloud services
- DevOps tooling

### ✅ Public Release Checklist
**File:** `skills/public-release-checklist.md`

Pre-release verification:
- Security checks
- Code quality
- Documentation
- Git history

## Usage

### With GitHub Copilot Chat
Reference a skill by asking Copilot to perform the task:
```
"Run a security audit on this repository following the security-audit skill"
"Generate an API inventory for all backend routes"
"Find dead code in this project"
```

### With Claude Code
The skills are referenced in `CLAUDE.md` and can be invoked:
```
"Use the api-inventory skill to catalog all endpoints"
"Run the public-release-checklist before we go live"
```

## Adding New Skills

1. Create a new markdown file in `skills/`
2. Include these sections:
   - **Purpose**: What the skill does
   - **Checks**: Specific items to verify
   - **Commands**: Shell commands for analysis
   - **Output Format**: Expected result structure
3. Update this README with the new skill
4. Reference in `CLAUDE.md` if broadly applicable

## Prompts

The `prompts/` folder contains reusable prompt templates for common tasks:
- `cleanup-report.md` - Template for generating code cleanup reports

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Main AI guidance document
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
- [Security Guidelines](../../backend/docs/DATA_SECURITY.md) - PHI/PII handling
