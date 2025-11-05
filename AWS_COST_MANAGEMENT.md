# RevClear AWS Cost Management Guide
# How to stay within $100/month budget

## 💰 Monthly Cost Breakdown

### FREE TIER (First 12 Months)
- ✅ **RDS db.t3.micro**: 750 hours/month = FREE
- ✅ **EC2 t2.micro**: 750 hours/month = FREE  
- ✅ **S3**: 5GB storage = FREE
- ✅ **Lambda**: 1M requests/month = FREE
- ✅ **CloudWatch**: 10 custom metrics = FREE
- ✅ **Cognito**: 50,000 MAU = FREE

### ALWAYS FREE
- ✅ **Cognito**: Up to 50K monthly active users
- ✅ **EventBridge**: Included
- ✅ **Systems Manager**: Included

### PAID SERVICES (Your Current Setup)

#### Essential Services (~$8/month)
```
RDS db.t3.micro (after free tier)  : $15/month → $0 (1st year)
S3 (50GB)                          : $1/month
CloudWatch (7-day logs)            : $1/month
Secrets Manager                    : $0.50/month
ECR (10GB)                         : $1/month
Lambda (100K invocations)          : $2/month
SQS (1M messages)                  : $0.50/month
SNS (1K emails)                    : $2/month
───────────────────────────────────────────
TOTAL (1st year):                    $8/month
TOTAL (after 1st year):              $23/month
```

#### AI Services (EXPENSIVE - Add Only When Ready)
```
⚠️ Transcribe Medical (1000 min)   : $25/month
⚠️ Comprehend Medical (10K units)  : $10/month
WAF                                 : $5/month
API Gateway (1M requests)           : $3.50/month
───────────────────────────────────────────
AI Services Total:                   $43.50/month
```

## 🎯 Budget Strategy for $100/month

### Phase 1: Development (Months 1-6) - ~$8/month
**Focus:** Build & test without AI

**Use:**
- ✅ RDS (FREE tier)
- ✅ S3 (minimal storage)
- ✅ Cognito (FREE)
- ✅ Lambda (FREE tier covers testing)
- ✅ Basic CloudWatch

**Don't Use Yet:**
- ❌ Transcribe Medical
- ❌ Comprehend Medical
- ❌ WAF
- ❌ API Gateway (use direct backend)

**Monthly Cost:** $8 (or $0 if using all free tier)

---

### Phase 2: Testing with AI (Months 7-9) - ~$50/month
**Focus:** Test AI features with limited usage

**Add:**
- ✅ Transcribe Medical (limit to 500 min/month = $12.50)
- ✅ Comprehend Medical (limit to 5K units = $5)
- ✅ API Gateway (for better throttling)

**Monthly Cost:** $50

**How to Limit AI Usage:**
```javascript
// In your backend code
const MAX_TRANSCRIBE_MINUTES_PER_MONTH = 500;
const MAX_COMPREHEND_UNITS_PER_MONTH = 5000;

// Track usage
let transcribeMinutesUsed = 0;
let comprehendUnitsUsed = 0;

// Check before processing
if (transcribeMinutesUsed >= MAX_TRANSCRIBE_MINUTES_PER_MONTH) {
    throw new Error('Monthly transcription limit reached. Upgrade plan.');
}
```

---

### Phase 3: Production (Month 10+) - ~$80-100/month
**Focus:** Full features, optimized

**Add:**
- ✅ WAF (security)
- ✅ More RDS storage as needed
- ✅ Increased AI limits

**Monthly Cost:** $80-100

---

## 🚨 Cost Alerts Setup

