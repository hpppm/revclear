# Tech Stack Scanner Skill

## Purpose
Generate comprehensive technology overview from project files.

## Files to Analyze
- `package.json` (all locations)
- `requirements.txt` / `pyproject.toml`
- `docker-compose.yml`
- `Dockerfile`
- `terraform/*.tf`
- `tsconfig.json`
- `.env.example`

## Categories to Report
1. **Frontend** - Framework, UI libs, state management
2. **Backend** - Runtime, framework, ORM
3. **Database** - SQL/NoSQL, migrations
4. **AI/ML** - Models, frameworks, APIs
5. **Cloud Services** - Provider, services used
6. **DevOps** - CI/CD, containers, IaC
7. **Security** - Auth, encryption, headers

## Output Format
Markdown tables grouped by category with version numbers