# Self-Pay Patient Handling Guide

## Overview

RevClear now supports **self-pay patients** (patients without insurance). This document explains how self-pay patients are handled throughout the application workflow.

---

## 1. Patient Registration

### Adding a Self-Pay Patient

When adding a new patient (`/dashboard/patients/add`):

1. **Toggle Switch**: Use the "Self-Pay / No Insurance" toggle to mark a patient as self-pay
2. **Insurance Fields**: When self-pay is enabled:
   - All insurance input fields are hidden
   - An informative panel explains what self-pay means
   - On submission, `insurance_provider` is set to `"SELF_PAY"`
   - All other insurance fields are cleared

### Database Storage

```sql
-- Self-pay patient example
INSERT INTO patients (
  full_name,
  dob,
  insurance_provider,  -- Set to 'SELF_PAY'
  insurance_policy_number,  -- NULL or empty
  insurance_member_id,  -- NULL or empty
  ...
) VALUES (
  'John Doe',
  '1985-06-15',
  'SELF_PAY',
  NULL,
  NULL,
  ...
);
```

---

## 2. Patient Display

### Dashboard View

Self-pay patients are displayed with a distinctive badge:
- **Visual**: Amber/gold badge with dollar icon
- **Text**: "Self-Pay" instead of insurance provider name
- **Member ID**: Shows "—" (no member ID for self-pay)

### Identification Logic

A patient is considered self-pay if:
```typescript
patient.insurance_provider === "SELF_PAY" || !patient.insurance_provider
```

---

## 3. Encounter Creation

### Impact on Encounters

Self-pay status **does NOT affect** encounter creation:
- ✅ Encounters can be created normally
- ✅ Audio recording works the same
- ✅ Transcription works the same
- ✅ SOAP note generation works the same
- ✅ Medical coding (ICD/CPT) works the same

### Database

```sql
-- Encounters table is unchanged
CREATE TABLE encounters (
  id uuid,
  patient_id uuid,  -- Can reference self-pay patient
  clinician_id uuid,
  date_of_service timestamp,
  status text,
  ...
);
```

**Key Point**: The encounter workflow is **insurance-agnostic**. Clinical documentation happens regardless of payment method.

---

## 4. Claims Generation

### Critical Difference: No Insurance Claims

This is where self-pay patients diverge from insured patients:

#### For Insured Patients:
```
Encounter → SOAP Note → Medical Codes → Insurance Claim → Submit to Payer
```

#### For Self-Pay Patients:
```
Encounter → SOAP Note → Medical Codes → Patient Statement → Bill Patient Directly
```

### Implementation Requirements

When generating claims, the system must check:

```typescript
// Example claim generation logic
async function generateClaim(encounterId: string) {
  const encounter = await getEncounter(encounterId);
  const patient = await getPatient(encounter.patient_id);
  
  // Check if patient is self-pay
  if (patient.insurance_provider === 'SELF_PAY' || !patient.insurance_provider) {
    // DO NOT create insurance claim
    // Instead, create patient statement/invoice
    return createPatientStatement(encounter, patient);
  }
  
  // Normal insurance claim flow
  return createInsuranceClaim(encounter, patient);
}
```

### Claims Table Behavior

```sql
-- For self-pay patients, claims should either:
-- Option 1: Not be created at all
-- Option 2: Be created with special status

INSERT INTO claims (
  encounter_id,
  patient_id,
  status,  -- 'patient_responsibility' or 'self_pay'
  insurance_provider,  -- 'SELF_PAY' or NULL
  payer_id,  -- NULL
  payer_name,  -- NULL
  patient_responsibility,  -- Full amount
  total_amount,
  ...
);
```

---

## 5. Billing Workflow

### Self-Pay Billing Process

1. **Encounter Completed** → SOAP note finalized
2. **Medical Codes Added** → ICD/CPT codes for services rendered
3. **Calculate Charges** → Based on CPT codes and fee schedule
4. **Generate Patient Statement** → Itemized bill for patient
5. **Send to Patient** → Email/mail statement
6. **Track Payment** → Record payments directly from patient

### Recommended Status Flow

```
draft → ready → billed_to_patient → partially_paid → paid
```

vs. Insurance flow:
```
draft → ready → submitted → pending → paid/rejected
```

---

## 6. Backend API Considerations

### Patients API (`/api/patients`)

