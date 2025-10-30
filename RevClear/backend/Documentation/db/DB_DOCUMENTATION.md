# 🧱 DB Documentation V1

## Developer Guide — Cloud SQL (PostgreSQL) Database for the AI-Powered Medical Billing System

### 🩺 1. Overview

The system’s backend database is implemented using **Cloud SQL for PostgreSQL**, provisioned within a private HIPAA-compliant VPC.

It serves as the system of record for all clinical, billing, and AI-generated data, replacing the prior Supabase setup.

All configurations below assume:

- Cloud SQL is deployed with **private IP** (no public access)
- Encryption at rest via **Transparent Data Encryption (TDE)**
- Enforced authentication using **IAM and SSL**

---

### 🧩 2. Database Setup and Access

#### 2.1 Create the Database

```bash
gcloud sql instances create medical-db \
  --database-version=POSTGRES_14 \
  --cpu=2 --memory=8GB \
  --region=us-central1 \
  --network=hipaa-vpc \
  --availability-type=REGIONAL \
  --no-assign-ip \
  --storage-type=SSD \
  --storage-size=50GB
```

#### 2.2 Create a Database and Service Account

1.  **Create the main database:**

    ```bash
    gcloud sql databases create medical --instance=medical-db
    ```

2.  **Create user for backend:**

    ```bash
    gcloud sql users create api_backend \
      --instance=medical-db --password=securepass
    ```

#### 2.3 Connect Securely (IAM or Proxy)

- **Local development (Cloud SQL Auth Proxy):**

  ```bash
  gcloud auth application-default login
  gcloud sql connect medical-db --user=api_backend
  ```

- **In production (Cloud Run):**

  - Use private connection via `/cloudsql/PROJECT:REGION:INSTANCE`
  - Authentication handled by service account `api-backend@PROJECT.iam.gserviceaccount.com`

---

### 🔒 3. Security & Compliance

| Control                | Implementation                           |
| ---------------------- | ---------------------------------------- |
| **Network Access**     | Private IP (no public access)            |
| **Authentication**     | IAM + database password                  |
| **Encryption**         | TDE + Cloud KMS CMEK                     |
| **Audit Logging**      | Cloud SQL Audit Logs enabled             |
| **Backups**            | Daily automated + point-in-time recovery |
| **Row-Level Security** | Enforced via `clinician_id` filters      |

- **Enable audit logging:**

  ```bash
  gcloud sql instances patch medical-db \
    --database-flags=log_statement=all,log_connections=on
  ```

---

### 🧾 4. Entity-Relationship Summary

| Table           | Purpose                          | Key Relationships                           |
| --------------- | -------------------------------- | ------------------------------------------- |
| `users`         | Clinician/staff profiles         | 1:N → `patients`, `encounters`, `claims`    |
| `patients`      | Patient demographics & insurance | N:1 → `users`; 1:N → `encounters`, `claims` |
| `encounters`    | Clinical visits (SOAP + AI data) | N:1 → `users`, `patients`                   |
| `audio_records` | Encounter audio metadata         | N:1 → `encounters`                          |
| `ai_results`    | AI-generated SOAP/coding data    | N:1 → `encounters`                          |
| `claims`        | Insurance claims                 | N:1 → `encounters`, `patients`              |
| `ai_feedback`   | Feedback loop for AI tuning      | N:1 → `claims`, `encounters`                |
| `notifications` | Clinician alerts                 | N:1 → `users`                               |

---

### 🧠 5. Table Definitions

#### 5.1 `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'clinician',
  created_at TIMESTAMP DEFAULT now()
);
```

#### 5.2 `patients`

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_patients_clinician ON patients(clinician_id);
```

#### 5.3 `encounters`

```sql
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  clinician_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date_of_service TIMESTAMP NOT NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  status TEXT DEFAULT 'draft',
  ai_confidence NUMERIC,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

- **Trigger for audit timestamp:**

  ```sql
  CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_update_timestamp
    BEFORE UPDATE ON encounters
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  ```

#### 5.4 `audio_records`

```sql
CREATE TABLE audio_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  duration_seconds NUMERIC,
  transcription_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);
