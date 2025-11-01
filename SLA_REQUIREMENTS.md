# 📈 RevClear Service Level Agreement (SLA) Requirements

## 🎯 Production SLA Target

**Uptime Commitment:** 99% monthly uptime  
**Allowed Downtime:** 7.3 hours per month (7 hours 18 minutes)  
**Measurement Period:** Calendar month (00:00 UTC first day → 23:59 UTC last day)

**Coverage:**
- ✅ API availability (all `/api/v1/*` endpoints)
- ✅ Frontend availability (web app loading)
- ✅ Authentication services (SSO + MFA)
- ✅ Core workflow completion (upload → transcription → coding → submission)

**Exclusions:**
- ❌ Scheduled maintenance (with 48-hour notice)
- ❌ Force majeure events
- ❌ Third-party service outages (clearinghouse, OpenAI)
- ❌ Client-side issues (internet connectivity, browser compatibility)

---

## 🏗️ Implementation Strategy

### 1. Multi-Region Deployment

#### Cloud Run (API Backend)
```bash
# Primary region
gcloud run deploy backend \
  --region=us-central1 \
  --platform=managed \
  --min-instances=1 \
  --max-instances=10

# Secondary region (failover)
gcloud run deploy backend \
  --region=us-east1 \
  --platform=managed \
  --min-instances=1 \
  --max-instances=10
```

**Traffic Split:**
- 90% → us-central1 (primary)
- 10% → us-east1 (secondary/testing)
- Automatic failover if primary region unavailable

#### Cloud SQL (Database)
```bash
gcloud sql instances create medical-db \
  --database-version=POSTGRES_14 \
  --tier=db-n1-standard-2 \
  --region=us-central1 \
  --availability-type=REGIONAL \  # Automatic failover to zone B
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery \
  --retained-backups-count=30
```

**HA Configuration:**
- Regional HA: Primary zone + standby zone (automatic failover)
- RPO: < 1 minute (point-in-time recovery)
- RTO: < 5 minutes (automatic failover)

### 2. Health Check Endpoints

#### Backend Health Check
```typescript
// RevClear/backend/src/api/health/index.ts
import { Router, Request, Response } from 'express';
import { pool } from '../../config/cloudSql';

const router = Router();

// Shallow health check (no dependencies)
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'revclear-backend'
  });
});

// Deep health check (checks all dependencies)
router.get('/health/ready', async (req: Request, res: Response) => {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    vertexAi: await checkVertexAI(),
    secretManager: await checkSecretManager()
  };

  const allHealthy = Object.values(checks).every(c => c.healthy);
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks
  });
});

async function checkDatabase(): Promise<{ healthy: boolean; latency?: number }> {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false };
  }
}

async function checkStorage(): Promise<{ healthy: boolean }> {
  // Check Cloud Storage bucket access
  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage();
    await storage.bucket(process.env.AUDIO_BUCKET!).exists();
    return { healthy: true };
  } catch {
    return { healthy: false };
  }
}

async function checkVertexAI(): Promise<{ healthy: boolean }> {
  // Check Vertex AI endpoint availability
  return { healthy: true }; // Simplified for now
}

async function checkSecretManager(): Promise<{ healthy: boolean }> {
  // Check Secret Manager access
  return { healthy: true }; // Simplified for now
}

export default router;
```

**Health Check Schedule:**
- `/health`: Every 10 seconds (lightweight)
- `/health/ready`: Every 30 seconds (full dependency check)
- Timeout: 5 seconds
- Failure threshold: 3 consecutive failures = unhealthy

### 3. Load Balancer Configuration

```bash
# Create HTTP(S) Load Balancer
gcloud compute url-maps create revclear-lb \
  --default-service=backend-neg-us-central1

# Add backend services
gcloud compute backend-services create backend-primary \
  --protocol=HTTPS \
  --health-checks=backend-health-check \
  --global

# Configure health check
gcloud compute health-checks create https backend-health-check \
  --request-path=/health \
  --port=443 \
  --check-interval=10s \
  --timeout=5s \
  --unhealthy-threshold=3 \
  --healthy-threshold=2
```

---

## 📊 Monitoring & Alerting

### 1. Uptime Monitoring

#### Cloud Monitoring Uptime Checks
```yaml
# terraform/monitoring.tf
resource "google_monitoring_uptime_check_config" "backend_uptime" {
  display_name = "RevClear Backend Uptime"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/health"
    port           = "443"
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      host = "api.revclear.com"
    }
  }
}

resource "google_monitoring_alert_policy" "uptime_alert" {
  display_name = "Backend Uptime < 99%"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failed"
    
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" resource.type=\"uptime_url\""
      duration        = "300s"
      comparison      = "COMPARISON_LT"
      threshold_value = 0.99
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_FRACTION_TRUE"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.id,
    google_monitoring_notification_channel.email.id
  ]

  alert_strategy {
    auto_close = "1800s"
  }
}
```

