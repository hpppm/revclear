# Cleanup Report Template

## Purpose
Generate a comprehensive code cleanup report identifying areas for improvement.

## Report Sections

### 1. Dead Code
- Orphaned files (not imported anywhere)
- Unused exports (functions, classes, constants)
- Unreachable code paths
- Commented-out code blocks

### 2. Dependency Issues
- Unused npm packages
- Missing peer dependencies
- Misplaced dev dependencies in production
- Outdated packages with security vulnerabilities

### 3. Code Quality
- TODO comments without tickets
- console.log statements in production code
- Duplicate code blocks
- Long functions (>50 lines)
- Deeply nested callbacks

### 4. Documentation Gaps
- Undocumented public APIs
- Outdated README sections
- Missing JSDoc comments
- Stale inline comments

### 5. Security Concerns
- Hardcoded values that should be env vars
- Unvalidated inputs
- Missing rate limiting
- Authentication gaps

## Output Format

```markdown
# Code Cleanup Report
Generated: [DATE]

## Summary
- **Dead Code Items**: X
- **Dependency Issues**: X
- **Code Quality Flags**: X
- **Documentation Gaps**: X
- **Security Concerns**: X

## Detailed Findings

### High Priority
| Category | Location | Issue | Recommendation |
|----------|----------|-------|----------------|
| Security | src/api/... | ... | ... |

### Medium Priority
...

### Low Priority
...

## Recommended Actions
1. [Action 1]
2. [Action 2]
...
```

## Commands to Gather Data

```bash
# Find TODO comments
grep -rn "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" src/

# Find console.log
grep -rn "console\.log" --include="*.ts" --include="*.tsx" src/

# Check for unused dependencies
npx depcheck

# Find large files
find src -name "*.ts" -exec wc -l {} \; | sort -rn | head -20

# Find duplicate code (requires jscpd)
npx jscpd src/
```
