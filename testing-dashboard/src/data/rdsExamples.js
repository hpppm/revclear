export const patientCrudExamples = {
  create: `-- Create a sample patient\nINSERT INTO patients (full_name, dob, gender, phone, email)\nVALUES ('Ada Lovelace', '1990-12-10', 'female', '555-0101', 'ada@example.com')\nRETURNING id, full_name, created_at;`,
  read: `-- Read the most recent patients\nSELECT id, full_name, dob, gender, phone, email, insurance_provider, created_at\nFROM patients\nORDER BY created_at DESC\nLIMIT 5;`,
  update: `-- Update a patient's contact info\nUPDATE patients\nSET phone = '555-0202', insurance_provider = 'Acme Health'\nWHERE id = :patient_id\nRETURNING id, full_name, phone, insurance_provider;`,
  delete: `-- Delete a patient by id\nDELETE FROM patients\nWHERE id = :patient_id;`,
};

export const patientTableNote =
  "Columns: id (uuid, default), clinician_id (uuid), full_name (text), dob (date), gender (text), phone (text), email (text), insurance_provider (text), insurance_policy_number (text), created_at (timestamp)";
