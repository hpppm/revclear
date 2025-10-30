# 🧾 HIPAA Compliance V1

## Developer Implementation Guide for Google Cloud-Based HIPAA Compliance

### 🩺 1. Purpose

This document defines the technical safeguards, access controls, and administrative implementations that ensure the AI-Powered Medical Billing System complies with HIPAA Security and Privacy Rules.

It is written for developers and DevOps engineers deploying the system on Google Cloud Platform (GCP) under a Business Associate Agreement (BAA).

---

### ☁️ 2. Covered Services

All components of the backend run on HIPAA-eligible GCP services, under a single BAA:

| Category            | Service                           | Purpose                                  |
| ------------------- | --------------------------------- | ---------------------------------------- |
| **Compute**         | Cloud Run, Cloud Functions        | API and AI execution                     |
| **Database**        | Cloud SQL (PostgreSQL)            | PHI and application data                 |
| **Storage**         | Cloud Storage                     | Encrypted file storage                   |
| **AI/ML**           | Vertex AI, Genkit                 | PHI-safe model inference                 |
| **Auth**            | Firebase Auth (Identity Platform) | User authentication                      |
| **Secrets**         | Secret Manager                    | Encrypted environment variables          |
| **Audit & Logs**    | Cloud Logging, Cloud Audit Logs   | Immutable PHI event logs                 |
| **Network**         | VPC, Cloud Armor, IAP             | Network and application-level protection |
| **Encryption Keys** | Cloud KMS                         | Key management for at-rest encryption    |

All services listed above are included in Google’s official HIPAA Covered Products list, ensuring compliance eligibility.

---

### 🔐 3. Core Principles

| Principle           | Implementation                                                       |
| ------------------- | -------------------------------------------------------------------- |
| **Confidentiality** | Enforced via IAM roles, VPC Service Controls, and TLS 1.3 encryption |
| **Integrity**       | Cloud SQL + KMS encryption, audit triggers, Cloud Logging            |
| **Availability**    | Multi-zone Cloud SQL replicas + Cloud Storage redundancy             |

---

### 🧱 4. Infrastructure Setup

#### 4.1 Enable Required Services

```bash
gcloud services enable run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  aiplatform.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  logging.googleapis.com \
  vpcaccess.googleapis.com
```

#### 4.2 Create Network & Security Baseline

1.  **Create HIPAA-isolated VPC:**

    ```bash
    gcloud compute networks create hipaa-vpc --subnet-mode=custom
    ```

2.  **Add subnet for backend:**

    ```bash
    gcloud compute networks subnets create backend-subnet \
      --network=hipaa-vpc \
      --region=us-central1 \
      --range=10.10.0.0/24
    ```

3.  **Enable private IP access for Cloud SQL:**

    ```bash
    gcloud services enable servicenetworking.googleapis.com

    gcloud compute addresses create google-managed-services \
      --global --purpose=VPC_PEERING \
      --prefix-length=16 --network=hipaa-vpc

    gcloud services vpc-peerings connect \
      --service=servicenetworking.googleapis.com \
      --ranges=google-managed-services \
      --network=hipaa-vpc
    ```

#### 4.3 Create a HIPAA-Covered Cloud SQL Instance

```bash
gcloud sql instances create medical-db \
  --database-version=POSTGRES_14 \
  --cpu=2 --memory=8GB \
  --region=us-central1 \
  --network=hipaa-vpc \
  --no-assign-ip \
  --availability-type=REGIONAL \
  --storage-type=SSD \
  --storage-size=50GB
```

- **Enable automatic encryption and backups:**

  ```bash
  gcloud sql settings patch medical-db \
    --backup-start-time=03:00 \
    --enable-point-in-time-recovery
  ```

#### 4.4 Secure Cloud Storage for PHI

1.  **Create storage bucket with encryption and access control:**

    ```bash
    gsutil mb -p $PROJECT_ID -c standard -l us-central1 gs://medical-billing-data/
    ```

2.  **Enforce object versioning:**

    ```bash
    gsutil versioning set on gs://medical-billing-data/
    ```

3.  **Enforce default KMS encryption:**

        ```bash
        gcloud kms keyrings create hipaa-ring --location=us-central1

    gcloud kms keys create storage-key --location=us-central1 --keyring=hipaa-ring --purpose=encryption

        gsutil encryption set \
          "projects/$PROJECT_ID/locations/us-central1/keyRings/hipaa-ring/cryptoKeys/storage-key" \
          gs://medical-billing-data/
        ```

#### 4.5 Store Secrets Securely

1.  **Store database credentials:**

    ```bash
    echo "DB_USER=medical_admin" | gcloud secrets create db-user --data-file=-
    echo "DB_PASS=securepass123" | gcloud secrets create db-pass --data-file=-
    echo "DB_NAME=medical" | gcloud secrets create db-name --data-file=-
    ```

