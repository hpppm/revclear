"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AudioRecorder from "@/app/components/AudioRecorder";
import AudioUploader from "@/app/components/AudioUploader";
import SoapNoteViewer from "@/app/components/SoapNoteViewer";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/app/lib/api/api";
import { Patient } from "@/app/lib/types";
import { mockPatients } from "@/app/lib/mock/mockPatients";

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

  const [step, setStep] = useState<Step>("metadata");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [metadata, setMetadata] = useState({
    date: today(),
    patientId: "",
    provider: "",
    note: "",
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [soap, setSoap] = useState<Soap | null>(null);
  const [transcribing, setTranscribing] = useState(false);
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
      const response = await api.get("/api/patients");
      const body = response.data?.patients ?? response.data ?? [];
      setPatients(Array.isArray(body) ? body : []);
    } catch (err) {
      console.error("Patient fetch failed, using mock list instead.", err);
      const fallback = Object.values(mockPatients).flat();
      setPatients(fallback as Patient[]);
      setPatientsError("Using mock patients because the API is not reachable.");
    } finally {
      setLoadingPatients(false);
    }
  };

  const clearAudioState = (message?: string) => {
    setAudioFile(null);
    setAudioUrl(null);
    setTranscript(null);
    setSoap(null);
    setInfo(message || "Audio cleared. Ready to record or upload.");
    setError(null);
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

  const handleAudioSelected = (file: File) => {
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscript(null);
    setSoap(null);
    setInfo(`Ready to transcribe: ${file.name}`);
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError("Please record or upload audio first.");
      return;
    }

    setTranscribing(true);
    setError(null);
    setInfo("Sending audio to transcription...");

    try {
      const form = new FormData();
      form.append("file", audioFile);
      form.append("encounterDate", metadata.date);
      form.append("patientId", metadata.patientId);
      if (metadata.note) form.append("note", metadata.note);

      const res = await api.post("/api/transcribe", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const receivedTranscript =
        res.data?.transcript || res.data?.data?.transcript || res.data;
      const receivedSoap = res.data?.soap || res.data?.data?.soap || null;

      setTranscript(receivedTranscript);
      setSoap(receivedSoap);
      setInfo("Transcription complete. Continue to SOAP.");
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
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to dashboard
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
                    {patient.age ? ` • ${patient.age}` : ""}
                    {patient.diagnosis ? ` • ${patient.diagnosis}` : ""}
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

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Optional note
              </span>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Symptoms, visit context, etc."
                value={metadata.note}
                onChange={(e) =>
                  setMetadata((prev) => ({ ...prev, note: e.target.value }))
                }
              />
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
              disabled={!metadata.date || !metadata.patientId}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Continue to audio
            </button>
          </div>
        </section>

        <section
          id="audio-section"
          className={`rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4 ${
            step === "metadata" ? "opacity-60 pointer-events-none" : ""
          }`}
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
            {audioFile && (
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

          {audioUrl && (
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
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {info || "Send the audio to the transcription service."}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearAudioState}
                disabled={!audioFile && !transcript}
                className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 shadow-sm hover:border-blue-500 disabled:cursor-not-allowed"
              >
                Redo encounter
              </button>
              <button
                type="button"
                onClick={goToReview}
                className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 shadow-sm hover:border-blue-500"
              >
                Next: Transcript & SOAP
              </button>
              <button
                type="button"
                onClick={handleTranscribe}
                disabled={!audioFile || transcribing}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {transcribing ? "Transcribing..." : "Transcribe"}
              </button>
            </div>
          </div>

          {!audioFile && (
            <p className="text-xs text-amber-700">
              Record or upload audio to enable transcription.
            </p>
          )}
        </section>

        {step === "review" && (
          <section
            id="review-section"
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Transcript and SOAP
              </h2>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Transcript</p>
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
