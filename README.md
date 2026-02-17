# **RevClear**

AI-assisted medical claims and speech transcription platform for secure healthcare billing workflows.

---

## **Quick Start**

```bash
# Clone and setup
git clone <repo-url>
cd revclear

# Backend (port 3005)
cd backend && npm install && npm run dev

# Frontend (port 3000) - in another terminal
cd frontend && npm install && npm run dev

# Or use Docker for full stack
docker-compose up
```

See [docs/workflow/QUICK_START_GUIDE.md](docs/workflow/QUICK_START_GUIDE.md) for detailed setup.

---

## **Project Structure**

```
revclear/
├── backend/           # Express + TypeScript API
├── frontend/          # Next.js App Router
├── testing-dashboard/ # Reference AWS helper implementation
├── terraform/         # AWS Infrastructure as Code
├── Demo/              # Interactive workflow demo
├── docs/              # Project documentation
│   └── workflow/      # Development process guides
└── .github/agents/    # AI agent skills & prompts
```

---

## **Documentation**

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | AI assistant guidance |
| [COLLABORATOR_CONTRIBUTIONS.md](https://github.com/hpppm/revclear/blob/main/COLLABORATOR_CONTRIBUTIONS.md) | Detailed contributor vertical ownership and responsibilities |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [docs/](docs/) | Full documentation hub |
| [Backend Docs](backend/docs/) | API & database documentation |

---

## **Security Framework Baseline**

We apply part of the required controls from:  
- **HIPAA** – encrypted storage and protection of PHI/PII  
- **NIST CSF** – Protect, Detect, Respond, Recover across system lifecycle  
- **OWASP API Security** – secure API communication and prevent common API risks  


---

## **Platform Overview**

### 🔐 **Authentication**
- Amazon Cognito for secure user identity
- JWT-based API authentication

### 👤 **Access Control**
- IAM roles for tenant separation
- **RBAC currently enforced**  

### 🗄️ **Data Storage**
- Encrypted medical + billing data in **AWS RDS (PostgreSQL)**

### 📦 **File Storage**
- Encrypted transcripts and audio files in **Amazon S3**

### 🤖 **AI Processing**
- Local Whisper transcription (Python)
- Local Ollama inference by default (`http://localhost:11434`)
- Optional external AI endpoints via backend env configuration
- Restricted with encrypted data handling and vendor controls

### 🔍 **Audit Logging**
- System events logged through **AWS CloudTrail**
- API + middleware logs monitored via **AWS CloudWatch**

### 🔒 **Encryption**
- All data encrypted using **AWS KMS**
- RDS + S3 encrypted at rest (AES-256)

---

## **Environment Variables**

Required variables:
- `AWS_ACCOUNT_ID`
- `S3_MAIN_BUCKET`
- `COGNITO_USER_POOL_ID`
- `RDS_ENDPOINT` (PostgreSQL)
- `API_GATEWAY_ID`

See `.env.example` for full list.

---

## **License**

MIT License - see [LICENSE](LICENSE) for details.
