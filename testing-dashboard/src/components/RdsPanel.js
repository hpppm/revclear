"use client";

import { useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { useLogger } from "@/contexts/LogContext";
import { dev } from "@/lib/api/dev";
import { patientCrudExamples, patientTableNote } from "@/data/rdsExamples";

const defaultCreateBody = {
  full_name: "Test Patient",
  dob: "1990-01-01",
  gender: "female",
  phone: "555-0101",
  email: "patient@example.com",
  insurance_provider: "Demo Health",
};

const defaultUpdateBody = {
  patient_id: "<patient_uuid>",
  phone: "555-0202",
  insurance_provider: "Updated Health",
};

export default function RdsPanel() {
  const { log } = useLogger();
  const [status, setStatus] = useState("Ready to exercise RDS CRUD flows.");
  const [checking, setChecking] = useState(false);
  const [latestResult, setLatestResult] = useState(null);

  const [createBody, setCreateBody] = useState(
    JSON.stringify(defaultCreateBody, null, 2)
  );
  const [readPatientId, setReadPatientId] = useState("");
  const [updateBody, setUpdateBody] = useState(
    JSON.stringify(defaultUpdateBody, null, 2)
  );
  const [deletePatientId, setDeletePatientId] = useState("");

  const handleHealthCheck = async () => {
    setChecking(true);
    setStatus("Pinging /api/dev/db/health…");
    try {
      const result = await dev.checkDbHealth();
      setLatestResult(result);
      setStatus("RDS responded successfully.");
      log("RDS health check succeeded", "success", result);
    } catch (error) {
      setStatus(`RDS health check failed: ${error.message}`);
      log("RDS health check failed", "error", error);
    } finally {
      setChecking(false);
    }
  };

  const handleCreate = async () => {
    try {
      const body = JSON.parse(createBody);
      const result = await dev.createPatient(body);
      setLatestResult(result);
      setStatus("Patient created.");
      log("RDS create succeeded", "success", result);
    } catch (error) {
      setStatus(`Create failed: ${error.message}`);
      log("RDS create failed", "error", error);
    }
  };

  const handleRead = async () => {
    try {
      const result = await dev.getPatients({
        patientId: readPatientId || null,
        limit: 5,
      });
      setLatestResult(result);
      setStatus("Read completed.");
      log("RDS read succeeded", "success", result);
    } catch (error) {
      setStatus(`Read failed: ${error.message}`);
      log("RDS read failed", "error", error);
    }
  };

  const handleUpdate = async () => {
    try {
      const body = JSON.parse(updateBody);
      const patientId = body.patient_id || body.id;
      if (!patientId) {
        throw new Error("patient_id is required in the payload.");
      }
      const { patient_id, id, ...payload } = body;
      const result = await dev.updatePatient(patientId, payload);
      setLatestResult(result);
      setStatus("Update completed.");
      log("RDS update succeeded", "success", result);
    } catch (error) {
      setStatus(`Update failed: ${error.message}`);
      log("RDS update failed", "error", error);
    }
  };

  const handleDelete = async () => {
    const patientId = deletePatientId.trim();
    if (!patientId) {
      setStatus("Delete failed: patient id is required.");
      return;
    }
    try {
      const result = await dev.deletePatient(patientId);
      setLatestResult(result);
      setStatus("Delete completed.");
      log("RDS delete succeeded", "success", result);
    } catch (error) {
      setStatus(`Delete failed: ${error.message}`);
      log("RDS delete failed", "error", error);
    }
  };

  const handleCopy = async (sql) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(sql);
        setStatus("SQL copied to clipboard.");
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (error) {
      setStatus("Could not copy SQL, please copy manually.");
      log("Copy to clipboard failed", "error", error);
    }
  };

  return (
    <Card header={<h3>RDS testing console</h3>} className="service-panel">
      <p className="details">
        These controls are scoped for the Postgres patients table (see{" "}
        <code>backend/docs/db/002_cloud_db_schema.sql</code>). API calls are
        stubbed for now—use them to design payloads before wiring to backend
        routes.
      </p>
      <div className="rds-connection">
        <div>
          <p className="rds-status">{status}</p>
          <p className="rds-note">{patientTableNote}</p>
        </div>
        <Button
          onClick={handleHealthCheck}
          variant="primary"
          disabled={checking}>
          {checking ? "Checking RDS…" : "Ping RDS health"}
        </Button>
      </div>

      <div className="rds-ops-grid">
        <section className="rds-card">
          <div className="rds-card-head">
            <span>🆕 Create</span>
            <small>Insert a new patient row.</small>
          </div>
          <textarea
            className="rds-textarea"
            rows={8}
            spellCheck={false}
            value={createBody}
            onChange={(e) => setCreateBody(e.target.value)}
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={handleCreate}>
            Run Create
          </Button>
          <pre className="rds-sql">{patientCrudExamples.create}</pre>
        </section>

        <section className="rds-card">
          <div className="rds-card-head">
            <span>📖 Read</span>
            <small>List latest patients or fetch by id.</small>
          </div>
          <label className="rds-field">
            <span>Patient id (optional)</span>
            <input
              className="rds-input"
              placeholder="uuid — leave empty to list recent patients"
              value={readPatientId}
              onChange={(e) => setReadPatientId(e.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleRead}>
            Run Read
          </Button>
          <pre className="rds-sql">{patientCrudExamples.read}</pre>
        </section>

        <section className="rds-card">
          <div className="rds-card-head">
            <span>✏️ Update</span>
            <small>Modify contact or insurance fields.</small>
          </div>
          <textarea
            className="rds-textarea"
            rows={6}
            spellCheck={false}
            value={updateBody}
            onChange={(e) => setUpdateBody(e.target.value)}
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={handleUpdate}>
            Run Update
          </Button>
          <pre className="rds-sql">{patientCrudExamples.update}</pre>
        </section>

        <section className="rds-card">
          <div className="rds-card-head">
            <span>🗑️ Delete</span>
            <small>Remove a patient by id.</small>
          </div>
          <label className="rds-field">
            <span>Patient id</span>
            <input
              className="rds-input"
              placeholder="uuid required"
              value={deletePatientId}
              onChange={(e) => setDeletePatientId(e.target.value)}
            />
          </label>
          <Button
            variant="danger"
            className="w-full"
            onClick={handleDelete}>
            Run Delete
          </Button>
          <pre className="rds-sql">{patientCrudExamples.delete}</pre>
        </section>
      </div>

      <section className="rds-sql-snippet">
        <div className="rds-sql-header">
          <div>
            <p className="rds-sql-title">Example patient query</p>
            <small>Runs cleanly on the patients table in the RDS schema.</small>
          </div>
          <Button
            variant="secondary"
            onClick={() => handleCopy(patientCrudExamples.read)}>
            Copy query
          </Button>
        </div>
        <pre className="rds-sql-block">{patientCrudExamples.read}</pre>
      </section>

      <section className="rds-result">
        <div className="rds-result-header">
          <p>Last response</p>
        </div>
        <pre className="rds-result-body">
          {latestResult
            ? JSON.stringify(latestResult, null, 2)
            : "No requests run yet."}
        </pre>
      </section>
    </Card>
  );
}
