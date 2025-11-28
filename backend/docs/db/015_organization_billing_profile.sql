-- =========================================================
-- Migration 015: Organization billing + clearinghouse profile
-- =========================================================
-- Adds billing/EDI fields and defaults for clinic-wide configuration.

ALTER TABLE organizations
  ADD COLUMN billing_name text,
  ADD COLUMN billing_npi text,
  ADD COLUMN billing_tax_id text,
  ADD COLUMN billing_address_line1 text,
  ADD COLUMN billing_address_line2 text,
  ADD COLUMN billing_city text,
  ADD COLUMN billing_state text,
  ADD COLUMN billing_postal_code text,
  ADD COLUMN billing_phone text,
  ADD COLUMN default_place_of_service text,
  ADD COLUMN edi_sender_id text,
  ADD COLUMN edi_receiver_id text,
  ADD COLUMN edi_sftp_host text,
  ADD COLUMN edi_sftp_username text,
  ADD COLUMN edi_sftp_password text,
  ADD COLUMN edi_sftp_port integer,
  ADD COLUMN edi_sftp_private_key text,
  ADD COLUMN fee_schedule jsonb,
  ADD COLUMN payer_enrollments jsonb,
  ADD COLUMN billing_defaults jsonb;
