# Dependency Analyzer Skill

## Purpose
Find unused npm packages and misplaced dependencies.

## Checks
1. **Unused Dependencies** - Packages in package.json never imported
2. **Missing Dependencies** - Imports without matching package
3. **Misplaced Dev Dependencies** - Test packages in production deps
4. **Outdated Packages** - Security vulnerabilities

## Commands
```bash
# Check for unused packages
npx depcheck

# Security audit
npm audit

# List outdated
npm outdated
```

## Common Misplacements
| Package | Should Be In |
|---------|--------------|
| jest* | devDependencies |
| @types/* | devDependencies |
| eslint* | devDependencies |
| nodemon | devDependencies |