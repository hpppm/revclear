# Branch Strategy

## ⚠️ IMPORTANT: Branch Independence

### `main` Branch
- **Purpose**: Team development (Week 1-2 work)
- **Content**: Backend/frontend skeleton, documentation, team workflow
- **Team**: Rasmus (backend), Narni (frontend), Brendan (TBD)
- **Status**: Active development

### `feature/gcp-deployment` Branch
- **Purpose**: Production GCP HIPAA deployment infrastructure
- **Content**: Complete Terraform configs, deployment scripts, compliance docs
- **Status**: Ready for production deployment (35 commits, fully validated)

## 🚫 DO NOT MERGE

**`feature/gcp-deployment` MUST NOT be merged into `main`**

**Reasons:**
1. ✅ Contains production infrastructure (Terraform, GCP configs)
2. ✅ Different purpose - deployment vs. development
3. ✅ Would create merge conflicts with main's documentation
4. ✅ Keep infrastructure separate from application code

## ✅ When to Use Each Branch

### Use `main` for:
- Backend API development (Rasmus)
- Frontend UI development (Narni)
- Team collaboration and features
- Documentation updates

### Use `feature/gcp-deployment` for:
- Deploying to GCP Cloud Run
- Updating Terraform infrastructure
- HIPAA compliance configurations
- Production deployment scripts

## 🔒 Protection Rules

Branch protection is enabled on `main` to prevent accidental merges from `feature/gcp-deployment`.

**If you need to deploy:**
1. Switch to `feature/gcp-deployment` branch
2. Run deployment scripts from that branch
3. Never merge it into `main`

---

**Last Updated**: November 2, 2025  
**Branch Owner**: Aseel (hpppm)