### 2. Error Budget Tracking

**Monthly Error Budget:**
- Total minutes in month: ~43,200 minutes
- 99% uptime = 432 minutes allowed downtime (7.3 hours)
- Error budget = 1% = 432 minutes

**Calculation:**
```
Error Budget Remaining = 1 - (Actual Downtime / Total Allowed Downtime)
                      = 1 - (Actual Downtime / 432 minutes)
```

**Example:**
- If 100 minutes downtime this month:
  - Error budget remaining: 1 - (100/432) = 76.9%
  - Status: 🟢 HEALTHY (>50% remaining)

**Thresholds:**
- 🟢 >50% remaining: No action needed
- 🟡 25-50% remaining: Review incidents, increase monitoring
- 🔴 <25% remaining: Freeze non-critical deployments
- ⛔ 0% remaining: SLA breach, root cause analysis required

### 3. Alerting Channels

```hcl
# terraform/monitoring.tf
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty"
  type         = "pagerduty"
  
  labels = {
    service_key = var.pagerduty_service_key
  }
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Ops Team Email"
  type         = "email"
  
  labels = {
    email_address = "ops@revclear.com"
  }
}

resource "google_monitoring_notification_channel" "slack" {
  display_name = "Slack #incidents"
  type         = "slack"
  
  labels = {
    channel_name = "#incidents"
    url          = var.slack_webhook_url
  }
}
```

**Alert Severity:**
- 🔴 **P1 (Critical)**: Service completely down → PagerDuty + Slack
- 🟠 **P2 (High)**: Degraded performance, >5% error rate → Slack + Email
- 🟡 **P3 (Medium)**: Single component failing → Email only
- 🔵 **P4 (Low)**: Warning thresholds exceeded → Dashboard only

---

## 📈 SLA Metrics Dashboard

### Key Performance Indicators (KPIs)

| Metric | Target | Measurement | Alert Threshold |
|--------|--------|-------------|-----------------|
| **Uptime** | 99% | `(Total time - Downtime) / Total time` | <99% |
| **API Latency (P95)** | <500ms | 95th percentile response time | >1000ms |
| **API Error Rate** | <1% | `5xx errors / total requests` | >2% |
| **Database Latency (P95)** | <100ms | Query execution time | >200ms |
| **HITL Gate Response Time** | <2 hours | Time to human review | >4 hours |
| **Claim Processing Success** | >95% | Successful submissions / total | <90% |
| **Time to First Byte (TTFB)** | <300ms | Frontend load performance | >600ms |

### Looker Studio Dashboard

**Sections:**
1. **Availability Overview** (top)
   - Current uptime % (this month)
   - Error budget remaining (gauge)
   - Incident count this month
   - Mean Time to Recovery (MTTR)

2. **Performance Metrics**
   - API latency (P50, P95, P99) - line chart
   - Error rate (5xx) - area chart
   - Request volume - bar chart
   - Database query performance - histogram

3. **Business Metrics**
   - Claims processed today/week/month
   - Average claim processing time
   - HITL gate wait times
   - Denial rate by payer

4. **Incident Timeline**
   - Recent incidents (last 30 days)
   - Root cause categories (pie chart)
   - MTTR trend over time

**Access:**
```
https://lookerstudio.google.com/reporting/revclear-sla-dashboard
Shared with: ops@revclear.com, leadership@revclear.com
Update frequency: Real-time (1-minute refresh)
```

---

## 🚨 Incident Response

### Response Times

| Severity | Response Time | Resolution Target | Escalation |
|----------|--------------|-------------------|------------|
| **P1 - Critical** | 15 minutes | 4 hours | Immediate C-level notification |
| **P2 - High** | 1 hour | 24 hours | CTO notification after 12 hours |
| **P3 - Medium** | 4 hours | 1 week | Engineering lead notification |
| **P4 - Low** | Next business day | 2 weeks | Backlog review |

### Incident Workflow

1. **Detection** (automated or manual report)
   - Cloud Monitoring alert fires
   - PagerDuty page sent to on-call engineer
   - Slack notification posted

2. **Acknowledgment** (<15 minutes for P1)
   - On-call engineer acknowledges in PagerDuty
   - Creates incident in Jira/Linear
   - Posts status update in Slack #incidents

3. **Triage** (<30 minutes for P1)
   - Assess severity
   - Identify affected services
   - Begin mitigation

