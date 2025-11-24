"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateEncounterPage() {
  const [date, setDate] = useState('');
  const [patient, setPatient] = useState('');
  const [provider, setProvider] = useState('Auto-filled Provider Name'); // Placeholder for now
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you'd process the form data here
    // and then navigate to the next step, e.g., audio capture.
    console.log('Encounter Details:', { date, patient, provider });
    // router.push('/dashboard/encounters/audio-capture'); // Example navigation
    alert('Encounter details submitted! (Next step: Audio Capture)');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Encounter</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label htmlFor="encounterDate" className="block text-gray-700 text-sm font-bold mb-2">
            Date of Encounter:
          </label>
          <input
            type="date"
            id="encounterDate"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="patientSelect" className="block text-gray-700 text-sm font-bold mb-2">
            Patient:
          </label>
          <select
            id="patientSelect"
            value={patient}
            onChange={(e) => setPatient(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">Select a Patient</option>
            {/* Replace with dynamic patient list from API */}
            <option value="patient1">John Doe</option>
            <option value="patient2">Jane Smith</option>
            <option value="patient3">Alice Johnson</option>
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="providerName" className="block text-gray-700 text-sm font-bold mb-2">
            Provider:
          </label>
          <input
            type="text"
            id="providerName"
            value={provider}
            readOnly
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Next: Audio Capture
          </button>
        </div>
      </form>
    </div>
  );
}
