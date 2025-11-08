# ChatGPT Context Template

Copy and paste this at the start of your ChatGPT conversations to give it full project context.

---

## RevClear Project Context

**Project**: AI-powered medical billing system for healthcare providers  
**GitHub**: https://github.com/YOUR_USERNAME/YOUR_REPO  
**Live Demo**: https://YOUR_USERNAME.github.io/YOUR_REPO/  
**Notion**: [Add your Notion workspace URL here]

### Current Status
- Phase: Initial development
- Team: 3 members (Security, Backend, Frontend)
- Branch: main (team collaboration)
- Last Update: [Add date]

### Architecture
```
RevClear/
├── backend/          # Node.js/Express API server
│   ├── src/api/     # API routes (auth, claims, analytics, etc.)
│   ├── src/middleware/  # Auth, audit, security
│   └── src/config/  # Database, Firebase, GCP
├── frontend/        # Next.js/React web app
│   ├── src/app/     # Pages and routes
│   ├── src/context/ # Auth and state management
│   └── src/lib/     # API client, Firebase
├── Demo/            # Static demo website
└── terraform/       # GCP infrastructure (feature branch)
```

### Team Roles
- **Security/Compliance** (Me): HIPAA compliance, auth security, policies, secrets management
- **Backend** (Rasmus): API endpoints, database, middleware, business logic
- **Frontend** (Nerni): UI components, pages, API integration, user experience

### Tech Stack
- **Backend**: Node.js, TypeScript, Express, PostgreSQL, Firebase
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Cloud**: Google Cloud Platform (Cloud Run, Cloud SQL, Vertex AI)
- **CI/CD**: GitHub Actions for automated deployment
- **Security**: HIPAA compliant, JWT auth, audit logging

### Current Sprint Goals
[Update from Notion - copy your current tasks here]

### Key Files to Know
- `RevClear/backend/src/index.ts` - Main server entry point
- `RevClear/backend/src/api/index.ts` - API route registration
- `RevClear/frontend/src/app/page.tsx` - Home page
- `Demo/index.html` - Public demo site
- `.github/workflows/deploy-demo.yml` - Auto-deployment

### Common Tasks
1. Add new API endpoint → Work in `backend/src/api/`
2. Create new page → Work in `frontend/src/app/`
3. Update demo → Edit `Demo/index.html`
4. Security review → Check auth middleware and .env files

### Workflow
```bash
# Before starting work
git pull origin main

# After making changes
git add .
git commit -m "brief description"
git push origin main

# Update Notion with progress
```

### Important Notes
- Main branch is for team collaboration (keep simple)
- feature/gcp-deployment has advanced infrastructure (keep separate)
- Always check .gitignore before committing
- Test locally before pushing
- Update Notion after significant changes

---

**How to use this context:**
1. Copy everything above
2. Paste at the start of your ChatGPT conversation
3. Update "Current Sprint Goals" from your Notion
4. Ask your question!

**Example:**
```
[Paste context above]

I need help implementing a new claims validation API endpoint. 
The endpoint should accept claim data, validate against insurance 
rules, and return validation results. Where should I start?
```
