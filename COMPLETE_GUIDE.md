# RevClear Development & Deployment Guide

## 🎯 Simple Overview

### What Each Tool Does

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR WORKFLOW                        │
└─────────────────────────────────────────────────────────┘

1. WRITE CODE (Local Development)
   ├── VS Code: Write your code
   ├── GitHub Copilot: AI code suggestions
   └── Claude Desktop + MCP: AI assistance
       ├── GitHub MCP: Access GitHub
       ├── RevClear AI MCP: Project-specific help
       └── File System MCP: File operations

2. TEST CODE (Local)
   ├── npm run test: Run tests
   └── npm run dev: Test locally

3. COMMIT CODE (Version Control)
   ├── git add/commit/push
   └── GitHub: Store code

4. DEPLOY CODE (Production)
   ├── GCP Cloud Build: Build Docker image
   ├── GCP Cloud Run: Run in production
   └── GitHub Pages: Host demo site
```

---

## 🛠️ MCP Servers Explained

### 1. GitHub MCP (Official)
**Purpose**: Connect Claude to GitHub
**Provider**: Anthropic (official)

**Use when**:
- Reading GitHub issues
- Creating pull requests
- Searching repository code
- Managing GitHub resources

**Example**:
```
Claude: "Show me all open issues in revclear repo"
→ GitHub MCP fetches from GitHub API
```

---

### 2. RevClear AI MCP (Custom - We Built This!)
**Purpose**: RevClear-specific AI tools
**Provider**: You (custom built)

**8 Tools Available**:

1. **certify_code**: Security + HIPAA check before deploy
   - Use: "Is this code safe to deploy?"
   
2. **guide_implementation**: Step-by-step instructions
   - Use: "How do I add a new feature?"
   
3. **run_code_safely**: Test code execution
   - Use: "Test this function"
   
4. **check_dependencies**: Verify packages
   - Use: "Are all dependencies secure?"
   
5. **validate_environment**: Check .env files
   - Use: "Is my config correct?"
   
6. **get_api_routes**: List all API endpoints
   - Use: "Show me all backend routes"
   
7. **analyze_security**: Security scan
   - Use: "Find security vulnerabilities"
   
8. **check_hipaa_compliance**: HIPAA validation
   - Use: "Is this HIPAA compliant?"

**Example**:
```
Claude: "Certify the auth code for deployment"
→ RevClear AI MCP checks code
→ Returns: ✅ HIPAA compliant, ✅ Secure, ❌ Missing rate limiting
```

---

### 3. File System MCP (Official)
**Purpose**: Read/write files
**Provider**: Anthropic (official)

**Use when**:
- Reading project files
- Creating new files
- Editing configurations
- Navigating directories

**Example**:
```
Claude: "Create a new React component UserProfile"
→ File System MCP creates the file
```

---

## ☁️ Google Cloud Integration

### Current Setup

```
LOCAL DEVELOPMENT          GITHUB              GOOGLE CLOUD
─────────────────          ──────              ─────────────

1. Write code         →    2. git push    →    3. Deploy
   (VS Code)               (GitHub)             (GCP Cloud Build)
                                                      ↓
                                                4. Build Docker
                                                   (cloudbuild.yaml)
                                                      ↓
                                                5. Deploy to Cloud Run
                                                   (Production API)