### Set Up Billing Alert
```powershell
# Alert at $80 (80% of budget)
aws cloudwatch put-metric-alarm `
    --alarm-name revclear-budget-80 `
    --alarm-description "Alert at 80% of budget" `
    --metric-name EstimatedCharges `
    --namespace AWS/Billing `
    --statistic Maximum `
    --period 21600 `
    --threshold 80 `
    --comparison-operator GreaterThanThreshold `
    --evaluation-periods 1 `
    --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:billing-alerts

# Alert at $95 (critical)
aws cloudwatch put-metric-alarm `
    --alarm-name revclear-budget-95-critical `
    --alarm-description "CRITICAL: Near budget limit" `
    --metric-name EstimatedCharges `
    --namespace AWS/Billing `
    --statistic Maximum `
    --period 21600 `
    --threshold 95 `
    --comparison-operator GreaterThanThreshold `
    --evaluation-periods 1 `
    --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:billing-alerts
```

### Check Current Costs
```powershell
# Current month cost
aws ce get-cost-and-usage `
    --time-period Start=2025-11-01,End=2025-11-30 `
    --granularity MONTHLY `
    --metrics BlendedCost `
    --group-by Type=SERVICE

# Cost by service (detailed)
aws ce get-cost-and-usage `
    --time-period Start=2025-11-01,End=2025-11-30 `
    --granularity DAILY `
    --metrics BlendedCost `
    --group-by Type=SERVICE
```

---

## 💡 Cost Optimization Tips

### 1. Use Free Tier Aggressively
```powershell
# Always use t3.micro for RDS (free tier)
--db-instance-class db.t3.micro

# Keep S3 under 5GB during development
# Use lifecycle policies to delete old files
```

### 2. Reduce CloudWatch Retention
```powershell
# 7 days instead of 30
--retention-in-days 7

# Delete old log groups
aws logs delete-log-group --log-group-name /old/logs
```

### 3. Limit AI Processing
```javascript
// Batch audio processing (cheaper)
// Instead of: 10 x 5-minute audios = 50 minutes
// Do: 1 x 50-minute batch = 50 minutes (but better compression)

// Cache AI results
const cache = {};
if (cache[audioHash]) {
    return cache[audioHash]; // Don't re-process
}
```

### 4. Use SQS for Rate Limiting
```javascript
// Queue AI requests and process slowly
// Spread 1000 minutes over 30 days instead of processing all at once
const MAX_DAILY_MINUTES = 33; // 1000 / 30
```

### 5. Delete Unused Resources
```powershell
# Stop RDS when not developing (saves money)
aws rds stop-db-instance --db-instance-identifier revclear-db-dev

# Delete old S3 objects
aws s3 rm s3://bucket-name/old-files/ --recursive

# Delete unused Lambda versions
aws lambda delete-function --function-name old-function
```

---

## 📊 Cost Tracking Spreadsheet

| Service | Free Tier | Development | Testing | Production |
|---------|-----------|-------------|---------|------------|
| RDS | $0 (750h) | $0 | $0 | $15 |
| S3 | $0 (5GB) | $1 | $1 | $2 |
| Lambda | $0 (1M) | $0 | $2 | $5 |
| Cognito | $0 (50K) | $0 | $0 | $0 |
| CloudWatch | $0 (10) | $1 | $2 | $5 |
| Secrets Mgr | - | $0.50 | $0.50 | $0.50 |
| ECR | - | $1 | $1 | $2 |
| SQS | $0 (1M) | $0 | $0.50 | $1 |
| SNS | - | $1 | $2 | $5 |
| Transcribe | - | ❌ | $12.50 | $25 |
| Comprehend | - | ❌ | $5 | $10 |
| WAF | - | ❌ | ❌ | $5 |
| API Gateway | - | ❌ | $3.50 | $3.50 |
| **TOTAL** | **$0** | **~$5** | **~$30** | **~$79** |

---

## 🎯 Variables to Control Costs

### In Setup Script (aws-setup-budget.ps1)
```powershell
# Change these to scale up/down
$DB_INSTANCE_CLASS = "db.t3.micro"  # Options: t3.micro (free), t3.small ($30/mo), t3.medium ($60/mo)
$DB_STORAGE = 20  # GB - keep at 20 for free tier
$LOG_RETENTION_DAYS = 7  # Options: 7 (cheap), 30 (medium), 365 (expensive)

# AI Limits (add these when you enable AI)
$MAX_TRANSCRIBE_MINUTES = 500  # Per month
$MAX_COMPREHEND_UNITS = 5000   # Per month
```

