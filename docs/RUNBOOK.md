# RevClear Operations Runbook

**Last Updated:** 2026-05-04

This runbook provides operational procedures for deploying, monitoring, and maintaining the RevClear platform.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Deployment Procedures](#deployment-procedures)
- [Monitoring & Alerts](#monitoring--alerts)
- [Common Issues & Fixes](#common-issues--fixes)
- [Rollback Procedures](#rollback-procedures)
- [Database Operations](#database-operations)
- [Security Incident Response](#security-incident-response)
- [Disaster Recovery](#disaster-recovery)

---

## Architecture Overview

### System Components

```
Browser
  │
  ▼
Cloudflare (DNS + CDN + TLS)
  │
  ▼
Railway — frontend service (Next.js, public)
  │  server-side proxy /api/* → backend.railway.internal
  ▼
Railway — backend service (Express, private, port 3005)
  │  ├── PostgreSQL (AWS RDS)
  │  ├── AWS S3 (audio / transcripts)
  │  ├── AWS Cognito (auth)
  │  ├── Pinecone (medical code vectors)
  │  └── Gemini / Groq (SOAP generation)
  │
  ▼
Railway — whisper service (Python, private, port 8000)
```

### Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| **Development** | Local development | `http://localhost:3000` |
| **Staging** | Pre-production testing | TBD |
| **Production** | Live environment | `https://revclear.tech` (app), `https://api.revclear.tech` (API) |

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] Build successful: `npm run build`
- [ ] Environment variables configured
- [ ] Database migrations ready (if applicable)
- [ ] Security review completed
- [ ] Secrets rotated (if compromised)
- [ ] Backup current production state

### Backend Deployment

#### Railway Production Layout

The current production target is:

- Frontend service on Railway, public
- Backend service on Railway, private
- Whisper service on Railway, private

The frontend serves the browser and proxies browser API traffic to the backend
over the Railway private network. The browser never reaches the backend or
Whisper directly.

Internal service traffic should stay private:

- Browser -> frontend public Railway domain
- Frontend -> backend over private Railway networking
- Backend -> Whisper over private Railway networking

Recommended env vars:

- Frontend:
  - `NEXT_PUBLIC_API_URL=/api`
  - `BACKEND_INTERNAL_URL=http://backend.railway.internal:3005/api`
- Backend:
  - `AI_TRANSCRIBE_URL=http://whisper.railway.internal:8000/transcribe`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL=gemini-2.5-flash`
  - `PINECONE_API_KEY`
  - `PINECONE_INDEX_HOST`
  - `PINECONE_NAMESPACE=medical-codes`
  - `AI_SERVER_API_KEY` (shared secret for Whisper, required if you enable Whisper auth)
- Whisper:
  - `PORT=8000`
  - `WHISPER_MODEL=base`
  - `WHISPER_DEVICE=cpu`
  - `WHISPER_COMPUTE_TYPE=int8`

Deployment notes:

- Railway service roots:
  - Frontend service root: `frontend`
  - Backend service root: `backend`
  - Whisper service root: `backend`
- The Whisper service reads `POST /transcribe` and `GET /health`
- The backend already sends `X-API-Key` when `AI_SERVER_API_KEY` is set
- The frontend should proxy `/api/*` server-side so cookies stay same-origin from the browser’s perspective
- Railway does not provide GPU instances, so Whisper is CPU-based in this setup

#### Cookie / Session Requirements

The backend issues httpOnly auth cookies with:

- `Secure=true` in production
- `SameSite=Strict` in production
- `Path=/`

Keeping the browser on the frontend public domain and proxying `/api` server-side
lets the app preserve the current cookie-based auth model without exposing the
backend hostname to the browser.

#### Manual Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
cd backend
npm ci  # Use ci for production (uses lock file)

# 3. Run database migrations (if any)
# npm run migrate  # (if migration script exists)

# 4. Build TypeScript
npm run build

# 5. Restart service
pm2 restart revclear-backend
# OR
systemctl restart revclear-backend
```

#### Docker Deployment

```bash
# 1. Export production env vars or use an env file managed by the server
set -a
source /opt/revclear/revclear.env
set +a

# 1a. Ensure the shared external network exists
docker network create revclear-shared || true

# 2. Build production images
docker compose -f docker-compose.prod.yml build

# 3. Start or update the stack
docker compose -f docker-compose.prod.yml up -d

# 4. Verify deployment
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f backend
```

Production compose expectations:

- Use `docker-compose.prod.yml`, not the root `docker-compose.yml` dev stack
- Do not bind-mount source code into containers
- Publish only Nginx on `80/443`
- Do not publish the frontend or backend ports publicly
- Inject secrets and environment variables from the server environment or a server-managed env file
- Route public traffic through the reverse proxy only

#### Railway Deployment

Deploy the frontend, backend, and Whisper as separate Railway services in the
same project. Redeploy from Railway after pushing to the connected branch, or
use the Railway CLI if you are managing deploys manually.

### Frontend Deployment

#### Railway Deployment (Frontend)

```bash
# Build locally
cd frontend
npm ci
npm run build

# Deploy through Railway or the Railway CLI
```

#### Self-Hosted Deployment

```bash
cd frontend
npm ci
npm run build
npm start

# Or with PM2
pm2 start npm --name "revclear-frontend" -- start
```

### Post-Deployment Verification

```bash
# 1. Health check
curl https://your-backend-url/api/health

# 2. Database connectivity
curl https://your-backend-url/api/health/db

# 3. Authentication
curl -H "Authorization: Bearer <token>" \
  https://your-backend-url/api/me

# 4. Critical endpoint test
curl https://your-backend-url/api/patients?limit=1

# 5. AI SOAP flow test
curl -X POST https://your-backend-url/api/encounters/<encounter-id>/soap \
  -H "Content-Type: application/json" \
  -b "<auth-cookie>"
```

---

## Monitoring & Alerts

### Health Checks

#### Application Health

```bash
# Backend health endpoint
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2026-01-22T10:00:00Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "s3": "accessible",
    "cognito": "reachable"
  }
}
```

#### Database Health

```bash
# Database connection check
GET /api/health/db

Response:
{
  "status": "ok",
  "database": "connected",
  "latency_ms": 5
}
```

### AWS CloudWatch Monitoring

#### Key Metrics to Monitor

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| **API Response Time** | > 1000ms | Warning |
| **API Response Time** | > 3000ms | Critical |
| **Error Rate** | > 1% | Warning |
| **Error Rate** | > 5% | Critical |
| **Database Connections** | > 80% max | Warning |
| **S3 Upload Failures** | > 0 | Critical |
| **Authentication Failures** | > 10/min | Warning |
| **CPU Usage** | > 80% | Warning |
| **Memory Usage** | > 90% | Critical |
| **Disk Space** | < 20% free | Warning |
| **Disk Space** | < 10% free | Critical |

#### CloudWatch Alarms

```bash
# Example: Create high error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name revclear-high-error-rate \
  --alarm-description "Alert when API error rate exceeds 5%" \
  --metric-name Errors \
  --namespace RevClear/API \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:revclear-alerts
```

### Log Monitoring

#### Backend Logs

```bash
# View recent logs
pm2 logs revclear-backend --lines 100

# Docker logs
docker-compose logs -f backend --tail=100

# AWS CloudWatch Logs
aws logs tail /aws/lambda/revclear-api --follow
```

#### Critical Log Patterns to Monitor

| Pattern | Severity | Action |
|---------|----------|--------|
| `PHI_ENCRYPTION_FAILED` | CRITICAL | Immediate investigation |
| `DATABASE_CONNECTION_LOST` | CRITICAL | Check RDS status |
| `AUTHENTICATION_BYPASS_ATTEMPT` | CRITICAL | Security review |
| `RATE_LIMIT_EXCEEDED` | WARNING | Review traffic patterns |
| `S3_UPLOAD_FAILED` | WARNING | Check S3 permissions |
| `AI_PROVIDER_ERROR` | WARNING | Check Gemini/Pinecone/Whisper status |

---

## Common Issues & Fixes

### Issue 1: Database Connection Failures

**Symptoms:**
- API returns 500 errors
- Logs show "Database connection lost"
- Health check fails

**Diagnosis:**
```bash
# Check database connectivity
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE

# Check RDS instance status (AWS)
aws rds describe-db-instances \
  --db-instance-identifier your-instance-id
```

**Fix:**
```bash
# 1. Verify environment variables
echo $DATABASE_URL

# 2. Check RDS security group allows connection
# 3. Verify RDS instance is running
# 4. Restart backend service
pm2 restart revclear-backend

# 5. If persistent, check connection pool settings
# in backend/src/config/database.ts
```

### Issue 2: S3 Upload Failures

**Symptoms:**
- Audio upload returns error
- Logs show "S3 upload failed"

**Diagnosis:**
```bash
# Check S3 bucket permissions
aws s3 ls s3://$AWS_S3_BUCKET

# Test upload
aws s3 cp test.txt s3://$AWS_S3_BUCKET/test.txt
```

**Fix:**
```bash
# 1. Verify IAM permissions for S3 access
# 2. Check S3 bucket policy
# 3. Verify encryption settings match code
# 4. Check bucket region matches AWS_REGION
```

### Issue 3: Authentication Failures

**Symptoms:**
- Users unable to login
- JWT token validation fails
- 401 errors on protected routes

**Diagnosis:**
```bash
# Check Cognito user pool status
aws cognito-idp describe-user-pool \
  --user-pool-id $AWS_COGNITO_USER_POOL_ID

# Verify JWT secret configuration
echo $JWT_SECRET  # Should be set
```

**Fix:**
```bash
# 1. Verify Cognito configuration
#    - User pool ID correct
#    - Client ID correct
#    - Region matches

# 2. Check token expiration settings

# 3. Verify middleware configuration
#    in backend/src/middleware/auth.ts

# 4. Clear user sessions if needed
```

### Issue 4: AI Provider Errors

**Symptoms:**
- SOAP note generation fails
- Logs show provider request errors

**Diagnosis:**
```bash
# Check Gemini and Pinecone configuration
echo $GEMINI_MODEL
echo $PINECONE_INDEX_HOST

# Check Whisper endpoint
curl $AI_TRANSCRIBE_URL/health
```

**Fix:**
```bash
# 1. Verify GEMINI_API_KEY and GEMINI_MODEL
# 2. Verify PINECONE_API_KEY and PINECONE_INDEX_HOST
# 3. Check Whisper service health and API key handling
# 4. Check /api/health/ai for detailed provider status
```

### Issue 5: High Memory Usage

**Symptoms:**
- Server becomes slow
- OOM (Out of Memory) errors
- Process restarts unexpectedly

**Diagnosis:**
```bash
# Check memory usage
pm2 monit

# Docker memory usage
docker stats

# Process memory
ps aux | grep node | sort -k4 -r
```

**Fix:**
```bash
# 1. Identify memory leaks
#    - Check for unclosed database connections
#    - Review large file processing

# 2. Increase Node.js memory limit
node --max-old-space-size=4096 dist/start.js

# 3. Optimize code
#    - Use streaming for large files
#    - Implement pagination
#    - Clear unnecessary caches

# 4. Scale horizontally if needed
```

### Issue 6: Rate Limiting Issues

**Symptoms:**
- Users receiving 429 errors
- Legitimate traffic blocked

**Diagnosis:**
```bash
# Check rate limit configuration
# in backend/src/middleware/rateLimiter.ts

# Review recent logs for rate limit hits
grep "Rate limit exceeded" logs/*.log
```

**Fix:**
```bash
# 1. Adjust rate limits if too restrictive
# 2. Implement user-specific rate limits
# 3. Whitelist trusted IPs if applicable
# 4. Consider Redis for distributed rate limiting
```

---

## Rollback Procedures

### Emergency Rollback

**When to rollback:**
- Critical bugs in production
- Security vulnerability discovered
- Data corruption detected
- Service unavailable

### Backend Rollback

```bash
# 1. Identify last working version
git log --oneline -10

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild and deploy
npm ci
npm run build
pm2 restart revclear-backend

# 4. Verify rollback successful
curl https://your-backend-url/api/health
```

### Database Rollback

```bash
# 1. Stop application
pm2 stop revclear-backend

# 2. Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_DATABASE \
  backup_file.dump

# 3. Verify data integrity
psql -h $DB_HOST -U $DB_USER -d $DB_DATABASE \
  -c "SELECT COUNT(*) FROM patients;"

# 4. Restart application
pm2 start revclear-backend
```

### Docker Rollback

```bash
# 1. List previous images
docker images | grep revclear

# 2. Tag specific version
docker tag revclear-backend:previous revclear-backend:latest

# 3. Restart with previous version
docker-compose up -d backend

# 4. Verify
docker-compose logs backend
```

---

## Database Operations

### Backup Procedures

#### Automated Backups (AWS RDS)

```bash
# Enable automated backups (done via AWS Console or Terraform)
aws rds modify-db-instance \
  --db-instance-identifier your-instance \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

#### Manual Backup

```bash
# PostgreSQL dump
pg_dump -h $DB_HOST -U $DB_USER -d $DB_DATABASE \
  -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Compress backup
gzip backup_*.dump

# Upload to S3
aws s3 cp backup_*.dump.gz s3://$BACKUP_BUCKET/db-backups/
```

### Database Migrations

```bash
# Run migration (if migration tool configured)
npm run migrate

# Rollback migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

### Database Maintenance

```bash
# Connect to database
psql -h $DB_HOST -U $DB_USER -d $DB_DATABASE

# Vacuum analyze (improves performance)
VACUUM ANALYZE;

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check slow queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 minute'
ORDER BY duration DESC;
```

---

## Security Incident Response

### Incident Response Plan

#### 1. Detection Phase

**Indicators of compromise:**
- Unusual authentication patterns
- Unauthorized API access
- Data exfiltration attempts
- PHI encryption failures

#### 2. Containment

```bash
# Immediately:
# 1. Disable compromised user accounts
aws cognito-idp admin-disable-user \
  --user-pool-id $AWS_USER_POOL_ID \
  --username <username>

# 2. Rotate compromised credentials
# - AWS access keys
# - Database passwords
# - API keys
# - JWT secrets

# 3. Enable additional logging
# 4. Block malicious IP addresses
```

#### 3. Investigation

```bash
# Review audit logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/revclear-api \
  --start-time <timestamp> \
  --filter-pattern "ERROR"

# Check S3 access logs
aws s3api get-bucket-logging \
  --bucket $AWS_S3_BUCKET

# Review CloudTrail events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=<user>
```

#### 4. Recovery

```bash
# 1. Deploy security patches
git pull origin security-patch
npm ci && npm run build
pm2 restart revclear-backend

# 2. Restore from clean backup if needed
# 3. Verify system integrity
# 4. Monitor for continued activity
```

#### 5. Post-Incident

- Document incident timeline
- Update security procedures
- Notify affected users (if PHI compromised)
- File required regulatory reports (HIPAA breach notification)

---

## Disaster Recovery

### Recovery Time Objective (RTO)

- **Backend API:** 1 hour
- **Database:** 30 minutes
- **File Storage (S3):** N/A (AWS handles)

### Recovery Point Objective (RPO)

- **Database:** 24 hours (daily backups)
- **File Storage:** Real-time (S3 versioning)

### DR Procedures

#### Total System Failure

```bash
# 1. Launch new EC2 instance / container
# 2. Restore code from git
git clone <repo-url>
cd revclear/backend

# 3. Configure environment variables
cp .env.example .env
# Edit with production values

# 4. Restore database from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier revclear-db-restored \
  --db-snapshot-identifier <snapshot-id>

# 5. Deploy application
npm ci
npm run build
pm2 start ecosystem.config.js

# 6. Update DNS if needed
# 7. Verify all services operational
```

#### Data Corruption

```bash
# 1. Identify corruption scope
# 2. Stop application
pm2 stop revclear-backend

# 3. Restore from last known good backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_DATABASE \
  --clean backup_<timestamp>.dump

# 4. Verify data integrity
# 5. Restart application
pm2 start revclear-backend
```

---

## Operational Contacts

### Escalation Path

| Level | Contact | Responsibility |
|-------|---------|----------------|
| **L1** | On-call Engineer | Initial response, basic troubleshooting |
| **L2** | Senior Engineer | Complex issues, database problems |
| **L3** | Lead Engineer | Architecture decisions, major incidents |
| **Management** | Engineering Manager | Business impact, external communication |

### Service Contacts

| Service | Contact | Notes |
|---------|---------|-------|
| **AWS Support** | AWS Console | Premium support plan |
| **Google AI/Gemini** | Google Cloud Support | API issues |
| **Database Admin** | Internal DBA | RDS optimization |

---

## Appendix

### Useful Commands

```bash
# View system status
pm2 status

# Monitor logs in real-time
pm2 logs --lines 50

# Restart all services
pm2 restart all

# Check environment variables
pm2 env 0

# Database connection test
psql -h $DB_HOST -U $DB_USER -d $DB_DATABASE -c "SELECT 1;"

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -n 1
```

### Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables |
| `backend/src/config/appConfig.ts` | Application configuration |
| `backend/src/middleware/rateLimiter.ts` | Rate limiting rules |
| `backend/docs/db/` | Database schema and migrations |
| `docker-compose.yml` | Docker service definitions |

---

**Last Review:** 2026-05-04
**Next Review:** 2026-08-04
**Owner:** DevOps Team