2.  **Access these at runtime via service account permissions only:**

    ```bash
    gcloud secrets add-iam-policy-binding db-user \
      --member="serviceAccount:api-backend@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
    ```

---

### 🧠 5. Access Control (RBAC)

All users and services authenticate via Firebase Auth and IAM.

| Role                  | Access Level                                |
| --------------------- | ------------------------------------------- |
| **Clinician**         | Read/write to own PHI only                  |
| **Admin**             | Read/write all records (audit logged)       |
| **Cloud Run SA**      | Invokes Cloud SQL, Cloud Functions, Logging |
| **Cloud Function SA** | Writes to Cloud SQL and Logging only        |

#### Create Role and Bind Permissions

1.  **Create service accounts:**

        ```bash
        gcloud iam service-accounts create api-backend --display-name="Cloud Run Backend"

    gcloud iam service-accounts create ai-functions --display-name="AI Cloud Functions"

    ```

    ```

2.  **Assign IAM roles:**

    ```bash
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:api-backend@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/cloudsql.client"

    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:ai-functions@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/logging.logWriter"
    ```

---

### 🧾 6. Logging & Audit Trails

#### Cloud Logging Integration

Every PHI-related event is logged to Cloud Logging with:

- `user_id`, `role`, `ip`, `timestamp`
- `action`: `create` | `read` | `update` | `delete`
- `entity_type`: `patient` | `encounter` | `claim`
- `success/failure` flag

**Middleware Example:**

```javascript
await logging.log("PHI_ACCESS", {
  user: req.user.uid,
  action: "READ",
  entity: "encounter",
  entityId: encounter.id,
  status: "SUCCESS",
});
```

#### Log Retention

Retain for 6 years (HIPAA requirement)

```bash
gcloud logging buckets update \_Default --location=global --retention-days=2190
```

---

### 🔒 7. Data Encryption Summary

| Layer               | Mechanism                                     |
| ------------------- | --------------------------------------------- |
| **In Transit**      | TLS 1.3 (enforced by Cloud Run and Cloud SQL) |
| **At Rest (DB)**    | Transparent Data Encryption (TDE) + KMS       |
| **At Rest (Files)** | Cloud Storage encryption + CMEK key           |
| **Secrets**         | Secret Manager with KMS envelope encryption   |
| **Backups**         | Encrypted via Cloud SQL backup policy         |

---

### 🧰 8. Backup & Disaster Recovery

| Component         | Backup Type                     | Recovery           |
| ----------------- | ------------------------------- | ------------------ |
| **Cloud SQL**     | Daily automated + point-in-time | 5-minute RPO       |
| **Cloud Storage** | Object versioning + lifecycle   | Version restore    |
| **AI Functions**  | Versioned via Cloud Build       | Rollback supported |

---

### 🚨 9. Incident Response

- Enable Cloud Security Command Center Premium
- Configure alerting policies in Cloud Monitoring:

  ```bash
  gcloud alpha monitoring policies create \
    --notification-channels=email@domain.com \
    --condition-display-name="Unauthorized access attempt" \
    --condition-filter='resource.type="cloudsql_database" AND severity="ERROR"'
  ```

- All alerts routed to security lead via Pub/Sub → Slack integration

---

### 🧩 10. Administrative Safeguards

- **Data Minimization:** Only necessary PHI stored (no free-text notes beyond SOAP)
- **Data Disposal:** PHI deleted via scheduled Cloud Function after retention expiry
- **Training:** All developers trained in HIPAA rules for PHI handling
- **Access Reviews:** IAM audit every 90 days using:

  ```bash
  gcloud projects get-iam-policy $PROJECT_ID > iam-audit.json
  ```

---

### ✅ 11. Summary Checklist

| Area                          | Status |
| ----------------------------- | :----: |
| Encryption (TLS + KMS)        |   ✅   |
| IAM Least Privilege           |   ✅   |
| Cloud SQL Backups             |   ✅   |
| Cloud Logging + 6yr Retention |   ✅   |
| Secret Manager Access Control |   ✅   |
| Cloud Run Private Networking  |   ✅   |
| Firebase Auth Integration     |   ✅   |
| BAA-Covered Services Only     |   ✅   |

That’s the full developer-level HIPAA implementation guide for your new GCP backend.
It covers infrastructure, access, encryption, and audit configuration — everything an engineer needs to build and deploy securely.

> 🧩 **Development (Option B) Disclaimer**
>
> For testing and student prototypes, a local or hybrid setup may use Supabase, Vercel,
> or other free-tier services. These are **not HIPAA-covered** and must never handle real PHI.
> Production deployments must migrate to the HIPAA-eligible stack described above.
