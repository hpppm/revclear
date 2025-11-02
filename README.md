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

## 👥 Team

- **Security Lead**: Repository Owner
- **Backend**: Rasmus
- **Frontend**: Nerni

## 📚 Documentation

- [Team Guide](TEAM_GUIDE.md) - Collaboration workflow
- [MCP Setup](MCP_SETUP.md) - AI tools integration
- [Notion Bridge](NOTION_GITHUB_BRIDGE.md) - Documentation sync
- [ChatGPT Context](CHATGPT_CONTEXT.md) - AI assistant context

## 🔒 Security

- HIPAA compliant architecture
- Environment variable protection
- GitHub Actions secrets management
- Automated security scanning

## 📄 License

Private repository - All rights reserved

## 🤝 Contributing

This is a team project. Please follow the [Team Guide](TEAM_GUIDE.md) for contribution workflow.

## 📞 Support

For questions or issues, contact the team leads or open an issue in GitHub.

---

Built with ❤️ by the RevClear Team