```

### When Each Service Runs

| Service | When | Purpose |
|---------|------|---------|
| **VS Code** | Always | Write code locally |
| **GitHub Copilot** | While coding | AI suggestions in VS Code |
| **Claude Desktop + MCP** | When you ask | AI assistance, code review |
| **GitHub** | On `git push` | Store code, trigger workflows |
| **GCP Cloud Build** | On push to main | Build Docker image |
| **GCP Cloud Run** | After build | Run production backend |
| **GitHub Pages** | On markdown changes | Host demo site |

---

## 📋 When to Use What

### Scenario 1: Writing New Code
```
1. GitHub Copilot (VS Code): Suggests code as you type
2. Claude + RevClear AI MCP: "Guide me to implement X"
3. File System MCP: Creates/edits files
4. Test locally: npm run dev
```

### Scenario 2: Code Review
```
1. Claude + RevClear AI MCP: "Certify this code"
2. Claude + GitHub MCP: "Create a PR"
3. Team reviews on GitHub
```

### Scenario 3: Deploying to Production
```
1. git push (GitHub)
2. GCP Cloud Build: Automatically triggered
3. Builds Docker image
4. Deploys to Cloud Run
5. Production is live!
```

### Scenario 4: Checking Compliance
```
1. Claude + RevClear AI MCP: "Check HIPAA compliance"
2. Claude + RevClear AI MCP: "Analyze security"
3. Fix issues
4. Claude + RevClear AI MCP: "Certify code"
5. Deploy
```

---

## 🚀 Complete Workflow Example

**Task**: Add a new "Claims Search" feature

### Step 1: Plan (Claude Desktop)
```
You: "Guide me to implement a claims search endpoint"
RevClear AI MCP: Returns step-by-step guide
```

### Step 2: Code (VS Code + GitHub Copilot)
```
Open VS Code
GitHub Copilot suggests code as you type
```

### Step 3: Create Files (Claude Desktop)
```
You: "Create the claims search controller file"
File System MCP: Creates file with boilerplate
```

### Step 4: Test Locally
```bash
npm run dev
# Test in browser
```

### Step 5: Security Check (Claude Desktop)
```
You: "Certify the claims search code"
RevClear AI MCP: 
  ✅ Security check passed
  ✅ HIPAA compliant
  ⚠️ Add rate limiting
```

### Step 6: Fix Issues
```
Add rate limiting in VS Code
```

### Step 7: Commit (Terminal)
```bash
git add .
git commit -m "Add claims search endpoint"
git push
```

### Step 8: Auto Deploy (GCP)
```
GitHub triggers GCP Cloud Build
Cloud Build runs cloudbuild.yaml
Deploys to Cloud Run
✅ Live in production!
```

---

## 🔧 Tools Summary

### AI Assistants (Help You Code)
- **GitHub Copilot** (VS Code): Real-time code suggestions
- **Claude Desktop**: Ask questions, get help
- **RevClear AI MCP**: Project-specific AI tools

### Development (Write Code)
- **VS Code**: Code editor
- **npm/Node.js**: Run locally
- **git**: Version control

### Deployment (Production)
- **GitHub**: Code storage + triggers
- **GCP Cloud Build**: Build Docker images
- **GCP Cloud Run**: Run backend in cloud
- **GitHub Pages**: Host demo

### MCP Servers (Connect Claude to Tools)
- **GitHub MCP**: Claude ↔ GitHub
- **RevClear AI MCP**: Claude ↔ Your AI tools
- **File System MCP**: Claude ↔ Your files

---

## 💡 Key Principles

1. **Local First**: Always test locally before deploying
2. **Git Always**: Commit often, push when ready
3. **Certify Before Deploy**: Use RevClear AI MCP to check security
4. **Automate**: GCP Cloud Build deploys automatically
5. **Use the Right Tool**: 
   - Copilot for code suggestions
   - Claude for questions/guidance
   - MCP for specialized tasks

---

## 🎓 Quick Reference

**I want to...**

- Write code → **VS Code + GitHub Copilot**
- Get AI help → **Claude Desktop + MCP**
- Check security → **Claude + RevClear AI MCP**
- Deploy code → **git push** (GCP auto-deploys)
- Create files → **Claude + File System MCP**
- Manage GitHub → **Claude + GitHub MCP**
- View production → **GCP Cloud Console**
- See demo → **GitHub Pages**

---

## 🔐 Security Note

**Your tokens are safe!**
- `.env` file is in `.gitignore`
- Never committed to GitHub
- Only stored locally on your computer
- Used by MCP servers to authenticate

---

## Next Steps

1. ✅ You have everything set up
2. ✅ All tools are connected
3. ✅ Tested and working
4. **Now**: Start coding!
5. **Use Claude** when you need help
6. **Use Copilot** for code suggestions
7. **git push** to deploy

**You're ready to build! 🚀**
