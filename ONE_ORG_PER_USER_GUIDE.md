# One Organization Per User - Implementation Guide

## Overview

This migration simplifies the organization model from **many-to-many** to **one-to-many**:
- **Before**: Users could belong to multiple organizations (via `organization_memberships` table)
- **After**: Each user belongs to ONE organization (via `users.organization_id` column)

---

## Why This Change?

### Benefits:
1. **Simpler Data Model** - No junction table needed
2. **Clearer Data Scoping** - Always know which org a user is working in
3. **Better HIPAA Compliance** - Clear data boundaries per organization
4. **Easier Billing** - One NPI/Tax ID context per user
5. **Simpler Code** - No need to track "active" organization

### Trade-offs:
- Users who work at multiple clinics need multiple accounts
- Can be addressed later if needed by allowing organization switching

---

## Database Changes

### Old Model (Many-to-Many):
```
users ←→ organization_memberships ←→ organizations
```

### New Model (One-to-Many):
```
users.organization_id → organizations.id
```

### Schema Changes:
```sql
-- Drop junction table
DROP TABLE organization_memberships;

-- Add columns to users
ALTER TABLE users
  ADD COLUMN organization_id uuid REFERENCES organizations(id),
  ADD COLUMN is_org_admin boolean DEFAULT false;
```

---

## Migration Steps

### 1. **Check for Multi-Org Users**

```sql
SELECT 
  u.email,
  COUNT(om.id) as org_count,
  STRING_AGG(o.name, ', ') as organizations
FROM users u
JOIN organization_memberships om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
GROUP BY u.id, u.email
HAVING COUNT(om.id) > 1;
```

If this returns rows, decide which organization each user should keep.

### 2. **Migrate Existing Data**

```sql
-- Copy most recent organization membership to users table
UPDATE users u
SET 
  organization_id = om.organization_id,
  is_org_admin = om.is_admin
FROM organization_memberships om
WHERE u.id = om.user_id
AND om.created_at = (
  SELECT MAX(created_at) 
  FROM organization_memberships 
  WHERE user_id = u.id
);
```

### 3. **Run Migration**

```bash
psql -h your-db-host -U postgres -d postgres \
  -f backend/docs/db/017_enforce_one_org_per_user.sql
```

---

## Code Changes

### ✅ **Updated Files:**

#### **1. `src/utils/organization.ts`**
- ✅ Simplified `getUserOrganization()` - no more junction table join
- ✅ Added `isOrganizationAdmin()` - check admin status
- ✅ Added `assignUserToOrganization()` - join/switch orgs
- ✅ Added `removeUserFromOrganization()` - leave org
- ✅ Added `getOrganizationUsers()` - list all users in org

**Before:**
```typescript
SELECT o.*
FROM organization_memberships om
JOIN organizations o ON om.organization_id = o.id
WHERE om.user_id = $1
LIMIT 1
```

**After:**
```typescript
SELECT o.*
FROM organizations o
JOIN users u ON u.organization_id = o.id
WHERE u.id = $1
```

---

## API Changes

### Organization Join/Create

**Before:**
```typescript
// Created row in organization_memberships
INSERT INTO organization_memberships (organization_id, user_id, is_admin)
VALUES ($1, $2, $3)
```

**After:**
```typescript
// Update user's organization_id
UPDATE users 
SET organization_id = $1, is_org_admin = $2
WHERE id = $3
```

### Check Admin Status

**Before:**
```typescript
SELECT is_admin 
FROM organization_memberships 
WHERE user_id = $1 AND organization_id = $2
```

**After:**
```typescript
SELECT is_org_admin 
FROM users 
WHERE id = $1
```

---

## Frontend Impact

### **Minimal Changes Needed**

The frontend already uses `getUserOrganization()` which we've updated. No frontend code changes required!

**Current frontend code:**
```typescript
const organization = await getUserOrganization(user.id);
// This still works! Just uses new implementation
```

---

## Testing Checklist

After migration, verify:

- [ ] Users can create organizations
- [ ] Users can join organizations with invite code
- [ ] User's organization appears in dashboard
- [ ] Patients are scoped to organization
- [ ] Encounters are scoped to organization
- [ ] Claims are scoped to organization
- [ ] Only one organization per user
- [ ] Multiple users can be in same organization
- [ ] Admin users can manage organization settings

---

## Rollback Plan

If needed, restore the old model:

```sql
-- Recreate junction table
CREATE TABLE organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES users(id),
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- Migrate data back
INSERT INTO organization_memberships (organization_id, user_id, is_admin)
SELECT organization_id, id, is_org_admin
FROM users
WHERE organization_id IS NOT NULL;

-- Remove columns from users
ALTER TABLE users
  DROP COLUMN organization_id,
  DROP COLUMN is_org_admin;
```

---

## New Workflows

### **User Joins Organization**
```typescript
// When user enters invite code
await assignUserToOrganization(userId, organizationId, false);
```

### **User Creates Organization**
```typescript
// Create org
const org = await createOrganization(name);
// Make user admin
await assignUserToOrganization(userId, org.id, true);
```

### **User Leaves Organization**
```typescript
await removeUserFromOrganization(userId);
```

### **User Switches Organizations**
```typescript
// Just update to new org
await assignUserToOrganization(userId, newOrgId, false);
```

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Tables** | 3 (users, orgs, memberships) | 2 (users, orgs) |
| **User Orgs** | Multiple | One |
| **Org Users** | Multiple | Multiple ✓ |
| **Admin Check** | JOIN query | Simple column |
| **Data Scoping** | Complex (which org?) | Simple (user's org) |
| **Code Complexity** | Higher | Lower |

---

## Next Steps

1. ✅ **Migration file created** - `017_enforce_one_org_per_user.sql`
2. ✅ **Code updated** - `organization.ts` simplified
3. ⏳ **Run migration** - Execute SQL on database
4. ⏳ **Update organization routes** - Use new functions
5. ⏳ **Test thoroughly** - Verify all workflows
6. ✅ **Deploy** - Push changes

---

**Status**: ✅ Code Ready | ⏳ Migration Ready to Run | 🧪 Testing Pending

