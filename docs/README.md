# RevClear Documentation

This folder contains all project documentation organized by category.

## Structure

```
docs/
├── README.md                    # This file - documentation index
├── workflow/                    # Development workflow & processes
│   ├── QUICK_START_GUIDE.md    # Git workflow & getting started
│   ├── TICKET_STRUCTURE.md     # How to create tickets
│   └── TICKET_EXAMPLES.md      # Example tickets & history
└── architecture/               # System architecture docs
    └── (see backend/docs/ for detailed architecture)
```

## Quick Links

### Workflow & Processes
- [Quick Start Guide](workflow/QUICK_START_GUIDE.md) - Git workflow, environment setup
- [Ticket Structure](workflow/TICKET_STRUCTURE.md) - How to write tickets
- [Ticket Examples](workflow/TICKET_EXAMPLES.md) - Historical tickets & examples

### Technical Documentation
- [Backend Docs](../backend/docs/) - API, database schemas, security
- [Frontend Docs](../frontend/documentation/) - API requests, implementation guides
- [Testing Dashboard](../testing-dashboard/DASH_WORKFLOW.md) - Dashboard workflow rules

### Root Documentation
- [README.md](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - AI assistant guidance
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG.md](../CHANGELOG.md) - Version history

## Component Documentation

Each component has its own detailed documentation:

| Component | Location | Purpose |
|-----------|----------|---------|
| Backend | `backend/docs/` | API specs, database schemas, security |
| Frontend | `frontend/documentation/` | Implementation guides |
| Testing Dashboard | `testing-dashboard/` | Reference implementation |
| Terraform | `terraform/` | Infrastructure as code |
| Demo | `Demo/` | Interactive workflow demo |

## AI Agents

See [.github/agents/](.github/agents/) for Copilot agent skills and prompts used for:
- Security auditing
- API inventory management
- Dead code detection
- Dependency analysis
- Tech stack scanning
