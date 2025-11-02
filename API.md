# API Reference

Quick reference guide to RevClear's REST API endpoints.

> **📚 Full Documentation**: See [`RevClear/backend/Documentation/routes/API_ROUTES.md`](RevClear/backend/Documentation/routes/API_ROUTES.md) for complete API documentation.

---

## 🚀 Quick Start

### Base URL

**Production**: `https://api-backend-xxx.run.app/api` (Cloud Run)  
**Local Dev**: `http://localhost:8080/api`

### Authentication

All authenticated endpoints require a Firebase JWT token:

```bash
Authorization: Bearer <your_firebase_token>
```

---

## 📋 API Endpoints Overview

### 🔐 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/auth/register` | Register new clinician | ❌ |
| `POST` | `/auth/login` | Sign in with credentials | ❌ |
| `GET` | `/auth/me` | Get current user info | ✅ |
| `POST` | `/auth/logout` | End session | ✅ |

### 👥 Patients

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/patients` | List all patients | ✅ |
| `POST` | `/patients` | Create new patient | ✅ |
| `GET` | `/patients/:id` | Get patient details | ✅ |
| `PUT` | `/patients/:id` | Update patient info | ✅ |
| `DELETE` | `/patients/:id` | Delete patient | ✅ |

### 🏥 Encounters

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/encounters` | Start new encounter | ✅ |
| `GET` | `/encounters` | List encounters | ✅ |
| `GET` | `/encounters/:id` | Get encounter details | ✅ |
| `PUT` | `/encounters/:id` | Update SOAP notes | ✅ |
| `POST` | `/encounters/:id/audio` | Upload audio file | ✅ |
| `GET` | `/encounters/:id/ai-results` | Get AI analysis results | ✅ |
| `DELETE` | `/encounters/:id` | Delete encounter | ✅ |

### 🤖 AI Processing

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/ai/transcribe` | Convert audio to text | ✅ |
| `POST` | `/ai/generate-soap` | Generate SOAP note | ✅ |
| `POST` | `/ai/extract-codes` | Extract ICD-10/CPT codes | ✅ |
| `POST` | `/ai/generate-claim` | Generate claim from codes | ✅ |

### 💼 Claims

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/claims` | List all claims | ✅ |
| `POST` | `/claims` | Create new claim | ✅ |
| `GET` | `/claims/:id` | Get claim details | ✅ |
| `PUT` | `/claims/:id` | Update claim | ✅ |
| `POST` | `/claims/:id/submit` | Submit to clearinghouse | ✅ |
| `GET` | `/claims/:id/status` | Check submission status | ✅ |
| `DELETE` | `/claims/:id` | Delete claim | ✅ |

### 📝 Feedback

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/feedback` | Submit claim feedback | ✅ |
| `GET` | `/feedback` | List feedback entries | ✅ |
| `GET` | `/feedback/:id` | Get feedback details | ✅ |

### 🔔 Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/notifications` | List user notifications | ✅ |
| `PUT` | `/notifications/:id/read` | Mark as read | ✅ |
| `DELETE` | `/notifications/:id` | Delete notification | ✅ |

### 🧰 Utility

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/test` | Health check | ❌ |

---

## 📝 Example Requests

### Register User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinic.com",
    "password": "SecurePass123!",
    "full_name": "Dr. Jane Smith"
  }'
```

### Create Patient

```bash
curl -X POST http://localhost:8080/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "date_of_birth": "1980-05-15",
    "gender": "M",
    "email": "john.doe@email.com",
    "phone": "555-0123",
    "address": "123 Main St"
  }'
```

### Start Encounter

```bash
curl -X POST http://localhost:8080/api/encounters \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "patient-uuid-here",
    "date_of_service": "2025-10-23T15:00:00Z"
  }'
```

### Transcribe Audio

```bash
curl -X POST http://localhost:8080/api/ai/transcribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encounter_id": "encounter-uuid-here",
    "audio_url": "gs://bucket/audio.wav"
  }'
```

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field": "value"
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created |
| `400` | Bad Request | Invalid input |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Error | Server error |

---

## 🔒 Security

### Rate Limiting

- **Limit**: 1000 requests per minute per user
- **Response**: `429 Too Many Requests`

### CORS

- **Allowed Origins**: Configured frontend domains only
- **Methods**: `GET`, `POST`, `PUT`, `DELETE`
- **Headers**: `Authorization`, `Content-Type`

### Encryption

- **Transport**: TLS 1.3 (HTTPS only)
- **Data at Rest**: Cloud KMS encryption
- **Tokens**: JWT with 1-hour expiration

---

## 🧪 Testing

### Using cURL

```bash
# Set your token
TOKEN="your_firebase_token_here"

# Test endpoint
curl -X GET http://localhost:8080/api/patients \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman

1. Create new request
2. Set method and URL
3. Add header: `Authorization: Bearer <token>`
4. Add request body (for POST/PUT)
5. Send request

### Using JavaScript (Frontend)

```javascript
import { api, withAuth } from '@/lib/api';

// Authenticated request
const token = await getAuthToken();
const response = await withAuth(token).get('/patients');
console.log(response.data);
```

---

## 📚 Related Documentation

- **Full API Documentation**: [`RevClear/backend/Documentation/routes/API_ROUTES.md`](RevClear/backend/Documentation/routes/API_ROUTES.md)
- **Backend Architecture**: [`RevClear/backend/ARCHITECTURE.md`](RevClear/backend/ARCHITECTURE.md)
- **Security & HIPAA**: [`SECURITY.md`](SECURITY.md)
- **Deployment Guide**: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- **Developer Guide**: [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md)

---

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized**
- Check if token is valid and not expired
- Verify `Authorization: Bearer <token>` header format
- Ensure Firebase Auth is configured

**404 Not Found**
- Verify endpoint URL is correct
- Check if resource ID exists
- Confirm API base URL

**500 Internal Error**
- Check backend logs: `gcloud run services logs read api-backend`
- Verify database connection
- Check environment variables

---

## 📞 Support

- **API Issues**: Check logs in Cloud Run console
- **Authentication Issues**: Review Firebase Auth settings
- **Backend Code**: See `RevClear/backend/src/api/`
- **Questions**: Contact backend team (Rasmus)

---

**Base URL**: `http://localhost:8080/api` (development)  
**Version**: v1  
**Last Updated**: November 2, 2025
