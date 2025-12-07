# Database Schema Cleanup - Implementation Guide

## Overview

This guide documents the removal of redundant `clinic_*` fields from the `users` table. These fields duplicated information that belongs in the `organizations` table.

---

## Changes Made

### 1. **Backend Code Updates** ✅

#### Files Modified:
- `backend/src/types/zod.ts` - Removed clinic_* fields from UserSchema
- `backend/src/api/routes/me.ts` - Removed clinic_* from updatable fields
- `backend/src/config/db.ts` - Removed clinic_* from userColumns array

#### Fields Removed from Users:
```typescript
// REMOVED (now in organizations table):
clinic_name
clinic_address_street
clinic_address_city
clinic_address_state
clinic_address_zip
clinic_phone
clinic_npi
```

#### Fields Retained in Users:
```typescript
// KEPT (personal provider credentials):
npi                  // Personal Type 1 NPI
tax_id               // Personal SSN/EIN
license_id           // State license
license_state        // License state
practitioner_type    // Mental Health, Speech Therapy, etc.
taxonomy_code        // Personal taxonomy
provider_role        // rendering/billing/both
```

---

## 2. **Database Migration** ⏳ (Ready to Run)

### Migration File Created:
`backend/docs/db/016_remove_redundant_clinic_fields.sql`

### Before Running Migration:

**CRITICAL: Verify Data Integrity First!**

```sql
-- Run this query to check for users with clinic data but NO organization
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.clinic_name,
  u.clinic_npi,
  COUNT(om.id) as org_count
FROM users u
LEFT JOIN organization_memberships om ON u.id = om.user_id
WHERE (
  u.clinic_name IS NOT NULL 
  OR u.clinic_npi IS NOT NULL
  OR u.clinic_address_street IS NOT NULL
)
GROUP BY u.id, u.email, u.full_name, u.clinic_name, u.clinic_npi
HAVING COUNT(om.id) = 0;
```

**If this returns ANY rows:** Those users need organizations assigned first!

### Running the Migration:

```bash
# Connect to your database
psql -h your-db-host -U your-db-user -d your-db-name

# Run the migration
\i backend/docs/db/016_remove_redundant_clinic_fields.sql
```

The migration will:
1. ✅ Create a backup table (`users_clinic_backup`)
2. ✅ Drop the redundant columns
3. ✅ Add documentation comments

---

## 3. **Impact Analysis**

### What Still Works:
- ✅ User authentication (Cognito)
- ✅ Personal provider info (NPI, license, etc.)
- ✅ Organization membership
- ✅ Patient management
- ✅ Encounters and claims

### What Changed:
- ⚠️ `/api/me` PATCH endpoint no longer accepts clinic_* fields
- ⚠️ Use `/api/organizations/current` PUT to update clinic info instead
- ⚠️ User object no longer includes clinic_* fields
- ⚠️ Frontend should get clinic info from `user.organization` not `user.clinic_*`

---

## 4. **Frontend Impact** (Minimal)

### Current Frontend Code:
Your frontend is **already using the organizations API correctly**! 

In `dashboard/page.tsx`:
```typescript
// ✅ Already correct - uses organization data
const response = await apiClient.organizations.getCurrent();
const org = extractOrganization(response);
setOrganization(org);
```

### No Frontend Changes Needed:
The frontend already:
- Gets clinic info from `organization` object
- Displays `organization.name`, `organization.phone`, etc.
- Uses `/api/organizations/current` for clinic management

---

## 5. **Data Flow After Cleanup**

### Before (Redundant):
```
User Profile Update:
  PATCH /api/me { clinic_name: "..." }
    ↓
  Updates users.clinic_name ❌ (redundant)
```

### After (Clean):
```
User Profile Update:
  PATCH /api/me { npi: "...", license_id: "..." }
    ↓
  Updates users.npi, users.license_id ✅ (personal)

Clinic Info Update:
  PUT /api/organizations/current { name: "..." }
    ↓
  Updates organizations.name ✅ (clinic)
```

