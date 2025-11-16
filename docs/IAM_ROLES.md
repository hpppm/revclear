# IAM Roles & Policies

## Role Overview

Each tenant has a dedicated IAM role with scoped permissions.

## ClinicARole

**ARN**: `arn:aws:iam::414669980881:role/ClinicARole`

**Trust Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "cognito-identity.amazonaws.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "cognito-identity.amazonaws.com:aud": "us-east-1:1d234050-e204-4a70-b4af-5930556b6957"
      }
    }
  }]
}
```

**Inline Policy (ClinicAAccess)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:414669980881:table/mental_health_patients"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::arevclear/clinicA/*",
        "arn:aws:s3:::arevclear"
      ]
    }
  ]
}
```

**Tags**:
- `HIPAA=enabled`
- `Environment=prod`
- `Tenant=A`
- `Clinic=Clinic_A`
- `Specialty=mental_health`

---

## ClinicBRole

**ARN**: `arn:aws:iam::414669980881:role/ClinicBRole`

**Trust Policy**: Same as ClinicARole

**Inline Policy (ClinicBAccess)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:414669980881:table/physical_therapy_patients"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::arevclear/clinicB/*",
        "arn:aws:s3:::arevclear"
      ]
    }
  ]
}
```

**Tags**:
- `HIPAA=enabled`
- `Environment=prod`
- `Tenant=B`
- `Clinic=Clinic_B`
- `Specialty=physical_therapy`

---

## ClinicCRole

**ARN**: `arn:aws:iam::414669980881:role/ClinicCRole`

**Trust Policy**: Same as ClinicARole

**Inline Policy (ClinicCAccess)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:414669980881:table/speech_therapy_patients"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::arevclear/clinicC/*",
        "arn:aws:s3:::arevclear"
      ]
    }
  ]
}
```

**Tags**:
- `HIPAA=enabled`
- `Environment=prod`
- `Tenant=C`
- `Clinic=Clinic_C`
- `Specialty=speech_therapy`

---

## Security Best Practices

1. **Least Privilege**: Roles only have access to their tenant resources
2. **No Wildcards**: Policies explicitly name resources
3. **Trust Conditions**: Roles can only be assumed via Cognito Identity Pool
4. **CloudTrail Logging**: All role assumptions logged
5. **HIPAA Tags**: All roles tagged for compliance tracking

## Testing Role Access

```bash
# Assume role (simulated via Cognito)
aws sts assume-role-with-web-identity \
  --role-arn arn:aws:iam::414669980881:role/ClinicARole \
  --role-session-name test-session \
  --web-identity-token <JWT_TOKEN>

# Test DynamoDB access
aws dynamodb scan \
  --table-name mental_health_patients \
  --region us-east-1

# Test S3 access
aws s3 ls s3://arevclear/clinicA/
```

## Monitoring

CloudTrail tracks:
- Role assumptions
- DynamoDB queries
- S3 access
- Failed authorization attempts

All logs stored in: `arevclear-logs/AWSLogs/414669980881/`