```

#### 5.5 `ai_results`

```sql
CREATE TABLE ai_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  flow_name TEXT NOT NULL,
  input_json JSONB,
  output_json JSONB,
  model_version TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMP DEFAULT now()
);
```

#### 5.6 `claims`

```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  clinician_id UUID REFERENCES users(id),
  patient_id UUID REFERENCES patients(id),
  diagnosis_codes TEXT[],
  procedure_codes TEXT[],
  total_amount NUMERIC(10,2),
  insurance_provider TEXT,
  status TEXT DEFAULT 'ready',
  rejection_reason TEXT,
  submission_date TIMESTAMP,
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 5.7 `ai_feedback`

```sql
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  ai_codes JSONB,
  final_codes JSONB,
  status TEXT,
  rejection_reason TEXT,
  model_version TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

#### 5.8 `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);
```

---

### 🔐 6. Row-Level Security (RLS) Implementation

In Cloud SQL, RLS is simulated using query-level filtering in the API layer.

- **Example middleware enforcement:**

  ```javascript
  const { rows } = await db.query(
    `
    SELECT * FROM patients
    WHERE clinician_id = $1
  `,
    [req.user.uid]
  );
  ```

- Alternatively, RLS can be emulated with **database views**:

  ```sql
  CREATE VIEW clinician_patients AS
    SELECT * FROM patients
    WHERE clinician_id = current_setting('app.current_user_id')::uuid;
  ```

- Then, set the variable on each connection:

  ```sql
  SET app.current_user_id = 'clinician-uuid';
  ```

---

### 📋 7. Audit Logging

Every access and mutation is logged in two layers:

1.  **Database triggers** (for `insert`/`update`/`delete`)
2.  **Cloud Logging middleware** (in API layer)

- **Example audit trigger:**

  ```sql
  CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action TEXT,
    table_name TEXT,
    record_id UUID,
    timestamp TIMESTAMP DEFAULT now()
  );

  CREATE OR REPLACE FUNCTION audit_event() RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id)
    VALUES (current_setting('app.current_user_id')::uuid, TG_OP, TG_TABLE_NAME, NEW.id);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

- **Apply to tables:**

  ```sql
  CREATE TRIGGER trg_audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION audit_event();
  ```

---

### 🧰 8. Backup and Retention

| Policy                     | Value          |
| -------------------------- | -------------- |
| **Backup frequency**       | Daily          |
| **Retention**              | 30 days        |
| **Point-in-time recovery** | Enabled        |
| **Encryption**             | Cloud KMS CMEK |
| **Restore target**         | ≤ 5-minute RPO |

- **Enable backup:**

  ```bash
  gcloud sql settings patch medical-db \
    --backup-start-time=03:00 \
    --enable-point-in-time-recovery
  ```

---

### 📊 9. Performance & Scaling

- Index frequently queried columns (`clinician_id`, `encounter_id`, `status`)
- Enable `pg_stat_statements` for query monitoring:

  ```bash
  gcloud sql instances patch medical-db \
    --database-flags=pg_stat_statements.track=all
  ```

- **Scale via:**

  ```bash
  gcloud sql tiers list
  gcloud sql instances patch medical-db --tier=db-custom-2-8192
  ```

---

### ✅ 10. Summary

| Category           | Implementation                           |
| ------------------ | ---------------------------------------- |
| **Database Type**  | Cloud SQL (PostgreSQL 14)                |
| **Encryption**     | TDE + KMS CMEK                           |
| **Access Control** | IAM + private IP only                    |
| **Logging**        | Cloud SQL Audit Logs + internal triggers |
| **Backups**        | Automated + point-in-time recovery       |
| **RLS**            | API-level filtering by `clinician_id`    |
| **Schema**         | Normalized, audit-ready, AI-integrated   |

### 9. Local Database Alternative (Option B)

Developers can run the same PostgreSQL schema locally using Docker or Supabase.
