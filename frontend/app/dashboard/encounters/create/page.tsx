"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AudioRecorder from "@/app/components/AudioRecorder";
import AudioUploader from "@/app/components/AudioUploader";
import ClaimViewer from "@/app/components/ClaimViewer";
import MedicalCodesViewer, { MedicalCode } from "@/app/components/MedicalCodesViewer";
import SoapNoteViewer from "@/app/components/SoapNoteViewer";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Claim, Patient } from "@/app/lib/types";

type Step = "metadata" | "audio" | "review";
type Transcript = { text?: string; summary?: string;[key: string]: any };
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
  const [claim, setClaim] = useState<Claim | null>(null);
  const [generatingClaim, setGeneratingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>("Select a patient and date, then capture audio.");
  const [codes, setCodes] = useState<MedicalCode[]>([]);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [suggestedCodes, setSuggestedCodes] = useState<
    Array<{ code: string; description: string; type: "CPT" | "ICD-10"; confidence: number }>
  >([]);

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
      // Fetch encounter details
      apiClient.encounters.getById(paramEncounterId)
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data) {
            if (data.audio_key) {
              setS3Key(data.audio_key);
              setInfo("Restored previous session. Ready to transcribe.");
            }
            // Restore metadata if needed, though we might want to keep current selection
            // or strictly follow what's in the DB.
            // For now, let's at least ensure patientId matches if we want to be safe,
            // but the user might be just refreshing.
            if (data.patient_id) {
              setMetadata(prev => ({ ...prev, patientId: data.patient_id, date: data.date_of_service?.split('T')[0] || prev.date }));
            }
          }
        })
        .catch(err => console.error("Failed to restore encounter", err));
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

  const practitionerFilter = useMemo(() => {
    let raw =
      (user as any)?.practitionerType ||
      (user as any)?.practitioner ||
      (user as any)?.practitioner_type ||
      "";
    if (!raw && typeof window !== "undefined") {
      raw = localStorage.getItem("practitionerType") || "";
    }
    const normalized = `${raw}`.toLowerCase();
    if (normalized.includes("mental") || normalized.includes("psych")) return "mental";
    if (normalized.includes("physical")) return "physical";
    if (normalized.includes("speech")) return "speech";
    return "mental";
  }, [user]);

  const allowedFiltersForViewer = useMemo(
    () => [practitionerFilter as "mental" | "physical" | "speech"],
    [practitionerFilter]
  );

  const fetchPatients = async () => {
    setLoadingPatients(true);
    setPatientsError(null);
    try {
      const response = await apiClient.patients.getAll();
      // Backend returns { success: true, data: [...] }
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
    setCodes([]);
    setEncounterId(null);
    setS3Key(null);
    setInfo(message || "Audio cleared. Ready to record or upload.");
    setError(null);
    // Remove encounterId from URL
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
    setCodes([]);
    setError(null);

    // Auto-save flow: Create encounter -> Upload audio
    if (!metadata.date || !metadata.patientId) {
      setError("Please select a patient and date before saving audio.");
      return;
    }

    setUploading(true);
    setInfo("Saving encounter and uploading audio...");

    try {
      // 1. Create Encounter
      const encounterRes = await apiClient.encounters.create({
        patient_id: metadata.patientId,
        date_of_service: metadata.date,
        status: "in_progress"
      });

      const newEncounterId = encounterRes.data?.data?.id || encounterRes.data?.id;
      if (!newEncounterId) throw new Error("Failed to create encounter ID");
      setEncounterId(newEncounterId);

      // Update URL with encounterId
      const params = new URLSearchParams(searchParams?.toString());
      params.set("encounterId", newEncounterId);
      router.replace(`/dashboard/encounters/create?${params.toString()}`);

      // 2. Upload Audio
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
      // Optional: clear audio if save failed?
    } finally {
      setUploading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!s3Key || !encounterId) {
      setError("Audio not saved yet. Please record or upload audio first.");
      return;
    }

    setTranscribing(true);
    setError(null);
    setInfo("Transcribing audio...");

    try {
      const res = await apiClient.transcribe.transcribeS3({
        s3Key: s3Key,
        encounterId: encounterId
      });

      const receivedTranscript =
        res.data?.transcript || res.data?.data?.transcript || res.data;
      const receivedSoap = res.data?.soap || res.data?.data?.soap || null;

      setTranscript(receivedTranscript);
      setSoap(receivedSoap);
      setInfo("Transcription complete. Continue to SOAP.");

      // Auto-scroll to review
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
      // Handle nested response structure: res.data.data.soap or res.data.soap
      const responseData = res.data?.data || res.data;
      const soapData = responseData?.soap || responseData;

      console.log("SOAP Response:", soapData);
      setSoap(soapData);
      setCodes([]);
      setInfo("SOAP note generated successfully.");
      setStep("review"); // Ensure review section is visible
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
      // Call dedicated mock endpoint
      const res = await apiClient.soap.generateFromMockTranscript(encounterId);
      const responseData = res.data?.data || res.data;
      const soapData = responseData?.soap || responseData;

      console.log("Mock SOAP Response:", soapData);
      setSoap(soapData);
      setTranscript({ text: "[Using mock transcript for testing]" });
      setCodes([]);
      setInfo("SOAP note generated from mock transcript.");
      setStep("review"); // Ensure review section is visible
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

  const handleGenerateClaim = async () => {
    setGeneratingClaim(true);
    setClaimError(null);
    try {
      if (!metadata.patientId || !selectedPatient) {
        throw new Error("Select a patient before generating a claim.");
      }

      const claimData: Claim = {
        claimNumber: `CLM-${Date.now()}`,
        status: "draft",
        dateOfService: metadata.date,
        patient: {
          id: metadata.patientId,
          name: selectedPatient.name,
          insurance: selectedPatient.insuranceType || "Not provided",
        },
        provider: {
          name: metadata.provider || (user as any)?.full_name || "Provider",
          npi: (user as any)?.licenseId || "0000000000",
        },
        facility: "RevClear Clinic",
        codes: [
          {
            code: "99213",
            description: "Office/outpatient visit, established patient",
            type: "CPT",
            amount: 150,
          },
          {
            code: "I10",
            description: "Essential (primary) hypertension",
            type: "ICD-10",
            amount: 0,
          },
        ],
        notes: soap
          ? "Generated from current SOAP note."
          : "Draft claim generated without SOAP details.",
      };
      setClaim(claimData);
      setInfo("Claim generated as draft. Export or adjust as needed.");
    } catch (err: any) {
      setClaimError(err?.message || "Failed to generate claim.");
    } finally {
      setGeneratingClaim(false);
    }
  };

  const handleExportClaim = () => {
    if (!claim) {
      setClaimError("Generate a claim before exporting.");
      return;
    }
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const transcriptText =
    typeof transcript === "string"
      ? transcript
      : transcript?.text ||
      transcript?.summary ||
      JSON.stringify(transcript ?? {}, null, 2);

  const buildCodeSuggestions = (): MedicalCode[] => {
    const mental: MedicalCode[] = [
      {
        id: "cpt-90791",
        code: "90791",
        description: "Psychiatric diagnostic evaluation (mental)",
        category: "Mental health",
        type: "CPT",
        confidence: 0.78,
      },
      {
        id: "icd-f411",
        code: "F41.1",
        description: "Generalized anxiety disorder",
        category: "Mental health",
        type: "ICD-10",
        confidence: 0.64,
      },
      {
        id: "icd-f321",
        code: "F32.1",
        description: "Major depressive disorder, single episode, moderate",
        category: "Mental health",
        type: "ICD-10",
        confidence: 0.59,
      },
    ];

    const physical: MedicalCode[] = [
      {
        id: "cpt-97110",
        code: "97110",
        description: "Therapeutic exercises, strength/flexibility (physical)",
        category: "Physical therapy",
        type: "CPT",
        confidence: 0.82,
      },
      {
        id: "icd-m2251",
        code: "M22.51",
        description: "Patellofemoral disorders, left knee",
        category: "Physical therapy",
        type: "ICD-10",
        confidence: 0.58,
      },
    ];

    const speech: MedicalCode[] = [
      {
        id: "cpt-92507",
        code: "92507",
        description: "Speech-language therapy, individual (speech)",
        category: "Speech therapy",
        type: "CPT",
        confidence: 0.69,
      },
      {
        id: "icd-r4781",
        code: "R47.81",
        description: "Slurred speech",
        category: "Speech",
        type: "ICD-10",
        confidence: 0.52,
      },
    ];

    if (practitionerFilter === "physical") return physical;
    if (practitionerFilter === "speech") return speech;
    return mental;
  };

  const handleGenerateCodes = async () => {
    setCodesError(null);
    setGeneratingCodes(true);
    return new Promise<MedicalCode[]>((resolve) => {
      setTimeout(() => {
        const next = buildCodeSuggestions();
        setCodes(next);
        setGeneratingCodes(false);
        setInfo("Codes generated from SOAP (stubbed).");
        resolve(next);
      }, 200);
    });
  };

  const handlePreviewMock = () => {
    const mockSets: Record<
      string,
      {
        transcript: string;
        soap: Soap;
      }
    > = {
      mental: {
        transcript:
          "Patient reports escalating anxiety before work presentations, trouble sleeping, and occasional low mood. No SI/HI. Requests coping strategies.",
        soap: {
          subjective:
            "- Feels anxious before presenting; palms sweaty, heart racing.\n- Sleep fragmented; 5-6 hours/night; ruminates on work tasks.\n- Mood low 2-3 days/week; denies SI/HI.",
          objective:
            "- Alert, oriented x3; anxious but cooperative affect.\n- Speech clear, normal rate/volume.\n- PHQ-9 estimate: mild; GAD-7 estimate: moderate.",
          assessment:
            "- Generalized anxiety disorder.\n- Situational performance anxiety.\n- Mild depressive symptoms, monitor.",
          plan:
            "- CBT-based coping (breathing, thought reframing) + exposure practice for presentations.\n- Sleep hygiene coaching; consider short-term CBT-I tools.\n- Discuss SSRI trial if symptoms persist; follow-up in 4 weeks.",
        },
      },
      physical: {
        transcript:
          "Patient reports left knee pain after running 5k races, dull ache 4/10, worse on stairs. No locking or giving way. Wants rehab exercises.",
        soap: {
          subjective:
            "- Anterior left knee ache after runs; 4/10; worse on stairs or squats.\n- No instability, locking, or swelling reported.\n- Using ice occasionally; no formal PT.",
          objective:
            "- No visible swelling/erythema; mild tenderness over patellar tendon.\n- Full ROM; mild crepitus on squat; strength 4+/5 quads.\n- Negative Lachman and McMurray.",
          assessment:
            "- Patellofemoral pain syndrome (overuse).\n- Quadriceps/hip strength imbalance contributing.",
          plan:
            "- Therapeutic exercise program (closed-chain quad, hip abduction/external rotation) 3x/week.\n- Activity modification: reduce downhill volume; cadence work.\n- Ice after runs; consider patellar taping.\n- Reassess in 4-6 weeks; progress load as tolerated.",
        },
      },
      speech: {
        transcript:
          "Patient notes slowed speech and occasional word-finding issues under stress at work calls. No swallowing difficulty. Wants pacing exercises.",
        soap: {
          subjective:
            "- Speech slows during high-stress meetings; occasional word-finding pauses.\n- No dysphagia, no recent neuro events.\n- Seeks strategies to keep pace.",
          objective:
            "- Speech clear, intelligible; mild rate reduction under simulated stress.\n- Language intact; no cranial nerve deficits noted in brief screen.",
          assessment:
            "- Functional speech fluency changes under stress; no red flags for neurologic etiology.",
          plan:
            "- Teach paced breathing/pausing; script rehearsal for meetings.\n- Daily reading aloud with metronome for rate control.\n- Re-evaluate in 3-4 weeks; monitor for new neuro symptoms.",
        },
      },
    };

    const chosen = mockSets[practitionerFilter] || mockSets.mental;

    setTranscript({ text: chosen.transcript });
    setSoap(chosen.soap);
    setCodes([]);
    setInfo("Loaded mock preview for SOAP and code suggestions for your specialty.");
    setStep("review");
  };

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
            ← Back to Patients
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
          className={`rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4`}
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
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
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
                disabled={!s3Key || transcribing || uploading}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {transcribing ? "Transcribing..." : uploading ? "Saving..." : "Transcribe"}
              </button>
            </div>
          </div>

          {!audioFile && !s3Key && (
            <p className="text-xs text-amber-700">
              Record or upload audio to enable transcription.
            </p>
          )}
        </section>

        <>
          <section
            id="review-section"
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Review</p>
                <h2 className="text-2xl font-bold text-slate-900">Transcript & SOAP</h2>
                <p className="text-sm text-slate-600">
                  Generate the SOAP note, then review suggested codes before creating a claim.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePreviewMock}
                  className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
                >
                  Preview SOAP (Mock)
                </button>
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
                {soap && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {transcriptText?.includes("mock transcript")
                      ? "Mock SOAP"
                      : "SOAP ready"}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Transcript</p>
                {transcriptText ? (
                  <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 h-full">
                    {transcriptText}
                  </pre>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 h-full">
                    No transcript available yet.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">SOAP Note</p>
                <SoapNoteViewer soap={soap} />
              </div>
            </div>
          </section>

          <MedicalCodesViewer
            codes={codes}
            loading={generatingCodes}
            error={codesError}
            onGenerate={handleGenerateCodes}
            onChange={setCodes}
            title="Suggested codes"
            initialFilter={practitionerFilter as any}
            allowedFilters={allowedFiltersForViewer}
          />

          <ClaimViewer
            claim={claim}
            generating={generatingClaim}
            onGenerate={handleGenerateClaim}
            onExport={handleExportClaim}
          />
          {claimError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {claimError}
            </div>
          )}
        </>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