---

## 6. **API Endpoint Reference**

### Personal Provider Info:
```http
PATCH /api/me
Content-Type: application/json

{
  "npi": "1234567890",           // Personal NPI
  "tax_id": "123-45-6789",       // Personal SSN/EIN
  "license_id": "PA-12345",      // State license
  "practitioner_type": "Mental Health",
  "taxonomy_code": "101YP2500X",
  "provider_role": "rendering"
}
```

### Clinic/Organization Info:
```http
PUT /api/organizations/current
Content-Type: application/json

{
  "name": "Erie Mental Health Center",
  "npi": "9876543210",           // Organization NPI
  "tax_id": "12-3456789",        // Clinic EIN
  "address_line1": "123 Main St",
  "city": "Erie",
  "state": "PA",
  "postal_code": "16501",
  "phone": "(814) 555-1234"
}
```

---

## 7. **Testing Checklist**

After running the migration, test:

- [ ] User login still works
- [ ] `/api/me` GET returns user without clinic_* fields
- [ ] `/api/me` PATCH updates personal fields (npi, license, etc.)
- [ ] `/api/organizations/current` GET returns organization
- [ ] `/api/organizations/current` PUT updates organization
- [ ] Dashboard displays organization info correctly
- [ ] Patient creation still works
- [ ] Encounter creation still works
- [ ] Claims generation still works

---

## 8. **Rollback Plan** (If Needed)

If something goes wrong:

```sql
-- Restore clinic_* columns
ALTER TABLE users
  ADD COLUMN clinic_name text,
  ADD COLUMN clinic_address_street text,
  ADD COLUMN clinic_address_city text,
  ADD COLUMN clinic_address_state text,
  ADD COLUMN clinic_address_zip text,
  ADD COLUMN clinic_phone text,
  ADD COLUMN clinic_npi text;

-- Restore data from backup
UPDATE users u
SET 
  clinic_name = b.clinic_name,
  clinic_address_street = b.clinic_address_street,
  clinic_address_city = b.clinic_address_city,
  clinic_address_state = b.clinic_address_state,
  clinic_address_zip = b.clinic_address_zip,
  clinic_phone = b.clinic_phone,
  clinic_npi = b.clinic_npi
FROM users_clinic_backup b
WHERE u.id = b.id;
```

Then revert the code changes.

---

## 9. **Benefits of This Cleanup**

1. **Single Source of Truth**
   - Clinic info only in `organizations` table
   - No confusion about which value to use

2. **Multi-Clinic Support**
   - Users can belong to multiple organizations
   - Each organization has its own clinic info

3. **Easier Maintenance**
   - Update clinic address once, not for every user
   - Clear separation of personal vs. organizational data

4. **Better Data Integrity**
   - Foreign key constraints enforce relationships
   - No risk of mismatched clinic data

---

## 10. **Next Steps**

1. ✅ **Code changes complete** - Backend updated
2. ⏳ **Review migration** - Check the SQL file
3. ⏳ **Run data integrity check** - Verify all users have organizations
4. ⏳ **Run migration** - Execute 016_remove_redundant_clinic_fields.sql
5. ⏳ **Test thoroughly** - Use checklist above
6. ✅ **Deploy** - Push changes to production

---

## Summary

**What We Did:**
- Removed 7 redundant `clinic_*` columns from `users` table
- Updated backend code to stop using those fields
- Created safe migration with backup
- Frontend already uses correct API - no changes needed

**What We Kept:**
- Personal provider credentials in `users` table
- Organization/clinic data in `organizations` table
- Many-to-many relationship via `organization_memberships`

**Result:**
- Cleaner schema
- Better data integrity
- Proper multi-clinic support
- Single source of truth for clinic information

---

**Status**: ✅ Code Ready | ⏳ Migration Ready to Run | 🧪 Testing Pending

