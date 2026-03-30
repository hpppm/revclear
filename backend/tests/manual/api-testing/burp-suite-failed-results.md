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

2. ### Endpoint Tested
POST /api/patients

### Test
Modified the request body by removing the `full_name` field, resulting in an invalid or incomplete JSON payload.

### Result
Server returned 500 Internal Server Error with the response message "An unexpected error occurred".

### Explanation
The API failed to properly handle malformed input and returned a server error instead of validating the request and returning a client error. Proper input validation should reject invalid requests before they reach application logic.

### Security Impact
Medium – The server should return a 400 Bad Request response when required fields are missing or when JSON is malformed. Returning a 500 error indicates improper input validation and may expose backend instability.

3. ### Endpoint Tested
POST /api/patients

### Test
Attempted a SQL injection by inserting SQL control characters and a malicious payload into the `full_name` field:

`Jesse Pinkman'; DROP TABLE patients;--`

### Result
Server returned 500 Internal Server Error with the message "An unexpected error occurred".

### Explanation
The injected SQL characters caused the backend to throw an internal server error instead of safely rejecting the request. This indicates that input validation or query handling may not be properly sanitizing or parameterizing user input before it reaches the database layer.

### Security Impact
Medium – The application should return a 400 Bad Request or sanitize the input rather than triggering a server-side error. Improper handling of injection payloads may indicate potential SQL injection risk depending on how database queries are constructed.

### Status
Warning – Input validation or error handling is insufficient when malicious input is provided.

4. ### Endpoint Tested
POST /api/patients

### Test
Attempted a Cross-Site Scripting (XSS) injection by inserting a JavaScript payload into the `full_name` field:

`<script>alert('xss')</script>`

### Result
Server returned 201 Created and successfully processed the request, indicating that the payload was accepted by the API.

### Explanation
The API accepted the script input without sanitizing or validating the content. This means the malicious payload may be stored in the database. If this value is later rendered in the frontend without proper output encoding, the script could execute in a user's browser.

### Security Impact
High – This behavior may allow a stored Cross-Site Scripting (XSS) vulnerability if the input is later displayed in the user interface without proper escaping.

### Status
Fail – The API accepted potentially malicious script input without sanitization.

5. ### Endpoint Tested
POST /api/patients

### Test
Modified multiple fields in the request body to test input validation.  
Examples included inserting invalid data types and malformed values:

- `"phone": "DROP TABLE"` instead of a valid phone number
- `"insurance_member_id": true` instead of a numeric or string identifier

### Result
Server returned 201 Created and successfully processed the request.

### Explanation
The API accepted invalid input types and malformed values without validation. Fields that should require specific formats or data types were accepted without restriction.

### Security Impact
Medium – Lack of input validation may allow malformed or malicious data to be stored in the system. Weak validation can also increase the risk of injection attacks and database integrity issues.

### Status
Fail – Input validation is insufficient and allows invalid data types and formats.

6. ### Endpoint Tested
POST /api/patients

### Test
Submitted an oversized payload by inserting a very large string of characters into the `full_name` field to test input length validation and payload handling.

Example payload:
`"full_name": "AAAAAAAAAAAAAAAAAAAA...."`

### Result
Server returned 201 Created and successfully processed the request despite the extremely large input value.

### Explanation
The API accepted the oversized input without enforcing any length restrictions on the `full_name` field. Proper validation should limit the size of user inputs to prevent excessive resource usage or database storage issues.

### Security Impact
Medium – Lack of input length validation may allow attackers to send extremely large payloads that could lead to resource exhaustion, performance degradation, or denial-of-service conditions.

### Status
Fail – Input size restrictions are not enforced.

7. ### Endpoint Tested
POST /api/patients

### Test
Modified the `insurance_payer_id` parameter to an arbitrary value (`99999999`) to test whether the API properly validates identifier fields and prevents parameter tampering.

### Result
Server returned 500 Internal Server Error with the response message "An unexpected error occurred".

### Explanation
The API failed to properly validate the modified identifier value and triggered a server-side error. Instead of safely rejecting the request with a validation error, the backend attempted to process the invalid value and encountered an internal failure.

### Security Impact
Medium – Improper validation of identifier fields may allow parameter tampering or cause backend instability. The API should validate identifiers and return a 400 Bad Request response when invalid values are supplied.

### Status
Warning – Parameter validation is insufficient and causes a server error.

### Status
Warning – Input validation is insufficient and causes the server to throw an internal error.

8. ### Endpoint Tested
POST /api/patients

### Test
Sent a request to the `/api/patients` endpoint with an incomplete or missing request body to test whether the API validates required input fields before processing the request.

### Result
Server returned 201 Created and processed the request despite the request body being incomplete.

### Explanation
The API accepted the request without verifying that required patient data fields were present. Proper input validation should ensure that required fields such as `full_name`, `dob`, and other patient attributes are included before creating a record.

### Security Impact
Medium – Accepting incomplete requests may lead to corrupted or inconsistent data in the database. Proper validation should reject incomplete payloads with a `400 Bad Request` response.

### Status
Fail – Required field validation is not enforced.

12. ### Endpoint Tested
POST /api/patients

### Test
Modified the `Origin` header to `http://evil.com` to test whether the API improperly accepts requests from untrusted origins or if CORS protections are correctly enforced.

### Result
Server returned 500 Internal Server Error with the message "An unexpected error occurred".

### Explanation
The API failed to properly handle the modified Origin header and triggered an internal server error. Instead of crashing, the server should safely validate or ignore untrusted origins and continue processing the request according to CORS policies.

### Security Impact
Low – Although the request did not succeed, the server should not generate an internal error when receiving an unexpected Origin header. Improper handling of headers may indicate weak validation or error handling logic.

### Status
Warning – Origin validation handling caused a server error.
