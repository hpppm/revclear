# RevClear Team Guide 🚀

Hey team! Welcome to RevClear. Here's everything you need to know to get started.

## What is RevClear?

RevClear is an AI-powered medical billing system that helps healthcare providers get paid faster. It automatically checks insurance claims for errors, predicts which claims might get denied, and fixes problems before submission. Think of it as having a super-smart assistant that catches billing mistakes 24/7!

## Getting Started

### Step 1: Clone the Repository
```bash
git clone https://github.com/hpppm/revclear.git
cd revclear
```

### Step 2: Check Out the Demo
Visit our live demo to see how it works: **https://hpppm.github.io/revclear/**

The demo shows:
- How claims flow through our system
- AI analyzing claims in real-time
- Dashboard with analytics
- Complete system architecture

### Step 3: Understand the Project Structure
```
revclear/
├── .github/                 # GitHub Actions workflows
│   └── workflows/           
│       └── deploy-demo.yml  # Auto-deploys demo to Pages on every push
├── Demo/                    # Interactive web demo (what you see online)
│                            # Live at: https://hpppm.github.io/revclear/
├── ai-mcp-server/           # AI development tools (8 specialized tools)
│                            # Code certification, security analysis, HIPAA checks
├── future-docs/             # Advanced documentation stored for later
│                            # API docs, deployment guides, security docs
│                            # Add back as features are built (not before!)
└── RevClear/                # Main application code (backend + frontend)
    ├── PROJECT_STANDARDS.md # Team coding standards (naming, style, rules)
    ├── backend/             # Server API (Node.js + Express + TypeScript)
    │                        # Handles auth, database, API endpoints
    │                        # Runs on port 8080
    └── frontend/            # Web application (Next.js 16 + React 19)
                             # User interface and pages
                             # Runs on port 3000
```

**Key Files at Root:**
- **README.md** - Project overview and quick links (start here for overview)
- **TEAM_GUIDE.md** - This file! How we work together
- **GETTING_STARTED.md** - Setup instructions when you're ready to code

## Working Together

### Making Changes (Simple Version)

**1. Before you start coding:**
```bash
git pull origin main
```
This gets the latest code from everyone.

**2. Make your changes:**
Edit files, add features, fix bugs - do your magic! ✨

**3. Save your work:**
```bash
git add .
git commit -m "Describe what you did"
git push origin main
```

**4. Let everyone know:**
Tell the team in chat what you changed so we're all on the same page.

### Tips for Happy Collaboration

- **Pull before you push** - Always get the latest code first to avoid conflicts
- **Write clear commit messages** - Help teammates understand what changed
- **Test your code** - Make sure it works before pushing
- **Ask for help** - We're a team! If you're stuck, reach out

## Common Tasks

### Running the Backend (Server)

⚠️ **NOT READY YET** - Backend is missing route files and won't start.

Once Rasmus creates the missing route files:
```bash
cd RevClear/backend
npm install
npm run dev
```
Server will run on: http://localhost:8080

**What's missing:** auth, encounters, ai, claims, feedback, and notifications routes  
**See:** `RevClear/backend/TODO.md` for details

### Running the Frontend (Web App)
```bash
cd RevClear/frontend
npm install
npm run dev
```
Web app runs on: http://localhost:3000

### Checking the Live Demo
Just visit: https://hpppm.github.io/revclear/

## Need Help?

- **Questions about the code?** Ask the team in our group chat
- **Found a bug?** Let everyone know so we can fix it together
- **Have an idea?** Share it! We're building this together

## Important Files & Folders

### Root Level Documentation
- **README.md** - Project overview, features, and quick start guide
- **TEAM_GUIDE.md** - This file! Team workflow and collaboration rules
- **GETTING_STARTED.md** - Detailed setup instructions for backend and frontend

### Backend (`RevClear/backend/`)
- **src/index.ts** - Main server entry point, starts Express server on port 8080
- **src/api/** - All API route handlers (patients, encounters, claims, auth)
- **src/middleware/** - Authentication, audit logging, security middleware
- **Documentation/** - Backend API documentation and architecture guides
- **package.json** - Backend dependencies (Express, Firebase Admin, TypeScript, etc.)
- **.env** - Environment variables (DATABASE_URL, FIREBASE_KEY, etc.) - **DO NOT COMMIT!**

### Frontend (`RevClear/frontend/`)
- **src/app/** - Next.js pages and routes (using App Router)
- **src/components/** - Reusable React components (buttons, forms, layouts)
- **src/lib/** - Utility functions and API client for backend communication
- **package.json** - Frontend dependencies (Next.js 16, React 19, TailwindCSS)
- **.env.local** - Frontend environment variables (API_URL, etc.) - **DO NOT COMMIT!**

### Demo (`Demo/`)
- **index.html** - Main demo page with interactive claims flow
- **script.js** - Demo logic and animations
- **style.css** - Demo styling
- **Live at**: https://hpppm.github.io/revclear/ (auto-deploys on push to main)

### AI Tools (`ai-mcp-server/`)
- **index.js** - MCP server with 8 AI-powered development tools
- **real-test.js** - Integration tests (GitHub API, Notion API, all tools)
- **README.md** - Complete documentation of all 8 tools and usage examples
- **Tools**: Code certification, security analysis, HIPAA compliance, implementation guides

### Future Documentation (`future-docs/`)
- **README.md** - Explains when to add each doc back to root
- **API.md** - Complete API reference (42 endpoints) - add when API is built
- **DEPLOYMENT.md** - Deployment guides (local, GCP, GitHub Pages) - add when deploying
- **SECURITY.md** - HIPAA compliance and security architecture - add when handling real data
- **Plus 6 more files** - All ready to use when needed!

---

## 📋 Quick Reference Card

### Ports & URLs
- **Backend API**: http://localhost:8080
- **Frontend App**: http://localhost:3000
- **Live Demo**: https://hpppm.github.io/revclear/

### Key Commands
```bash
# Get latest code
git pull origin main

# Run backend
cd RevClear/backend && npm run dev

# Run frontend  
cd RevClear/frontend && npm run dev

# Save your work
git add . && git commit -m "Your message" && git push origin main
```

### Who Owns What
- **Backend** (`RevClear/backend/`) → Rasmus (ask before editing)
- **Frontend** (`RevClear/frontend/`) → Narni (ask before editing)
- **Demo** (`Demo/`) → Aseel (anyone can suggest changes)
- **Docs** (Root `.md` files) → Aseel (anyone can suggest changes)

### Important Notes
- ⚠️ **Never commit .env files** (they contain secrets!)
- ⚠️ **Always pull before you start coding** (avoid conflicts)
- ⚠️ **Test your code before pushing** (keep main branch stable)
- ✅ **Backend runs on port 8080** (not 3001!)
- ✅ **Demo auto-deploys on every push to main**

---

**Remember:** We're all learning and building together. Don't be afraid to ask questions, make mistakes, and help each other out. That's how great teams work! 💪

Happy coding! 🎉
