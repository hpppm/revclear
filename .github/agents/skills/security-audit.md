# Security Audit Skill

## Purpose
Scan repository for security vulnerabilities before public release.

## Checks
1. **Exposed Dev Routes** - Find routes loaded in production that should be dev-only
2. **Unauthenticated Endpoints** - Identify API routes missing auth middleware
3. **Hardcoded Secrets** - Scan for API keys, passwords, tokens in code
4. **Env Var Leaks** - Check for logging that exposes configuration
5. **Sensitive Files** - Verify .gitignore covers .env, credentials, secrets

## Commands
```bash
# Search for hardcoded secrets
grep -r "password\|secret\|apikey\|token" --include="*.ts" --include="*.js" src/

# Find unauthenticated routes
grep -rn "app.use\|router\." --include="*.ts" src/api/routes/
```

## Output Format
Report as table with: Location | Issue | Severity | Fix