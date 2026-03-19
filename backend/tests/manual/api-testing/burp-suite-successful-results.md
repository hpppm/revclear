1. ### Endpoint Tested
POST /api/auth/signin

### Test
Removed access token from request.

### Result
Server returned 200 OK and issued a new access token.

### Explanation
This endpoint is a login endpoint and is expected to allow unauthenticated access.

### Security Impact
None – expected behavior.

2. ### Endpoint Tested
POST /api/auth/signin

### Test Description
Attempted login with a valid email but an empty password.

### Request Body
{
  "email": "walterwhite@localhost.dev",
  "password": ""
}

### Expected Result
Server should reject authentication attempt.

### Actual Result
HTTP/1.1 401 Unauthorized  
Response: "Invalid email or password."

### Status
PASS

3. ### Endpoint Tested
GET /api/patients

### Test Description
Authentication token was removed from the request.

### Expected Result
The server should deny access to protected patient data.

### Actual Result
HTTP/1.1 401 Unauthorized
Response: "Authentication required"

### Status
PASS

### Security Impact
The endpoint correctly enforces authentication before allowing access to patient data.

4. ### Endpoint Tested
GET /api/patients

### Test Description
Replaced the valid access token with a fake token.

### Request Modification
Cookie: accessToken=faketoken

### Expected Result
Server should reject the request.

### Actual Result
HTTP/1.1 401 Unauthorized  
Response: "Invalid token"

### Status
PASS

### Security Impact
The API correctly validates authentication tokens and prevents unauthorized access.

5. ### Endpoint Tested
GET /api/patients

### Test Description
Removed the refresh token while keeping a valid access token.

### Request Modification
Cookie: accessToken=<valid_token>

### Expected Result
Request should still succeed because refresh tokens are not required for normal API access.

### Actual Result
HTTP/1.1 200 OK  
Response returned patient data successfully.

### Status
PASS

### Security Impact
The API correctly authenticates requests using the access token without requiring the refresh token.

6. ### Endpoint Tested
GET /api/patients/{id}

### Test Description
Modified the request to access a patient ID that likely does not exist.

### Request
GET /api/patients/9999

### Expected Result
Server should reject the request.

### Actual Result
HTTP/1.1 400 Bad Request

### Status
PASS

### Security Impact
The API correctly validates input and does not return patient data for invalid identifiers.

7. ### Endpoint Tested
DELETE /api/patients

### Test Description
Modified the HTTP method from GET to DELETE to test if the API allows unauthorized deletion of patient data.

### Expected Result
The server should reject the request because the DELETE method is not supported.

### Actual Result
HTTP/1.1 404 Not Found

### Status
PASS

### Security Impact
The API correctly rejects unsupported HTTP methods and does not expose a deletion endpoint for patient records.

### Security Impact
The authentication system correctly prevents login attempts with missing credentials.

8. ### Endpoint Tested
GET /api/patients

### Test Description
Removed required HTTP request headers to send a malformed request.

### Expected Result
The server should reject the malformed request.

### Actual Result
HTTP/1.1 400 Bad Request returned.

### Status
PASS

### Security Impact
The server correctly validates request structure and rejects malformed requests, reducing the risk of request smuggling and parser attacks.

9. ### Endpoint Tested
POST /api/patients

### Test
Modified the `accessToken` cookie by replacing the valid token with an invalid or tampered token before forwarding the request.

### Result
Server returned 401 Unauthorized and did not process the patient creation request.

### Explanation
The API correctly detected that the provided authentication token was invalid. The request was rejected before the endpoint could process the patient data.

### Security Impact
None – Expected behavior. The API properly validates authentication tokens and prevents unauthorized access when a token has been tampered with.

### Status
Pass – Authentication validation is functioning correctly.

10. ### Endpoint Tested
PUT /api/patients

### Test
Modified the HTTP request method from `POST` to `PUT` when sending a request to the `/api/patients` endpoint in order to test whether the API improperly accepts unsupported HTTP methods.

### Result
Server returned 404 Not Found and did not process the request.

### Explanation
The API correctly rejected the request because the endpoint does not support the PUT method. Only the intended HTTP method (POST) is allowed for this route.

### Security Impact
None – The API correctly restricts unsupported HTTP methods and prevents unintended operations.

### Status
Pass – HTTP method restrictions are enforced correctly.

11. ### Endpoint Tested
POST /api/patients

### Test
Modified the `Content-Type` header from `application/json` to `text/plain` to test whether the API improperly accepts unsupported content types.

### Result
Server returned 401 Unauthorized and did not process the request.

### Explanation
The API rejected the request due to authentication enforcement. Although the content type was altered, the request was not processed because a valid authentication token was required.

### Security Impact
None – Authentication protections remain in place and prevent unauthorized requests from being processed.

### Status
Pass – Authentication enforcement prevented the request from being executed.

12. ### Endpoint Tested
POST /api/patients

### Test
Sent a request to the `/api/patients` endpoint without valid authentication credentials to verify whether the API properly enforces access control.

### Result
Server returned 401 Unauthorized and did not process the request.

### Explanation
The API correctly enforced authentication requirements and rejected the request because a valid access token was not provided or was invalid.

### Security Impact
None – Authentication enforcement prevents unauthorized users from accessing or modifying patient records.

### Status
Pass – Authentication controls are functioning correctly.
