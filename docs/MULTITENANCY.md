# Multi-Tenancy Architecture

## Overview

RevClear implements a **fully isolated multi-tenant architecture** where each clinic's data is completely separated at the infrastructure level.

## Tenant Model

### Three Clinics
- **Clinic A**: Mental Health (Tenant ID: A)
- **Clinic B**: Physical Therapy (Tenant ID: B)
- **Clinic C**: Speech Therapy (Tenant ID: C)

## Isolation Layers

### 1. Cognito Groups
Each user belongs to exactly one group:
- `Clinic_A`
- `Clinic_B`
- `Clinic_C`

### 2. IAM Roles
Each group maps to a dedicated IAM role:
- `ClinicARole` - ARN: `arn:aws:iam::414669980881:role/ClinicARole`
- `ClinicBRole` - ARN: `arn:aws:iam::414669980881:role/ClinicBRole`
- `ClinicCRole` - ARN: `arn:aws:iam::414669980881:role/ClinicCRole`

### 3. Database Isolation
Each tenant has a dedicated DynamoDB table:
- Clinic A → `mental_health_patients`
- Clinic B → `physical_therapy_patients`
- Clinic C → `speech_therapy_patients`

### 4. Storage Isolation
Each tenant has a dedicated S3 prefix:
- Clinic A → `arevclear/clinicA/*`
- Clinic B → `arevclear/clinicB/*`
- Clinic C → `arevclear/clinicC/*`

## Authentication Flow

```
1. User signs in with email/password
   ↓
2. Cognito validates credentials
   ↓
3. Cognito assigns user to group (Clinic_A, B, or C)
   ↓
4. JWT token issued with group membership
   ↓
5. Identity Pool exchanges JWT for AWS credentials
   ↓
6. IAM role assigned based on group
   ↓
7. User can only access their tenant's resources
```

## Authorization Flow

```
API Request:
  Authorization: Bearer <JWT_TOKEN>
  ↓
Backend verifies JWT with Cognito
  ↓
Extracts cognito:groups from token
  ↓
Determines tenant (A, B, or C)
  ↓
Routes to correct DynamoDB table
  ↓
Scopes S3 access to correct prefix
  ↓
Returns only tenant data
```

## Security Guarantees

1. **No Cross-Tenant Data Access**: IAM policies enforce table/prefix boundaries
2. **Audit Trail**: CloudTrail logs all data access with tenant context
3. **Encryption**: All data encrypted with KMS (at rest and in transit)
4. **Token Verification**: Every API call verifies JWT signature
5. **HIPAA Compliance**: All resources tagged with `HIPAA=enabled`

## Tenant Onboarding

To add a new clinic (Tenant D):

1. Create Cognito group `Clinic_D`
2. Create IAM role `ClinicDRole`
3. Add inline policy:
   - DynamoDB: `new_specialty_patients`
   - S3: `arevclear/clinicD/*`
4. Create DynamoDB table
5. Create S3 prefix
6. Add users to group
7. Test isolation

## Data Access Patterns

### Read Patient (Tenant A)
```javascript
const tenant = getTenantFromToken(jwtPayload); // "A"
const table = getTenantTable(tenant);          // "mental_health_patients"
const patients = await scanItems(table);       // Only Clinic A patients
```

### Upload File (Tenant B)
```javascript
const tenant = getTenantFromToken(jwtPayload); // "B"
const prefix = getTenantPrefix(tenant);         // "arevclear/clinicB/"
await uploadFile('arevclear', `${prefix}file.pdf`, data);
```

## Cost Model

Each tenant shares:
- Cognito User Pool
- Identity Pool
- S3 bucket
- CloudTrail

Each tenant has dedicated:
- DynamoDB table (pay-per-request)
- S3 prefix storage
- IAM role (no cost)

**Cost per tenant**: ~$10-15/month (at low volume)

## Compliance

- ✅ HIPAA-compliant infrastructure
- ✅ Data isolation enforced by IAM
- ✅ Audit logging via CloudTrail
- ✅ Encryption at rest (KMS)
- ✅ Encryption in transit (TLS)
- ✅ BAA signed with AWS

## Monitoring

Track per-tenant metrics:
- API request count
- DynamoDB reads/writes
- S3 storage used
- Error rate
- Response time
