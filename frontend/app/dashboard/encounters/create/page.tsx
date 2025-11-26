"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AudioRecorder from "@/app/components/AudioRecorder";
import AudioUploader from "@/app/components/AudioUploader";
import MedicalCodesViewer from "@/app/components/MedicalCodesViewer";
import SoapNoteViewer from "@/app/components/SoapNoteViewer";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Patient } from "@/app/lib/types";

type Step = "metadata" | "audio" | "review";
type Transcript = { text?: string; summary?: string; [key: string]: any };
type Soap = { subjective?: string; objective?: string; assessment?: string; plan?: string };

const allowedAudioTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
];

const today = () => new Date().toISOString().split("T")[0];

export default function EncounterPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<Step>("metadata");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [metadata, setMetadata] = useState({
    date: today(),
    patientId: "",
    provider: "",
  });

  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [soap, setSoap] = useState<Soap | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingSoap, setGeneratingSoap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>("Select a patient and date, then capture audio.");

  useEffect(() => {
    if (user) {
      setMetadata((prev) => ({
        ...prev,
        provider:
          (user as any).full_name ||
          (user as any).name ||
          (user as any).email ||
          "",
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchPatients();
  }, []);

  // Restore state from backend if encounterId is in URL
  useEffect(() => {
    const paramEncounterId = searchParams?.get("encounterId");
    if (paramEncounterId) {
      setEncounterId(paramEncounterId);
      apiClient.encounters
        .getById(paramEncounterId)
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data) {
            if (data.audio_key) {
              setS3Key(data.audio_key);
              setInfo("Restored previous session. Ready to transcribe.");
            }
            if (data.patient_id) {
              setMetadata((prev) => ({
                ...prev,
                patientId: data.patient_id,
                date: data.date_of_service?.split("T")[0] || prev.date,
              }));
            }
          }
        })
        .catch((err) => console.error("Failed to restore encounter", err));
    }
  }, [searchParams]);

  useEffect(() => {
    const param = searchParams?.get("patientId");
    if (param) {
      setMetadata((prev) => ({ ...prev, patientId: param }));
    }
  }, [searchParams]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === metadata.patientId),
    [patients, metadata.patientId]
  );

  const fetchPatients = async () => {
    setLoadingPatients(true);
    setPatientsError(null);
    try {
      const response = await apiClient.patients.getAll();
      const rawPatients = response.data?.data || [];

      const mappedPatients: Patient[] = Array.isArray(rawPatients)
        ? rawPatients.map((p: any) => ({
            id: p.id,
            name: p.full_name,
            age: p.age || 0,
            dob: p.dob,
            phone: p.phone,
            insuranceType: p.insurance_provider,
            insuranceId: p.insurance_policy_number,
            diagnosis: p.diagnosis,
          }))
        : [];

      setPatients(mappedPatients);
    } catch (err) {
      console.error("Patient fetch failed.", err);
      setPatients([]);
      setPatientsError("Failed to load patients. Please try again.");
    } finally {
      setLoadingPatients(false);
    }
  };

  const clearAudioState = (message?: string) => {
    setAudioFile(null);
    setAudioUrl(null);
    setTranscript(null);
    setSoap(null);
    setEncounterId(null);
    setS3Key(null);
    setInfo(message || "Audio cleared. Ready to record or upload.");
    setError(null);
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("encounterId");
    router.replace(`/dashboard/encounters/create?${params.toString()}`);
  };

  const handleNext = () => {
    if (!metadata.date || !metadata.patientId) {
      setError("Pick a patient and date before continuing.");
      return;
    }
    setError(null);
    setStep("audio");
    setInfo("Encounter started. Record or upload audio, then transcribe.");
  };

  const handleAudioSelected = async (file: File) => {
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscript(null);
    setSoap(null);
    setError(null);

    if (!metadata.date || !metadata.patientId) {
      setError("Please select a patient and date before saving audio.");
      return;
    }

    setUploading(true);
    setInfo("Saving encounter and uploading audio...");

    try {
      const encounterRes = await apiClient.encounters.create({
        patient_id: metadata.patientId,
        date_of_service: metadata.date,
        status: "in_progress",
      });

      const newEncounterId = encounterRes.data?.data?.id || encounterRes.data?.id;
      if (!newEncounterId) throw new Error("Failed to create encounter ID");
      setEncounterId(newEncounterId);

      const params = new URLSearchParams(searchParams?.toString());
      params.set("encounterId", newEncounterId);
      router.replace(`/dashboard/encounters/create?${params.toString()}`);

      const form = new FormData();
      form.append("audio", file);
      form.append("encounterId", newEncounterId);

      const uploadRes = await apiClient.transcribe.uploadAudio(form, true);
      const key = uploadRes.data?.s3Key;

      if (!key) throw new Error("Failed to get S3 key from upload");
      setS3Key(key);

      setInfo("Audio saved. Ready to transcribe.");
    } catch (err: any) {
      console.error("Save failed", err);
      setError("Failed to save audio. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleTranscribe = async () => {
    setTranscribing(true);
    setError(null);
    setInfo("Transcribing audio...");

    try {
      // If we somehow lost the saved audio reference, try to re-save before transcribing
      if ((!s3Key || !encounterId) && audioFile) {
        setInfo("Saving audio before transcription...");
        const encounterRes = await apiClient.encounters.create({
          patient_id: metadata.patientId,
          date_of_service: metadata.date,
          status: "in_progress",
        });
        const newEncounterId = encounterRes.data?.data?.id || encounterRes.data?.id;
        if (!newEncounterId) throw new Error("Failed to create encounter ID");
        setEncounterId(newEncounterId);

        const params = new URLSearchParams(searchParams?.toString());
        params.set("encounterId", newEncounterId);
        router.replace(`/dashboard/encounters/create?${params.toString()}`);

        const form = new FormData();
        form.append("audio", audioFile);
        form.append("encounterId", newEncounterId);
        const uploadRes = await apiClient.transcribe.uploadAudio(form, true);
        const key = uploadRes.data?.s3Key;
        if (!key) throw new Error("Failed to get S3 key from upload");
        setS3Key(key);
      }

      if (!s3Key || !encounterId) {
        throw new Error("Audio not saved yet. Please record/upload and try again.");
      }

      const res = await apiClient.transcribe.transcribeS3({
        s3Key: s3Key,
        encounterId: encounterId,
      });

      const receivedTranscript =
        res.data?.transcript || res.data?.data?.transcript || res.data;
      const receivedSoap = res.data?.soap || res.data?.data?.soap || null;

      setTranscript(receivedTranscript);
      setSoap(receivedSoap);
      setInfo("Transcription complete. Continue to SOAP.");

      setTimeout(() => goToReview(), 100);
    } catch (err: any) {
      console.error("Transcription failed", err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Transcription failed. Please try again.";
      setError(message);
    } finally {
      setTranscribing(false);
    }
  };

  const goToReview = () => {
    setStep("review");
    const el = document.getElementById("review-section");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleGenerateSoap = async () => {
    if (!encounterId) {
      setError("No encounter ID available.");
      return;
    }

    setGeneratingSoap(true);
    setError(null);
    setInfo("Generating SOAP note from transcript...");

    try {
      const res = await apiClient.soap.generateFromTranscript(encounterId);
      const responseData = res.data?.data || res.data;
      const soapData = responseData?.soap || responseData;

      setSoap(soapData);
      setInfo("SOAP note generated successfully.");
      setStep("review");
    } catch (err: any) {
      console.error("SOAP generation failed", err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to generate SOAP note. Please try again.";
      setError(message);
    } finally {
      setGeneratingSoap(false);
    }
  };

  const handleGenerateMockSoap = async () => {
    if (!encounterId) {
      setError("No encounter ID available.");
      return;
    }

    setGeneratingSoap(true);
    setError(null);
    setInfo("Generating SOAP note from MOCK transcript...");

    try {
      const res = await apiClient.soap.generateFromMockTranscript(encounterId);
      const responseData = res.data?.data || res.data;
      const soapData = responseData?.soap || responseData;

      setSoap(soapData);
      setTranscript({ text: "[Using mock transcript for testing]" });
      setInfo("SOAP note generated from mock transcript.");
      setStep("review");
    } catch (err: any) {
      console.error("Mock SOAP generation failed", err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to generate SOAP note. Please try again.";
      setError(message);
    } finally {
      setGeneratingSoap(false);
    }
  };

  const handlePreviewSoapLayout = () => {
    setTranscript({
      text: "[Preview only] Replace with real transcript after transcription.",
    });
    setSoap({
      subjective: "Feeling feverish\nChest wall discomfort",
      objective: "BP elevated, mild facial flushing",
      assessment: "Likely hypertension exacerbation",
      plan: "Order labs\nEKG if symptoms persist\nSchedule follow-up in 1 week",
    });
    setInfo("Preview mode active. Generate real SOAP after transcription.");
    goToReview();
  };

  const transcriptText =
    typeof transcript === "string"
      ? transcript
      : transcript?.text ||
        transcript?.summary ||
        JSON.stringify(transcript ?? {}, null, 2);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Encounter flow</p>
            <h1 className="text-3xl font-bold text-slate-900">
              Encounter workspace
            </h1>
            <p className="text-slate-600">
              Select patient and date, capture audio, transcribe, then review SOAP.
            </p>
          </div>
          <Link
            href="/dashboard/patients"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Patients
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Patient and encounter details
              </h2>
              <p className="text-sm text-slate-600">
                Pick a patient and date, then continue to audio capture.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Encounter date
              </span>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={metadata.date}
                onChange={(e) =>
                  setMetadata((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Patient
              </span>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={metadata.patientId}
                onChange={(e) =>
                  setMetadata((prev) => ({ ...prev, patientId: e.target.value }))
                }
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                    {patient.age ? ` (${patient.age})` : ""}
                  </option>
                ))}
              </select>
              {loadingPatients && (
                <p className="text-xs text-slate-500">Loading patients...</p>
              )}
              {patientsError && (
                <p className="text-xs text-amber-700">{patientsError}</p>
              )}
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Provider
              </span>
              <input
                type="text"
                value={metadata.provider}
                readOnly
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 bg-slate-50 shadow-sm"
              />
              <p className="text-xs text-slate-500">Pulled from your profile.</p>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {selectedPatient
                ? `Selected: ${selectedPatient.name}`
                : "Pick a patient to enable audio capture."}
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Continue to audio
            </button>
          </div>
        </section>

        <section
          id="audio-section"
          className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Audio capture
              </h2>
              <p className="text-sm text-slate-600">
                Record or upload audio, then transcribe to SOAP.
              </p>
            </div>
            {(audioFile || s3Key) && (
              <button
                onClick={() => clearAudioState()}
                className="text-sm text-slate-600 hover:text-slate-800"
              >
                Clear audio
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AudioRecorder onRecorded={handleAudioSelected} />
            <AudioUploader
              accept={allowedAudioTypes}
              maxSizeMB={25}
              onFileSelect={handleAudioSelected}
            />
          </div>

          {audioUrl ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>Selected audio: {audioFile?.name}</span>
                <span className="text-xs text-slate-500">
                  {(audioFile?.size || 0) / 1024 ** 2 < 0.01
                    ? ""
                    : `${((audioFile?.size || 0) / 1024 / 1024).toFixed(1)} MB`}
                </span>
              </div>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          ) : s3Key ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Audio uploaded</p>
                <p className="text-xs text-blue-700">Ready to transcribe from previous session.</p>
              </div>
            </div>
          ) : null}

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {info || "Send the audio to the transcription service."}
              </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => clearAudioState()}
                className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 shadow-sm hover:border-blue-500"
              >
                Redo encounter
              </button>
              <button
                type="button"
                onClick={handleTranscribe}
                disabled={(!audioFile && !s3Key) || transcribing || uploading}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {transcribing ? "Transcribing..." : uploading ? "Saving..." : "Transcript"}
              </button>
              <button
                type="button"
                onClick={handlePreviewSoapLayout}
                className="inline-flex items-center rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 border border-rose-200 shadow-sm hover:border-rose-300"
              >
                Preview SOAP layout
              </button>
            </div>
          </div>

          {!audioFile && !s3Key && (
            <p className="text-xs text-amber-700">
              Record or upload audio to enable transcription.
            </p>
          )}
        </section>

        {(step === "review" || transcript || soap) && (
          <>
            <section
              id="review-section"
              className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Transcript and SOAP
                </h2>
                {(transcriptText || soap) && (
                  <button
                    type="button"
                    onClick={goToReview}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Next: SOAP & Codes
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Transcript</p>
                  <div className="flex gap-2">
                    {transcriptText && !soap && (
                      <button
                        type="button"
                        onClick={handleGenerateSoap}
                        disabled={generatingSoap}
                        className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {generatingSoap ? "Generating..." : "Generate SOAP"}
                      </button>
                    )}
                    {!soap && encounterId && (
                      <button
                        type="button"
                        onClick={handleGenerateMockSoap}
                        disabled={generatingSoap}
                        className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {generatingSoap ? "Generating..." : "Generate SOAP (Mock)"}
                      </button>
                    )}
                  </div>
                </div>
                {transcriptText ? (
                  <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800">
                    {transcriptText}
                  </pre>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    No transcript available yet.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">SOAP Note</p>
                <SoapNoteViewer soap={soap} />
              </div>
            </section>

            <MedicalCodesViewer soap={soap} encounterId={encounterId} />
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
