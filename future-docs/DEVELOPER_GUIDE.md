# Developer Guide

Complete guide for RevClear development workflow, tools, and best practices.

---

## 🎯 Quick Start - The Big Picture

```
YOU (Developer)
    ↓
┌───────────────────────────────────────────────┐
│   LOCAL COMPUTER (Your Machine)              │
├───────────────────────────────────────────────┤
│                                               │
│  VS Code                  Claude Desktop      │
│  ├─ Write Code           ├─ Ask Questions    │
│  ├─ GitHub Copilot       ├─ Get Guidance     │
│  └─ Test Locally         └─ 3 MCP Servers:   │
│                             ├─ GitHub         │
│                             ├─ RevClear AI    │
│                             └─ File System    │
└───────────────────────────────────────────────┘
    ↓ (git push)
┌───────────────────────────────────────────────┐
│   GITHUB (Cloud Storage)                      │
├───────────────────────────────────────────────┤
│  ✓ Stores your code                           │
│  ✓ Triggers deployments                       │
│  ✓ Hosts demo site (GitHub Pages)             │
└───────────────────────────────────────────────┘
    ↓ (automatic)
┌───────────────────────────────────────────────┐
│   GOOGLE CLOUD (Production)                   │
├───────────────────────────────────────────────┤
│  1. Cloud Build: Builds Docker image          │
│  2. Cloud Run: Runs your backend API          │
│  3. Production: Live for users!               │
└───────────────────────────────────────────────┘
```

---

## 📚 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Development Workflow](#development-workflow)
3. [AI Tools Explained](#ai-tools-explained)
4. [MCP Servers](#mcp-servers)
5. [Google Cloud Integration](#google-cloud-integration)
6. [Common Scenarios](#common-scenarios)
7. [Tool Summary](#tool-summary)

---

## 🎓 Quick Reference

| I Want To... | Use This | Command/Action |
|-------------|----------|----------------|
| Get code suggestions | GitHub Copilot | Automatic in VS Code |
| Ask "how do I..." | Claude Desktop | Type question |
| Check if code is secure | Claude + RevClear AI MCP | "Certify this code" |
| Create a new file | Claude + File System MCP | "Create [filename]" |
| See GitHub issues | Claude + GitHub MCP | "Show issues" |
| Test locally | Terminal | `npm run dev` |
| Deploy to production | Terminal | `git push` |
| View production | Browser | GCP Console |
| View demo | Browser | GitHub Pages |

---

## 🔄 Development Workflow

### Complete Workflow

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

### Simple Rules

**Rule 1: One Tool, One Job**
```
GitHub Copilot → Code suggestions (automatic)
Claude Desktop → Questions & guidance (manual)
Git/GitHub     → Save & share code
GCP            → Run in production
```

**Rule 2: Always This Order**
```
1. Write → VS Code
2. Test → npm run dev
3. Certify → Claude + RevClear AI MCP
4. Commit → git push
5. Deploy → GCP (automatic)
```

**Rule 3: Use Claude When You're Stuck**
```
"I don't know how to..." → Ask Claude
"Is this secure?" → Claude + RevClear AI MCP
"How do I deploy?" → Ask Claude
"Create a file" → Claude + File System MCP
```

---

## 🤖 AI Tools Explained

### GitHub Copilot (In VS Code)
- **Always on** while you code
- Suggests next line automatically
- Like autocomplete on steroids
- **Use**: Every time you code

### Claude Desktop + MCP
- **On demand** when you ask
- Answers questions
- Reviews code
- Guides implementation
- **Use**: When you need help/guidance

---

## 🛠️ MCP Servers

Model Context Protocol servers connect Claude Desktop to specialized tools.

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

**Capabilities**:
- Create and manage issues
- Search code and repos
- Manage pull requests
- File operations
- Repository management

---

### 2. RevClear AI MCP (Custom - We Built This!)
**Purpose**: RevClear-specific AI tools  
**Provider**: You (custom built)  
**Location**: `ai-mcp-server/`

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

### Architecture

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

## 📋 Common Scenarios

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

### Real Example: Add "Delete Claim" Button

```
┌─ STEP 1: Ask Claude ─────────────────────┐
│ You: "How do I add delete claim feature?" │
│ Claude (RevClear AI MCP): [Step-by-step]  │
└──────────────────────────────────────────┘
          ↓
┌─ STEP 2: Code in VS Code ────────────────┐
│ Open VS Code                              │
│ GitHub Copilot suggests code as you type  │
└──────────────────────────────────────────┘
          ↓
┌─ STEP 3: Test Locally ───────────────────┐
│ npm run dev                               │
│ Click delete button → Works! ✓            │
└──────────────────────────────────────────┘
          ↓
┌─ STEP 4: Check Security ─────────────────┐
│ You: "Claude, certify this code"          │
│ Claude (RevClear AI MCP): ✅ Secure       │
└──────────────────────────────────────────┘
          ↓
┌─ STEP 5: Deploy ─────────────────────────┐
│ git add .                                 │
│ git commit -m "Add delete claim"          │
│ git push                                  │
└──────────────────────────────────────────┘
          ↓
┌─ STEP 6: Automatic ──────────────────────┐
│ GCP Cloud Build → Builds                  │
│ GCP Cloud Run → Deploys                   │
│ ✅ Live in production!                    │
└──────────────────────────────────────────┘
```

---

## 🔧 Tool Summary

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

## 🔐 Security Note

**Your tokens are safe!**
- `.env` file is in `.gitignore`
- Never committed to GitHub
- Only stored locally on your computer
- Used by MCP servers to authenticate

---

## 🚀 Next Steps

1. ✅ You have everything set up
2. ✅ All tools are connected
3. ✅ Tested and working
4. **Now**: Start coding!
5. **Use Claude** when you need help
6. **Use Copilot** for code suggestions
7. **git push** to deploy

---

## 💡 Remember

**3 MCP Servers = 3 Specialized Helpers**

1. **GitHub MCP**: Talks to GitHub
2. **RevClear AI MCP**: Knows YOUR project
3. **File System MCP**: Manages files

**They all work through Claude Desktop!**

---

**Questions?**  
Just ask Claude: "Explain [thing] to me"

**You're ready to build! 🚀**
