/**
 * Creates a sample encounter object with randomized data for testing.
 * @returns {object} A sample encounter object.
 */
export function createSampleEncounter() {
  const clinics = ["Clinic_A", "Clinic_B", "Clinic_C"];
  const states = ["draft", "finalized", "submitted"];
  const clinic = clinics[Math.floor(Math.random() * clinics.length)];
  const patientId = `patient-${Math.floor(Math.random() * 900 + 100)}`;
  const encounterDate = new Date().toISOString().slice(0, 10);
  return {
    patientId,
    encounterDate,
    clinic,
    status: states[Math.floor(Math.random() * states.length)],
    totalCharge: Number((Math.random() * 500 + 150).toFixed(2)),
    note: `Encounter generated at ${new Date().toISOString()}`,
    procedures: [
      {
        code: "99213",
        description: "Office/outpatient visit",
        amount: 125.0,
      },
      {
        code: "93000",
        description: "Electrocardiogram",
        amount: 90.0,
      },
    ],
  };
}
