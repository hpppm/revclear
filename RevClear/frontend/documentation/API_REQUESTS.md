# Frontend API Request Standards

This document outlines the standards and best practices for making API requests from the Next.js frontend to our Express backend. Adhering to these standards will ensure our code is consistent, maintainable, and easy to debug.

---

## 1. Core Principles

### Centralized API Client
All API requests (`fetch` calls) should be handled through a centralized API client service. Do not use `fetch` directly inside React components. This approach provides a single place to manage base URLs, headers, request/response logging, and error handling.

**Location:** `src/services/apiClient.ts` (or similar)

### Environment-Based URLs
The base URL for the API must not be hardcoded. It should be managed via an environment variable to support different environments (local development vs. deployed production).

- **Variable:** `NEXT_PUBLIC_API_URL`
- **Local Value:** `http://localhost:3005/api`
- **Production Value:** `https://your-production-alb-url.com/api`

### Comprehensive Error Handling
Every API call must be wrapped in a `try...catch` block to gracefully handle network errors, server errors (4xx/5xx status codes), and other exceptions. The centralized client should have a consistent way of reporting or throwing these errors so the UI can react appropriately (e.g., show an error message).

---

## 2. Naming Conventions

Function names for API calls should be clear, predictable, and follow a verb-noun pattern.

- **`get[Resource]`:** For fetching a list of resources.
  - `getPatients()`, `getClaims()`
- **`get[Resource]ById(id)`:** For fetching a single resource by its ID.
  - `getPatientById(patientId)`
- **`create[Resource](data)`:** For creating a new resource.
  - `createPatient(newPatientData)`
- **`update[Resource](id, data)`:** For updating an existing resource.
  - `updatePatient(patientId, patientUpdates)`
- **`delete[Resource](id)`:** For deleting a resource.
  - `deletePatient(patientId)`

---

## 3. Building a Request

### Request Structure
- **GET:** Used for retrieving data. Must not have a request body.
- **POST:** Used for creating new data. Data must be sent as a JSON object in the request body.
- **PUT / PATCH:** Used for updating existing data. Data must be sent as a JSON object in the request body.
- **DELETE:** Used for deleting data. Must not have a request body.

### Headers
- For all requests sending a body (`POST`, `PUT`, `PATCH`), the header `'Content-Type': 'application/json'` is mandatory.
- When authentication is implemented, an `Authorization` header should be included with the user's token (e.g., `'Authorization': 'Bearer YOUR_JWT_TOKEN'`).
- The centralized API client should handle setting these headers automatically.

---

## 4. Example API Client

Here is a basic example of what the centralized API service could look like.

**File:** `frontend/src/services/apiClient.ts`

```typescript
// The base URL for the backend API, sourced from environment variables.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

/**
 * A generic request handler to wrap all fetch calls.
 * @param endpoint - The API endpoint to call (e.g., '/patients').
 * @param options - Optional fetch options (method, body, custom headers).
 * @returns The JSON response from the API.
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  // Set default headers. The Authorization header can be added here.
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // If the response is not OK (e.g., 404, 500), throw an error.
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `API call failed with status: ${response.status}`);
    }
    
    // If the response is OK, parse and return the JSON.
    return await response.json();
  } catch (error) {
    console.error(`API Request Error: ${endpoint}`, error);
    // Re-throw the error so UI-level components can handle it.
    throw error;
  }
}

// --- Example Service Functions ---

interface Patient {
  id: string;
  name: string;
  // ... other patient properties
}

export const getPatients = (): Promise<Patient[]> => {
  return apiRequest<Patient[]>('/patients');
};

export const createPatient = (patientData: Omit<Patient, 'id'>): Promise<Patient> => {
  return apiRequest<Patient>('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
};
```
