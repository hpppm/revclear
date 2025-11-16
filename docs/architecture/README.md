# Architecture Documentation

## Deployed Infrastructure

**Multi-Tenant Auth**
- Cognito User Pool: `us-east-1_NZCFuSv1l`
- Identity Pool: `us-east-1:1d234050-e204-4a70-b4af-5930556b6957`
- IAM Roles: ClinicARole, ClinicBRole, ClinicCRole

**Data Layer**
- DynamoDB: 3 tenant-isolated tables
- S3: `arevclear` bucket with tenant folders (/clinicA, /clinicB, /clinicC)
- KMS: AES-256 encryption
- CloudTrail: Full audit logging

**Application** (Planned)
- Frontend: React on CloudFront + S3
- Backend: API Gateway + Lambda

## Diagrams

- `1_ARCHITECTURE_OVERVIEW.puml` - Full system architecture
- `2_STRIDE_THREATS.puml` - Security threat analysis
- `3_SECURITY_CONTROLS.puml` - Security controls mapping
- `THREAT_MODEL.md` - STRIDE methodology details

## Tenant Isolation

Each clinic has dedicated:
- Cognito group membership
- IAM role with scoped policies
- DynamoDB table (mental_health, physical_therapy, speech_therapy)
- S3 folder path

**Cost**: ~$35/month right now
