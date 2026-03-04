1. ### Endpoint Tested
POST /api/patients

### Test
Removed access token from the request by deleting the `accessToken` cookie in the request header.

### Result
Server returned 400 Bad Request and did not process the patient creation request.

### Explanation
The endpoint rejected the request when the authentication token was missing, indicating that authentication is required before the request can be processed. The API did not allow the operation without a valid token.

### Security Impact
Low – Authentication enforcement appears to be functioning correctly, though the API returned `400 Bad Request` instead of the more appropriate `401 Unauthorized` response.

