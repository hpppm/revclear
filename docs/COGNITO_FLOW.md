# Cognito Authentication Flow

## Architecture

```
User → Cognito User Pool → Identity Pool → IAM Role → AWS Resources
```

## Components

### User Pool
- **ID**: `us-east-1_NZCFuSv1l`
- **Purpose**: Manages user authentication
- **Features**: Email/password login, MFA (optional), password policies

### Identity Pool
- **ID**: `us-east-1:1d234050-e204-4a70-b4af-5930556b6957`
- **Purpose**: Exchanges JWT tokens for temporary AWS credentials
- **Provider**: `cognito-idp.us-east-1.amazonaws.com/us-east-1_NZCFuSv1l`

### App Client
- **ID**: `5g5qvrvd04h9suejmlie2rjncd`
- **Auth Flows**: USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH

## Step-by-Step Flow

### 1. User Login (Frontend)

```javascript
import { CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const authDetails = new AuthenticationDetails({
  Username: 'clinicianA@example.com',
  Password: 'password123',
});

const cognitoUser = new CognitoUser({
  Username: 'clinicianA@example.com',
  Pool: userPool,
});

cognitoUser.authenticateUser(authDetails, {
  onSuccess: (result) => {
    const idToken = result.getIdToken().getJwtToken();
    // Store token, redirect to app
  },
  onFailure: (err) => {
    console.error(err);
  },
});
```

### 2. JWT Token Structure

```json
{
  "sub": "uuid-user-id",
  "cognito:groups": ["Clinic_A"],
  "email": "clinicianA@example.com",
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_NZCFuSv1l",
  "cognito:username": "clinicianA@example.com",
  "aud": "5g5qvrvd04h9suejmlie2rjncd",
  "token_use": "id",
  "exp": 1700000000,
  "iat": 1699996400
}
```

### 3. Backend Token Verification

```javascript
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const verifier = CognitoJwtVerifier.create({
  userPoolId: 'us-east-1_NZCFuSv1l',
  tokenUse: 'id',
  clientId: '5g5qvrvd04h9suejmlie2rjncd',
});

const payload = await verifier.verify(token);
// payload contains cognito:groups, sub, email, etc.
```

### 4. Tenant Identification

```javascript
function getTenantFromToken(payload) {
  const groups = payload['cognito:groups'] || [];
  if (groups.includes('Clinic_A')) return 'A';
  if (groups.includes('Clinic_B')) return 'B';
  if (groups.includes('Clinic_C')) return 'C';
  throw new Error('No tenant group found');
}
```

### 5. Identity Pool Role Mapping

**Configuration**:
```json
{
  "Clinic_A": "arn:aws:iam::414669980881:role/ClinicARole",
  "Clinic_B": "arn:aws:iam::414669980881:role/ClinicBRole",
  "Clinic_C": "arn:aws:iam::414669980881:role/ClinicCRole"
}
```

**Process**:
1. Frontend exchanges JWT for AWS credentials via Identity Pool
2. Identity Pool checks `cognito:groups` claim
3. Maps group to IAM role
4. Returns temporary credentials (AccessKeyId, SecretKey, SessionToken)
5. Frontend uses credentials for direct AWS SDK calls (if needed)

### 6. API Request Flow

```
Frontend                Backend                  AWS
   |                       |                      |
   |-- POST /api/patients -|                      |
   |   Authorization:       |                      |
   |   Bearer <JWT>         |                      |
   |                        |                      |
   |                        |-- verify JWT ------->|
   |                        |   (Cognito)          |
   |                        |<----- valid ---------|
   |                        |                      |
   |                        |-- extract tenant     |
   |                        |   from cognito:groups|
   |                        |                      |
   |                        |-- query DynamoDB --->|
   |                        |   (mental_health_    |
   |                        |    patients)         |
   |                        |<----- data ----------|
   |                        |                      |
   |<-- 200 OK, patients ---|                      |
```

## Token Lifecycle

### Access Token
- **Expires**: 1 hour
- **Purpose**: API authentication
- **Refresh**: Use refresh token

### ID Token
- **Expires**: 1 hour
- **Purpose**: Contains user claims (groups, email)
- **Use**: Backend verification

### Refresh Token
- **Expires**: 30 days (default)
- **Purpose**: Get new access/ID tokens
- **Storage**: Secure, HttpOnly cookies (recommended)

## Security Considerations

1. **Token Storage**: Store in memory or HttpOnly cookies, never localStorage
2. **HTTPS Only**: All auth requests must use HTTPS
3. **Token Expiry**: Always check exp claim
4. **Signature Verification**: Backend must verify JWT signature
5. **Group Validation**: Always check cognito:groups before granting access

## Testing

### Get Token via AWS CLI
```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 5g5qvrvd04h9suejmlie2rjncd \
  --auth-parameters USERNAME=clinicianA@example.com,PASSWORD=YourPassword123! \
  --region us-east-1
```

### Verify Token
```bash
# Decode JWT (use jwt.io or jwt-cli)
jwt decode <JWT_TOKEN>

# Check signature
curl https://cognito-idp.us-east-1.amazonaws.com/us-east-1_NZCFuSv1l/.well-known/jwks.json
```

### Test API Call
```bash
curl http://localhost:8080/api/patients \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## Troubleshooting

**401 Unauthorized**:
- Check token expiry
- Verify user pool ID
- Confirm client ID

**403 Forbidden**:
- Check IAM role permissions
- Verify group membership
- Check CloudTrail for denied actions

**No tenant group**:
- User not assigned to any clinic group
- Add user to Clinic_A, Clinic_B, or Clinic_C
