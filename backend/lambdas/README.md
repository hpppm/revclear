# Lambda Functions

Template files for AWS Lambda functions. Each file contains:
- Function description
- Required environment variables
- Required IAM permissions
- AWS services to enable
- TODO comments for implementation

## Functions Overview

### Patient Management
- **getPatients.js** - List all patients for authenticated tenant

### Encounter Management
- **createEncounter.js** - Create new patient encounter

### Claims Processing
- **submitClaim.js** - Submit insurance claim

### AI Pipeline
- **transcribeAudio.js** - Convert audio to text (Transcribe Medical)
- **generateSummary.js** - Generate SOAP summary (Bedrock)
- **generateCPTcodes.js** - Predict ICD-10/CPT codes (Bedrock)
- **generateEDI.js** - Generate EDI 837 claim file
- **processWithBedrock.js** - Risk scoring and similarity search (Bedrock)

## Deployment

Each Lambda needs:
1. Environment variables from .env.example
2. Execution role with required permissions
3. API Gateway trigger
4. CloudWatch Logs enabled

## Dependencies

Install dependencies before deployment:
```bash
npm install
```

See package.json for required AWS SDK packages.
