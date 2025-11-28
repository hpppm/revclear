-- =========================================================
-- Migration 014: Organizations, memberships, and clinic scoping
-- =========================================================
-- Adds clinics (organizations), links clinicians to clinics, and scopes
-- patients/encounters/claims to an organization with a primary clinician.

-- 1) Clinics (organizations)
CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  npi           text,
  tax_id        text,
  address_line1 text,
  address_line2 text,
  city          text,
  state         text,
  postal_code   text,
  phone         text,
  timezone      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_update_timestamp
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

-- 2) Clinician ↔ clinic memberships
CREATE TABLE organization_memberships (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_admin         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_memberships_org ON organization_memberships (organization_id);
CREATE INDEX idx_org_memberships_user ON organization_memberships (user_id);

-- 3) Patients belong to a clinic and have a primary clinician
ALTER TABLE patients
  ADD COLUMN organization_id uuid,
  ADD COLUMN primary_clinician_id uuid;

ALTER TABLE patients
  ADD CONSTRAINT patients_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

ALTER TABLE patients
  ADD CONSTRAINT patients_primary_clinician_fk
    FOREIGN KEY (primary_clinician_id) REFERENCES users(id);

CREATE INDEX idx_patients_organization ON patients (organization_id);
CREATE INDEX idx_patients_primary_clinician ON patients (primary_clinician_id);

-- 4) Scope encounters to the clinic
ALTER TABLE encounters
  ADD COLUMN organization_id uuid;

ALTER TABLE encounters
  ADD CONSTRAINT encounters_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

CREATE INDEX idx_encounters_organization ON encounters (organization_id);

-- 5) Scope claims to the clinic
ALTER TABLE claims
  ADD COLUMN organization_id uuid;

ALTER TABLE claims
  ADD CONSTRAINT claims_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

CREATE INDEX idx_claims_organization ON claims (organization_id);
