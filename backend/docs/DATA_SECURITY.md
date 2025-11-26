# Data Security & HIPAA Compliance Strategy

## Overview
This document outlines the strategy for securing sensitive Protected Health Information (PHI) within the RevClear application to ensure HIPAA compliance. The strategy focuses on **Defense in Depth**, applying security measures at the application, database, and transport layers.

## 1. Data Classification
We identify the following data types as sensitive PHI requiring encryption:

| Data Type | Location | Sensitivity |
|-----------|----------|-------------|
| **Patient PII** | `patients` table (Name, SSN, DOB, Insurance ID) | **High** |
| **Transcripts** | `ai_results` table (`output_json`, `input_json`) | **High** |
| **SOAP Notes** | `ai_results` table (`output_json`) | **High** |
| **Medical Codes** | `medical_codes` table (`code`, `description`) | **Medium** |
| **Claims Data** | `claims` table (`diagnosis_codes`, `procedure_codes`) | **Medium** |
| **Audio Files** | AWS S3 Bucket | **High** |

## 2. Encryption Strategy

### 2.1. Encryption at Rest (Database)
We will implement **Application-Level Encryption** (Column-Level Encryption) with a self-managed envelope model. Data is encrypted *before* it is sent to the database and remains encrypted even if the database storage is compromised.

*   **Algorithm**: AES-256-GCM (authenticated encryption).
*   **Key hierarchy**:
    *   **KEK (Key Encryption Key)**: 256-bit, generated offline (e.g., `openssl rand -hex 32`), stored outside source control, loaded via env/secret mount at boot. Maintain a keyring (`key_id`, key material, state: active/previous).
    *   **DEK (Data Encryption Key)**: Generated per-row or per-sensitive-field group. Encrypt data with the DEK; encrypt the DEK with the active KEK. Store `encrypted_dek` + `dek_key_id` alongside ciphertext metadata.
*   **Rotation**:
    *   Rotate the KEK on a schedule (e.g., quarterly) and keep the previous KEK in the keyring for reads.
    *   Re-encrypt DEKs with the new KEK in a rolling job; mark active `dek_key_id` in ciphertext metadata to support dual-read during rollout.
*   **Implementation**:
    *   **Write**: Generate DEK -> encrypt plaintext with AES-256-GCM using random IV -> store `ciphertext`, `iv`, `auth_tag`, `encrypted_dek`, `dek_key_id`, and `encryption_version`.
    *   **Read**: Select the row -> decrypt `encrypted_dek` with the KEK from the keyring -> decrypt ciphertext -> return plaintext.
*   **Lookup support** (for equality queries like SSN/insurance): add a parallel column storing a keyed hash (HMAC-SHA-256) using a separate lookup key. Keep the PHI column probabilistically encrypted (GCM). Never index plaintext PHI.

#### Impacted Tables & Columns
*   **`patients`**: `first_name`, `last_name`, `dob`, `ssn`, `insurance_id`
*   **`ai_results`**: `input_json`, `output_json` (Entire JSON blobs encrypted as strings)
*   **`claims`**: `diagnosis_codes`, `procedure_codes` (Serialized arrays encrypted)
*   **`medical_codes`**: `code`, `description`

### 2.2. Encryption at Rest (Object Storage)
Audio recordings stored in object storage must be encrypted before upload.
*   **Mechanism**: Client-side AES-256-GCM with the same envelope approach (per-object DEK, KEK in the app). Store `iv`, `auth_tag`, `encrypted_dek`, and `dek_key_id` as object metadata.
*   **Policy**: Reject uploads missing encryption metadata. (If/when moving to AWS-managed keys, bucket policies can enforce SSE-KMS.)

### 2.3. Encryption in Transit
All data transmission must occur over secure channels.
*   **Client <-> Backend**: HTTPS (TLS 1.2+) is mandatory.
*   **Backend <-> Database**: Enforce SSL/TLS for the PostgreSQL connection.
    *   *Configuration*: Set `ssl: { rejectUnauthorized: true }` and pin the CA cert in the database connection pool.

## 3. Implementation Suggestions

### 3.1. Encryption Utility
Create a centralized utility in `backend/src/utils/encryption.ts` to handle all crypto operations and enforce consistent formats.

```typescript
// Conceptual implementation
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text: string, key: Buffer): string => {
  // Generate 12-byte random IV
  // Encrypt data
  // Return canonical format: base64(iv):base64(authTag):base64(ciphertext)
};

export const decrypt = (encryptedText: string, key: Buffer): string => {
  // Parse base64(iv), base64(authTag), base64(ciphertext)
  // Decrypt and verify authTag
  // Return plaintext
};

export const hmacHash = (text: string, lookupKey: Buffer): string => {
  // Return base64(HMAC-SHA-256(text, lookupKey)) for deterministic lookups
};
```

### 3.2. Database Query Wrappers
Modify the data access layer (DAL) to automatically handle encryption/decryption.

*   **Example (Writing)**:
    ```typescript
    const encryptedSSN = encrypt(patient.ssn, process.env.ENCRYPTION_KEY);
    await query('INSERT INTO patients (ssn) VALUES ($1)', [encryptedSSN]);
    ```

*   **Example (Reading)**:
    ```typescript
    const result = await query('SELECT ssn FROM patients WHERE id = $1', [id]);
    const decryptedSSN = decrypt(result.rows[0].ssn, process.env.ENCRYPTION_KEY);
    ```

### 3.3. Key Provider Abstraction
Introduce a `KeyProvider` interface to obtain the active KEK, decrypt `encrypted_dek`, and expose the keyring. Initial implementation reads KEKs from env/secret files. Future AWS KMS migration can plug in without changing call sites.

### 3.4. Logging & Backups
*   Avoid logging PHI; add redaction middleware and structured logging.
*   Ensure backups (DB snapshots, WAL, object copies) store the same ciphertext blobs; the KEK never leaves the app.

## 4. Audit & Access Control
*   **Audit Logs**: Maintain logs of who accessed what record and when (`audit.log` or database table).
*   **Least Privilege**: Ensure database users only have the permissions necessary for their role.
*   **BAA**: Ensure a Business Associate Agreement (BAA) is in place with all cloud providers (AWS, Google Cloud, etc.) handling PHI.

## 5. Migration Path to Managed KMS (Future)
*   Replace the local `KeyProvider` with a KMS-backed provider (e.g., AWS KMS) that wraps DEKs.
*   Run a re-wrapping job to re-encrypt existing `encrypted_dek` values with the KMS key; no data-plane change required because ciphertext format and DEK generation remain the same.
