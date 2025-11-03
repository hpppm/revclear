# RevClear - Healthcare Claims Management Platform

A comprehensive healthcare claims management system with HIPAA-compliant backend and modern frontend.

## 🏥 Project Overview

RevClear is a medical claims processing platform built with security and compliance at its core. The platform helps healthcare providers manage, track, and process insurance claims efficiently.

## 🏗️ Architecture

```
revclear/
├── RevClear/
│   ├── backend/     # Node.js + TypeScript + Express API
│   ├── frontend/    # Next.js 16 + React 19
│   └── Demo/        # Static demo site
├── ai-mcp-server/   # AI-powered MCP tools
└── docs/            # Documentation
```

## ✨ Features

- **HIPAA Compliant**: Built with healthcare data security standards
- **AI-Powered Tools**: Code certification and security analysis
- **Modern Stack**: Next.js 16, React 19, TypeScript
- **GCP Ready**: Cloud Run deployment configuration
- **Automated Testing**: Comprehensive test suites

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- GCP account (for production deployment)

### Ports & URLs
- **Backend API**: http://localhost:8080
- **Frontend App**: http://localhost:3000
- **Live Demo**: https://hpppm.github.io/revclear/

### Local Development

```bash
# Clone repository
git clone https://github.com/hpppm/revclear.git
cd revclear

# Backend setup
cd RevClear/backend
npm install
npm run dev

# Frontend setup
cd ../frontend
npm install
npm run dev
```

## 🤖 AI MCP Server

The project includes an AI-powered Model Context Protocol (MCP) server with 8 specialized tools:

- `certify_code` - Security + HIPAA certification
- `guide_implementation` - Step-by-step development guides
- `run_code_safely` - Safe code execution
- `check_dependencies` - Dependency validation
- `validate_environment` - Environment configuration checks
- `get_api_routes` - API route documentation
- `analyze_security` - Security vulnerability scanning
- `check_hipaa_compliance` - HIPAA compliance verification

See [MCP_SETUP.md](MCP_SETUP.md) for setup instructions.

## 📦 Deployment

### GitHub Pages (Demo)
Automatically deploys to: https://hpppm.github.io/revclear/

### GCP Cloud Run (Production)
```bash
gcloud builds submit --config RevClear/backend/cloudbuild.yaml
```

## 👥 Team & Ownership

- **Security Lead**: Repository Owner
- **Backend** (`RevClear/backend/`): Rasmus (ask before editing)
- **Frontend** (`RevClear/frontend/`): Narni (ask before editing)
- **Demo** (`Demo/`): Aseel (anyone can suggest changes)
- **Documentation** (Root `.md` files): Aseel (anyone can suggest changes)

## 📚 Documentation

### 🚀 Start Here
- **[Team Guide](TEAM_GUIDE.md)** ⭐ - **Read this first!** How we work together (git workflow, roles, communication, and collaboration rules)
- **[Getting Started](GETTING_STARTED.md)** - Detailed setup instructions for backend and frontend
- **[Demo Guide](Demo/README.md)** - Check out our working demo!

### 📁 Future Documentation
Advanced docs for when we build the real system:
- **[future-docs/](future-docs/)** - API reference, deployment guides, security docs, architecture

> **💡 Philosophy**: Document what exists, not what we dream about!  
> We'll move docs back as we build features. See `future-docs/README.md` for the plan.

## 🔒 Security

- HIPAA compliant architecture
- Environment variable protection
- GitHub Actions secrets management
- Automated security scanning

## 📄 License

Private repository - All rights reserved

## 🤝 Contributing

This is a team project. Follow these essential practices:

### Critical Team Practices
- **Pull before you push** - Always get the latest code first to avoid conflicts
- **Write clear commit messages** - Help teammates understand what changed
- **Test your code** - Make sure it works before pushing
- **Ask for help** - We're a team! If you're stuck, reach out

### Git Workflow
```bash
# 1. Start new task (create branch)
git checkout main
git pull origin main
git checkout -b feature/yourname-task

# 2. Make your changes and save progress
git add .
git commit -m "Describe what you did"
git push origin feature/yourname-task

# 3. Create Pull Request on GitHub
# - Ask teammate to review
# - Merge after approval

# 4. Clean up after merge
git checkout main
git pull origin main
git branch -D feature/yourname-oldtask
```

**Quick Commands:**
```bash
# START: git checkout main && git pull && git checkout -b feature/name-task
# SAVE: git add . && git commit -m "message" && git push
# DONE: git checkout main && git pull && git branch -D feature/name-oldtask
```

### Important Notes
- ⚠️ **Never commit .env files** (they contain secrets!)
- ⚠️ **Always use branches for real work** (keeps main stable!)
- ⚠️ **Merge PRs within 1-3 days** (don't let branches get old)
- ⚠️ **Test your code before pushing** (keep main branch stable)
- ✅ **Backend runs on port 8080** (not 3001!)
- ✅ **Demo auto-deploys on every push to main**

**For detailed instructions and more information, see the [Team Guide](TEAM_GUIDE.md).**

## 📞 Support

For questions or issues, contact the team leads or open an issue in GitHub.

---

Built with ❤️ by the RevClear Team
