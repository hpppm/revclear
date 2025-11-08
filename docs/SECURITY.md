# Security Guidelines

## 🔒 Protecting Sensitive Information

This repository contains a demo medical billing system. Follow these guidelines to keep sensitive data secure:

### Never Commit These Files

- `.env` files with real credentials
- `*credentials*.json` files
- Firebase service account keys
- AWS access keys or secrets
- Database passwords
- API keys or tokens
- Personal health information (PHI)
- Real patient data

### Use Environment Variables

Always use environment variables for sensitive configuration:

```bash
# ✅ Good - Use environment variables
DATABASE_URL=process.env.DATABASE_URL
API_KEY=process.env.API_KEY

# ❌ Bad - Never hardcode credentials
DATABASE_URL="postgresql://user:password@host:5432/db"
API_KEY="sk_live_abc123xyz"
```

### GitHub Secrets

Store production credentials in GitHub Secrets:
1. Go to: `Settings → Secrets and variables → Actions`
2. Add secrets (never commit them to code)
3. Reference in workflows: `${{ secrets.SECRET_NAME }}`

### Demo Data Only

This repository uses:
- **Masked IDs**: `PAT-XXXX-XXX`, `usr_XXXXX`
- **Generic emails**: `demo@example.com`
- **Placeholder tokens**: `eyJhbGc...DEMO_TOKEN`
- **Generic URLs**: `https://github.com/YOUR_USERNAME/YOUR_REPO`

### .gitignore Protection

The `.gitignore` file is configured to exclude:
- Environment files (`.env*`)
- Credential files (`*credentials*.json`)
- Service account keys (`*firebase*.json`)
- Setup scripts with prompts (`*setup*.ps1`)
- Node modules and build artifacts

## 🛡️ HIPAA Compliance

For production deployments:

1. **Sign BAA** with cloud provider (AWS/GCP)
2. **Encrypt data** at rest and in transit
3. **Enable audit logging** for all PHI access
4. **Use MFA** for all administrative access
5. **Regular security audits** and penetration testing
6. **Access controls** with least privilege principle
7. **Data retention policies** (7 years for HIPAA)

## 🚨 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email the maintainers directly
3. Include detailed description and steps to reproduce
4. Allow time for patch before disclosure

## ✅ Security Checklist

Before deploying to production:

- [ ] All credentials stored in secure vault (AWS Secrets Manager, etc.)
- [ ] `.env` files added to `.gitignore`
- [ ] No hardcoded passwords or API keys in code
- [ ] GitHub secrets configured for CI/CD
- [ ] BAA signed with cloud provider
- [ ] Encryption enabled (TLS 1.3, AWS KMS)
- [ ] Audit logging configured
- [ ] MFA enabled for all admin accounts
- [ ] Security assessment completed
- [ ] Penetration testing performed
- [ ] Incident response plan documented

## 📚 Resources

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories)

---

**Remember**: Security is everyone's responsibility. When in doubt, ask before committing!
