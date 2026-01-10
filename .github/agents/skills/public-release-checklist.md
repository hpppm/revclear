# Public Release Checklist Skill

## Purpose
Comprehensive checklist before making repository public.

## Security Checks
- [ ] No hardcoded credentials/secrets
- [ ] .gitignore covers sensitive files
- [ ] Dev routes restricted to development env
- [ ] All API routes have appropriate auth
- [ ] No internal URLs/IPs in code
- [ ] License file present

## Code Quality
- [ ] No TODO comments with sensitive info
- [ ] Dead code removed
- [ ] Unused dependencies removed
- [ ] Tests pass
- [ ] No console.log with sensitive data

## Documentation
- [ ] README.md complete
- [ ] .env.example provided
- [ ] API documentation current
- [ ] CONTRIBUTING.md if accepting contributions
- [ ] CHANGELOG.md present

## Git History
- [ ] No secrets in commit history
- [ ] No large binary files
- [ ] Appropriate .gitattributes