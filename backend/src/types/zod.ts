import { z } from 'zod';

// Patient Schemas
export const PatientSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
  gender: z.string().min(1, 'Gender is required'),
});

export const CreatePatientSchema = PatientSchema.extend({
  // Add any specific fields for creation here if they differ from the base PatientSchema
});

export const UpdatePatientSchema = PatientSchema.partial(); // All fields optional for update

// Encounter Schemas
export const EncounterSchema = z.object({
  patient_id: z.string().uuid('Patient ID must be a valid UUID'),
  encounter_date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.\d{3}Z)?$/, 'Encounter date must be in YYYY-MM-DD or ISO format'),
  type: z.string().min(1, 'Encounter type is required'),
});

export const CreateEncounterSchema = EncounterSchema.extend({
  // Add any specific fields for creation here if they differ from the base EncounterSchema
});

export const UpdateEncounterSchema = EncounterSchema.partial(); // All fields optional for update
