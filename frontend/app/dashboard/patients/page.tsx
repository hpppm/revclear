import { mockPatients } from "./mockPatients";

export default function PatientsPage() {
  const categories = [
    { key: "mentalHealth", label: "Mental Health" },
    { key: "speechTherapy", label: "Speech Therapy" },
    { key: "physicalTherapy", label: "Physical Therapy" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Patients</h1>

      {categories.map((cat) => (
        <div key={cat.key} className="mb-10">
          <h2 className="text-xl font-semibold mb-3">{cat.label}</h2>

          <div className="rounded-xl bg-white p-6 shadow border border-slate-200">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="py-2">Name</th>
                  <th className="py-2">Age</th>
                  <th className="py-2">Diagnosis</th>
                </tr>
              </thead>

              <tbody>
                {mockPatients[cat.key].map((p) => (
                  <tr key={p.id} className="border-b last:border-none">
                    <td className="py-3">{p.name}</td>
                    <td className="py-3">{p.age}</td>
                    <td className="py-3">{p.diagnosis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