**POST /api/patients**
```json
{
  "full_name": "John Doe",
  "dob": "1985-06-15",
  "insurance_provider": "SELF_PAY",  // Special value
  "insurance_policy_number": null,
  "insurance_member_id": null,
  ...
}
```

### Claims API (`/api/claims`)

**POST /api/claims** - Should validate:

```typescript
// Backend validation
if (patient.insurance_provider === 'SELF_PAY') {
  return {
    error: 'Cannot create insurance claim for self-pay patient',
    suggestion: 'Use patient statement endpoint instead'
  };
}
```

### Recommended: New Patient Statement Endpoint

```typescript
// POST /api/patient-statements
{
  encounter_id: "uuid",
  patient_id: "uuid",
  line_items: [
    {
      code: "99213",  // CPT code
      description: "Office visit",
      units: 1,
      charge: 150.00
    }
  ],
  total_amount: 150.00,
  due_date: "2025-01-15"
}
```

---

## 7. Reporting & Analytics

### Considerations

When generating reports, distinguish between:
- **Insurance Revenue**: Claims submitted to payers
- **Self-Pay Revenue**: Direct patient payments
- **Outstanding Self-Pay**: Unpaid patient balances

### Example Queries

```sql
-- Get all self-pay encounters
SELECT e.*, p.full_name
FROM encounters e
JOIN patients p ON e.patient_id = p.id
WHERE p.insurance_provider = 'SELF_PAY' OR p.insurance_provider IS NULL;

-- Calculate self-pay revenue
SELECT 
  SUM(total_amount) as self_pay_revenue,
  COUNT(*) as self_pay_encounters
FROM claims
WHERE insurance_provider = 'SELF_PAY'
  AND status = 'paid';
```

---

## 8. UI/UX Recommendations

### Visual Indicators

Throughout the app, use consistent visual language:
- **Color**: Amber/gold for self-pay (vs. blue for insurance)
- **Icon**: Dollar sign or wallet icon
- **Badge**: "Self-Pay" badge on patient cards
- **Warnings**: Alert clinicians when viewing self-pay patient

### Example Encounter Page

```tsx
{patient.insurance_provider === 'SELF_PAY' && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <p className="text-amber-800 font-medium">
      ⚠️ Self-Pay Patient
    </p>
    <p className="text-amber-700 text-sm">
      No insurance claim will be generated. Patient will be billed directly.
    </p>
  </div>
)}
```

---

## 9. Migration Strategy

### Existing Patients

If you have existing patients without insurance info:

```sql
-- Update existing patients with empty insurance to SELF_PAY
UPDATE patients
SET insurance_provider = 'SELF_PAY'
WHERE insurance_provider IS NULL 
   OR insurance_provider = '';
```

---

## 10. Future Enhancements

### Potential Features

1. **Payment Plans**: Allow self-pay patients to pay in installments
2. **Discounts**: Apply self-pay discounts (common in healthcare)
3. **Payment Portal**: Online payment for self-pay patients
4. **Statements**: Automated monthly statement generation
5. **Collections**: Track overdue self-pay balances

### Example Discount Logic

```typescript
function calculateSelfPayCharge(baseCharge: number): number {
  const SELF_PAY_DISCOUNT = 0.20; // 20% discount
  return baseCharge * (1 - SELF_PAY_DISCOUNT);
}
```

---

## Summary

### ✅ What Works the Same
- Patient registration
- Encounter creation
- Audio transcription
- SOAP note generation
- Medical coding (ICD/CPT)

### ⚠️ What's Different
- **No insurance claims** are generated
- **Patient statements** are created instead
- **Direct billing** to patient
- **Different payment tracking** workflow

### 🔑 Key Takeaway

Self-pay patients follow the **same clinical workflow** but a **different billing workflow**. The system must detect self-pay status and route to the appropriate billing process.

---

## Implementation Checklist

- [x] Add self-pay toggle to patient registration
- [x] Display self-pay badge on dashboard
- [ ] Prevent insurance claim creation for self-pay patients
- [ ] Create patient statement generation endpoint
- [ ] Add self-pay payment tracking
- [ ] Update reporting to separate insurance vs. self-pay revenue
- [ ] Add self-pay indicators on encounter pages
- [ ] Implement self-pay discount logic (optional)
- [ ] Create patient billing portal (optional)

---

**Last Updated**: 2025-12-04  
**Version**: 1.0