4. **Mitigation** (<4 hours for P1)
   - Apply temporary fix (rollback, traffic reroute, etc.)
   - Restore service to operational state
   - Monitor for stability

5. **Resolution** (varies by severity)
   - Implement permanent fix
   - Deploy to production
   - Verify resolution with monitoring

6. **Post-Mortem** (within 72 hours for P1/P2)
   - Root cause analysis
   - Timeline of events
   - Action items to prevent recurrence
   - Share with team

### Rollback Procedures

**Cloud Run Rollback:**
```bash
# List revisions
gcloud run revisions list --service=backend --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic backend \
  --to-revisions=backend-00042-abc=100 \
  --region=us-central1

# Time to rollback: ~30 seconds
```

**Database Rollback:**
```bash
# Restore from point-in-time backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=medical-db \
  --backup-instance-region=us-central1

# Time to restore: 5-15 minutes (depending on size)
```

---

## 📋 Monthly SLA Reporting

### Report Template

**RevClear Monthly SLA Report - [Month Year]**

**1. Executive Summary**
- Uptime achieved: X.XX%
- SLA met: ✅ YES / ❌ NO
- Total incidents: X
- Mean Time to Recovery (MTTR): X minutes

**2. Uptime Metrics**
- Total uptime: X hours Y minutes
- Total downtime: X hours Y minutes
- Error budget used: X%
- Error budget remaining: X%

**3. Incident Summary**
| Date | Severity | Duration | Root Cause | Resolution |
|------|----------|----------|------------|------------|
| 2025-11-05 | P2 | 23 min | Database connection pool exhaustion | Increased max connections |

**4. Performance Trends**
- API latency P95: Xms (target: <500ms)
- Error rate: X% (target: <1%)
- Database latency P95: Xms (target: <100ms)

**5. Action Items for Next Month**
- [ ] Implement connection pool monitoring
- [ ] Add caching for frequently accessed data
- [ ] Schedule load testing

**Distribution:**
- CEO, CTO, VP Engineering
- Customer Success team (for proactive communication)
- Posted to company wiki

---

## 🔄 Continuous Improvement

### SLA Review Cadence

**Weekly:**
- Review current month's uptime
- Check error budget consumption rate
- Triage any new incidents

**Monthly:**
- Generate SLA report
- Review incident patterns
- Update runbooks based on new issues
- Adjust monitoring/alerting thresholds

**Quarterly:**
- Evaluate if 99% is appropriate (consider 99.5% or 99.9%)
- Analyze MTTR trends
- Load testing and chaos engineering
- Disaster recovery drills

### Improvement Metrics

**Track Quarter-over-Quarter:**
- MTTR reduction (target: -10% QoQ)
- Incident count reduction (target: -15% QoQ)
- Error budget utilization (target: <50% used)
- Customer-reported incidents (target: 0)

---

## 💰 SLA Breach Consequences

**Internal:**
- Root cause analysis (RCA) required within 72 hours
- Present RCA to executive team
- Freeze non-critical feature work until resolved
- Update runbooks and monitoring

**External (if applicable to customer contracts):**
- Service credits: 10% monthly fee for 99% breach
- Notification to affected customers within 24 hours
- Transparency report published
- Scheduled follow-up call with customers

---

## ✅ Pre-Production SLA Checklist

Before going live with 99% SLA commitment:

- [ ] Multi-region deployment configured (us-central1 + us-east1)
- [ ] Regional HA enabled for Cloud SQL
- [ ] Health check endpoints implemented (`/health`, `/health/ready`)
- [ ] Load balancer with health checks configured
- [ ] Uptime monitoring checks configured (1-minute intervals)
- [ ] Error budget tracking dashboard created
- [ ] PagerDuty integration configured
- [ ] Incident response runbooks documented
- [ ] On-call rotation schedule established (24/7 coverage)
- [ ] Rollback procedures tested
- [ ] Disaster recovery plan documented and tested
- [ ] Monthly SLA reporting process established
- [ ] Customer communication plan for outages
- [ ] Load testing completed (2x expected peak traffic)
- [ ] Chaos engineering baseline established

---

## 📚 References

- [Google Cloud SLA for Cloud Run](https://cloud.google.com/run/sla)
- [Google Cloud SLA for Cloud SQL](https://cloud.google.com/sql/sla)
- [Site Reliability Engineering (SRE) Book](https://sre.google/books/)
- [Uptime Calculator](https://uptime.is/99)

**Last Updated:** November 1, 2025  
**Owner:** VP Engineering / SRE Team  
**Review Schedule:** Quarterly