### In Backend Code (add to .env)
```env
# Cost Control
MAX_AUDIO_LENGTH_MINUTES=10
MAX_TRANSCRIBE_MONTHLY_MINUTES=500
MAX_COMPREHEND_MONTHLY_UNITS=5000
ENABLE_AI_PROCESSING=false  # Set to true only when ready

# Caching
CACHE_AI_RESULTS=true
CACHE_TTL_SECONDS=86400
```

---

## ⚠️ What Happens If You Change Variables?

### 1. Changing Project Name
```powershell
# OLD: $PROJECT_NAME = "revclear"
# NEW: $PROJECT_NAME = "revclear-v2"

# Impact: Creates NEW resources (doubles costs!)
# API: No impact (just update .env with new resource names)
```

**Solution:** Don't change project name after setup. If you must:
1. Delete old resources first
2. Update all .env files
3. Update API configurations

---

### 2. Changing Region
```powershell
# OLD: $REGION = "us-east-1"
# NEW: $REGION = "eu-west-1"

# Impact: Creates NEW resources in new region (doubles costs!)
# API: Data transfer between regions = EXPENSIVE ($0.02/GB)
```

**Solution:** Stick with one region. us-east-1 is cheapest.

---

### 3. Changing Database Instance
```powershell
# OLD: $DB_INSTANCE_CLASS = "db.t3.micro"  ($0 free tier)
# NEW: $DB_INSTANCE_CLASS = "db.t3.small"  ($30/month)

# Impact: +$30/month
# API: Faster performance, but may not need it yet
```

**Solution:** Stay on t3.micro during development. Upgrade only when you have >100 active users.

---

### 4. Changing Environment
```powershell
# OLD: $ENVIRONMENT = "dev"
# NEW: $ENVIRONMENT = "production"

# Impact: Creates SEPARATE resources (doubles costs!)
# API: Need separate .env files for each environment
```

**Solution:** Use ONE environment during development. Add production later when you have revenue.

---

## 🛡️ Emergency Cost Shutdown

If costs spike unexpectedly:

```powershell
# 1. Stop RDS immediately
aws rds stop-db-instance --db-instance-identifier revclear-db-dev

# 2. Disable Lambda functions
aws lambda update-function-configuration `
    --function-name revclear-transcribe-audio `
    --environment Variables={ENABLED=false}

# 3. Delete S3 files (keep backups)
aws s3 rm s3://revclear-storage-dev/audio/ --recursive

# 4. Check what's costing money
aws ce get-cost-and-usage `
    --time-period Start=2025-11-01,End=2025-11-30 `
    --granularity DAILY `
    --metrics BlendedCost `
    --group-by Type=SERVICE
```

---

## ✅ Recommended Approach for $100 Budget

### Months 1-6: Development (~$5-8/month)
- Use free tier only
- No AI services
- Manual SOAP notes (test workflow)
- Build all APIs

### Months 7-9: Limited AI Testing (~$30-50/month)
- Add Transcribe (limit 500 min/month)
- Add Comprehend (limit 5K units)
- Test with 10-20 real encounters
- Get feedback

### Months 10+: Production (~$80-100/month)
- Enable full AI
- Add WAF
- Add monitoring
- Scale as revenue grows

**Bottom Line:** You can build and test the entire system for ~$8/month for the first 6 months!

---

## 📞 Questions?

- **"What if I go over budget?"** Set billing alerts and stop services immediately
- **"Can I use AI for free?"** No, but you can limit usage to ~$10-15/month during testing
- **"What's the minimum cost?"** ~$8/month after free tier expires (can be $0 first year)
- **"When should I enable expensive services?"** Only after you have paying customers
