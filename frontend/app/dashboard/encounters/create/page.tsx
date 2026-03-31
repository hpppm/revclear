"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useAuthorization } from "@/app/context/AuthContext";
import { Patient, MedicalCode } from "@/app/lib/types";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import { EncounterDetailsFormSchema } from "@/app/lib/validation/schemas";
import { SubscriberWritePayload } from "@/app/lib/api/patients";
import WizardContainer from "@/app/components/ui/WizardContainer";
import PatientDetailsStep from "@/app/components/wizard/PatientDetailsStep";
import TranscriptionStep from "@/app/components/wizard/TranscriptionStep";
import SoapGenerationStep from "@/app/components/wizard/SoapGenerationStep";
import MedicalCodesStep from "@/app/components/wizard/MedicalCodesStep";
import ReviewClaimStep from "@/app/components/wizard/ReviewClaimStep";
import UnauthorizedState from "@/app/components/ui/UnauthorizedState";

const allowedAudioTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
];

const extractTranscriptText = (t: any): string => {
  if (!t) return "";
  if (typeof t === "string") return t;
  if (t.encrypted !== undefined) return "";
  if (t.text !== undefined) return t.text ?? "";
  if (t.summary !== undefined) return t.summary ?? "";
  if (Array.isArray(t.segments)) {
    return t.segments.map((s: any) => s?.text ?? "").join(" ").trim();
  }
  return typeof t === "object" ? JSON.stringify(t) : "";
};

export default function EncounterPage() {
  const { user } = useAuth();
  const { canManageEncounters, canManageClaims, canWritePatients } = useAuthorization();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  // Step 1: Patient Details State
  const [metadata, setMetadata] = useState<{
    patientId: string;
    date: string;
    provider: string;
    encounterType?: string;
    chiefComplaint?: string;
    relationship?: "self" | "spouse" | "child" | "other";
    subscriber?: (Partial<SubscriberWritePayload> & { id?: string }) | null;
    patientName?: string;
  }>({
    patientId: "",
    date: new Date().toISOString().split("T")[0],
    provider: "",
    encounterType: "office_visit",
    relationship: "self",
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [encounterFieldErrors, setEncounterFieldErrors] = useState<Record<string, string>>({});
  const [subscriberLoading, setSubscriberLoading] = useState(false);
  const [subscriberError, setSubscriberError] = useState<string | null>(null);
  const [subscriberSaving, setSubscriberSaving] = useState(false);

  // Step 2: Transcription State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<any | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState<string>("");
  const [savingTranscript, setSavingTranscript] = useState(false);

  // Step 3: SOAP State
  const [soap, setSoap] = useState<any | null>(null);
  const [generatingSoap, setGeneratingSoap] = useState(false);

  // Step 4: Medical Codes State
  const [savedCodes, setSavedCodes] = useState<MedicalCode[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<MedicalCode[]>([]);
  const [_savingCodes, setSavingCodes] = useState(false);
  const [claimDraft, setClaimDraft] = useState<any>(null);
  const [claimValid, setClaimValid] = useState(false);
  const [claimSubmitAttempt, setClaimSubmitAttempt] = useState(0);
  const loadedEncounterIdRef = useRef<string | null>(null);

  const searchEncounterId =
    searchParams?.get("id") || searchParams?.get("encounterId") || null;
  const searchStep = searchParams?.get("step") || null;
  const searchPatientId = searchParams?.get("patientId") || null;
  const parsedSearchStep = searchStep ? parseInt(searchStep) || 0 : null;

  const handleCodesSelected = (codes: MedicalCode[]) => {
    setSelectedCodes(codes);
  };

  const handleClaimChange = (claim: any) => {
    setClaimDraft(claim);
  };

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
    if (!canManageEncounters) return;
    fetchPatients();
  }, [canManageEncounters]);

  if (!canManageEncounters) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <UnauthorizedState message="Your role does not have access to encounter workflows." />
      </div>
    );
  }

  // URL state management and refresh recovery
  useEffect(() => {
    if (searchEncounterId && loadedEncounterIdRef.current !== searchEncounterId) {
      loadedEncounterIdRef.current = searchEncounterId;
      setEncounterId(searchEncounterId);
      setLoading(true);

      // Fetch encounter data to restore state
      apiClient.encounters
        .getById(searchEncounterId)
        .then(async (res) => {
          const data = res.data?.data || res.data;
          logger.log("Refresh recovery - encounter data:", data);
          if (data) {
            // Restore patient and encounter metadata
            const encounterDate = data.date_of_service?.split("T")[0];
            const encounterType = data.encounter_type || data.encounterType;
            const chiefComplaint = data.chief_complaint || data.chiefComplaint;

            setMetadata((prev) => ({
              ...prev,
              patientId: data.patient_id || prev.patientId,
              date: encounterDate || prev.date,
              encounterType: encounterType || prev.encounterType,
              chiefComplaint: chiefComplaint ?? prev.chiefComplaint,
              provider: data.provider_name || data.provider || prev.provider,
            }));
            if (data.patient_id) {
              await loadSubscriber(data.patient_id);
            }

            // Restore audio
            logger.log("Checking for audio_key:", data.audio_key, "Full data:", data);
            if (data.audio_key) {
              logger.log("Restoring audio with key:", data.audio_key);
              setS3Key(data.audio_key);
              // Fetch presigned URL for audio playback
              try {
                const audioUrlRes = await apiClient.transcribe.getAudioUrl(searchEncounterId);
                logger.log("Audio URL response:", audioUrlRes.data);
                if (audioUrlRes.data?.audioUrl) {
                  setAudioUrl(audioUrlRes.data.audioUrl);
                }
              } catch (err) {
                logger.error("Failed to load audio URL", err);
              }
            } else {
              logger.log("No audio_key found in encounter data");
            }

            // Restore SOAP if it exists
            if (data.soap_result_id) {
              logger.log("Restoring SOAP with result_id:", data.soap_result_id);
              try {
                const soapRes = await apiClient.soap.getForEncounter(searchEncounterId);
                logger.log("SOAP response:", soapRes.data);

                // Extract the actual SOAP object from the response
                // Response structure: { success: true, data: { soap: {...}, ... }, ... }
                const soapData = soapRes.data?.data?.soap || soapRes.data?.soap || soapRes.data;

                if (soapData) {
                  setSoap(soapData);
                  logger.log("SOAP set successfully:", soapData);
                }
              } catch (err) {
                logger.error("Failed to load SOAP", err);
              }
            } else {
              logger.log("No soap_result_id found in encounter");
            }

            // Restore transcript if it exists
            if (data.transcript_result_id) {
              logger.log("Restoring transcript with result_id:", data.transcript_result_id);
              try {
                const transcriptRes = await apiClient.transcribe.getByEncounterId(searchEncounterId);
                logger.log("Transcript response:", transcriptRes.data);
                if (transcriptRes.data) {
                  setTranscript(transcriptRes.data);
                  setTranscriptDraft(extractTranscriptText(transcriptRes.data));
                }
              } catch (err) {
                logger.error("Failed to load transcript", err);
              }
            } else {
              logger.log("No transcript_result_id found in encounter");
            }

            // Restore medical codes
            try {
              const codesRes = await apiClient.codes.getSaved(searchEncounterId);
              const codesData = codesRes.data?.data || [];
              if (codesData) {
                logger.log("Restoring medical codes:", codesData);
                setSavedCodes(codesData);
                setSelectedCodes(codesData);
              }
            } catch {
              // It's okay if no codes exist yet
              logger.log("No saved codes found or failed to load");
            }

            setLoading(false);
          }
        })
        .catch((error) => {
          logger.error("Failed to load encounter", error);
          setError("Failed to load encounter");
          setLoading(false);
        });

    } else {
      setLoading(false);
    }

    // Restore step from URL
    if (parsedSearchStep !== null) {
      setCurrentStep((prev) =>
        prev === parsedSearchStep ? prev : parsedSearchStep,
      );
    }
  }, [searchEncounterId, parsedSearchStep]);

  useEffect(() => {
    if (searchPatientId && searchPatientId !== metadata.patientId) {
      setMetadata((prev) => ({ ...prev, patientId: searchPatientId }));
      loadSubscriber(searchPatientId);
    }
  }, [searchPatientId, metadata.patientId]);

  const loadSubscriber = async (patientId: string) => {
    setSubscriberLoading(true);
    setSubscriberError(null);
    try {
      const res = await apiClient.patients.getSubscriber(patientId);
      const subscriber = res.data?.data || null;
      if (subscriber) {
        const normalised = { ...subscriber, dob: subscriber.dob?.split("T")[0] || subscriber.dob };
        setMetadata((prev) => ({ ...prev, subscriber: normalised, relationship: "other" }));
      } else {
        setMetadata((prev) => ({ ...prev, subscriber: null, relationship: "self" }));
      }
    } catch (err) {
      logger.error("Failed to load subscriber", err);
      setSubscriberError("Failed to load subscriber info");
    } finally {
      setSubscriberLoading(false);
    }
  };

  const persistSubscriber = async () => {
    if (!metadata.patientId) return;
    if (!canWritePatients) return;
    setSubscriberSaving(true);
    setSubscriberError(null);
    try {
      if (metadata.relationship === "self") {
        setMetadata((prev) => ({ ...prev, subscriber: null }));
        return;
      }
      const sub = metadata.subscriber;
      const subPayload: SubscriberWritePayload = {
        full_name: sub?.full_name ?? "",
        dob: sub?.dob?.split("T")[0] ?? "",
        phone: sub?.phone ?? "",
        member_id: sub?.member_id ?? "",
        gender: sub?.gender || undefined,
        address_street: sub?.address_street || undefined,
        address_city: sub?.address_city || undefined,
        address_state: sub?.address_state || undefined,
        address_zip: sub?.address_zip || undefined,
        group_number: sub?.group_number || undefined,
        relationship: metadata.relationship || "other",
      };
      const res = await apiClient.patients.upsertSubscriber(metadata.patientId, subPayload);
      const saved = res.data?.data || res.data;
      // Normalise DOB back to YYYY-MM-DD so next save doesn't send ISO timestamp
      const normalisedSaved = { ...saved, dob: saved?.dob?.split("T")[0] || saved?.dob };
      setMetadata((prev) => ({ ...prev, subscriber: normalisedSaved }));
      await apiClient.patients.update(metadata.patientId, {
        insurance_relationship: metadata.relationship || "other",
        subscriber_id: saved?.id,
      });
    } catch (err) {
      logger.error("Failed to save subscriber", err);
      setSubscriberError("Failed to save subscriber info");
      throw err;
    } finally {
      setSubscriberSaving(false);
    }
  };

  // Helper to update URL with encounter ID and step
  const updateUrl = (id: string, step: number) => {
    if (searchEncounterId === id && parsedSearchStep === step) {
      return;
    }

    router.replace(`/dashboard/encounters/create?id=${id}&step=${step}`, {
      scroll: false,
    });
  };

  // Helper to handle step changes
  const handleStepChange = (step: number) => {
    setCurrentStep((prev) => (prev === step ? prev : step));
    if (encounterId) {
      updateUrl(encounterId, step);
    }
  };

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
          email: p.email,
          insuranceType: p.insurance_provider,
          insuranceId: p.insurance_member_id || p.insurance_policy_number,
          insurance_member_id: p.insurance_member_id,
          insurance_group_number: p.insurance_group_number,
          insurance_payer_id: p.insurance_payer_id,
          insurance_payer_name: p.insurance_payer_name,
          insurance_relationship: p.insurance_relationship,
          plan_name: p.plan_name,
          diagnosis: p.diagnosis,
          address_street: p.address_street,
          address_city: p.address_city,
          address_state: p.address_state,
          address_zip: p.address_zip,
        }))
        : [];

      setPatients(mappedPatients);
    } catch (err) {
      logger.error("Patient fetch failed.", err);
      setPatients([]);
      setPatientsError("Failed to load patients. Please try again.");
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleAudioSelected = async (file: File) => {
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscript(null);
    setTranscribeError(null);
    setSoap(null);

    if (!metadata.date || !metadata.patientId) {
      setTranscribeError("Select the patient and encounter date before uploading audio.");
      return;
    }

    setUploading(true);

    setUploadError(null);
    try {
      // Use existing encounterId or create new one
      let currentEncounterId = encounterId;

      if (!currentEncounterId) {
        const encounterRes = await apiClient.encounters.create({
          patient_id: metadata.patientId,
          date_of_service: metadata.date,
          status: "in_progress",
        });

        currentEncounterId = encounterRes.data?.data?.id || encounterRes.data?.id;
        if (!currentEncounterId) throw new Error("Failed to create encounter ID");
        setEncounterId(currentEncounterId);

        const params = new URLSearchParams(searchParams?.toString());
        params.set("id", currentEncounterId);
        router.replace(`/dashboard/encounters/create?${params.toString()}`);
      }

      const form = new FormData();
      form.append("audio", file);
      form.append("encounterId", currentEncounterId);

      const uploadRes = await apiClient.transcribe.uploadAudio(form, true);
      const key = uploadRes.data?.s3Key;

      if (!key) throw new Error("Failed to get S3 key from upload");
      setS3Key(key);
    } catch (err: any) {
      logger.error("Save failed", err);
      setTranscribeError(
        err?.response?.data?.error || err?.message || "Failed to upload audio.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!s3Key || !encounterId) {
      setTranscribeError(
        "Audio upload is not ready yet. Re-upload the audio and try again.",
      );
      return;
    }

    setTranscribing(true);
    setTranscribeError(null);

    try {
      const res = await apiClient.transcribe.transcribeS3({
        s3Key: s3Key,
        encounterId: encounterId,
      });

      const receivedTranscript =
        res.data?.transcript || res.data?.data?.transcript || res.data;
      const receivedSoap = res.data?.soap || res.data?.data?.soap || null;

      setTranscript(receivedTranscript);
      setTranscriptDraft(extractTranscriptText(receivedTranscript));
      setSoap(receivedSoap);
    } catch (err: any) {
      logger.error("Transcription failed", err);
      setTranscribeError(
        err?.response?.data?.error || err?.message || "Transcription failed.",
      );
    } finally {
      setTranscribing(false);
    }
  };

  const handleGenerateSoap = async () => {
    if (!encounterId) {
      return;
    }

    setGeneratingSoap(true);

    try {
      const transcriptText = transcriptDraft.trim();
      if (transcriptText) {
        await apiClient.transcribe.saveTranscript(encounterId, transcriptText);
        setTranscript({ text: transcriptText });
      }

      const res = await apiClient.soap.generateFromTranscript(encounterId);
      const responseData = res.data?.data || res.data;
      const soapData = responseData?.soap || responseData;

      setSoap(soapData);
    } catch (err: any) {
      logger.error("SOAP generation failed", err);
    } finally {
      setGeneratingSoap(false);
    }
  };

  const clearAudioState = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setTranscript(null);
    setTranscriptDraft("");
    setSoap(null);
    setUploadError(null);
    setTranscribeError(null);
  };

  const handleComplete = () => {
    if (metadata.patientId) {
      router.replace(`/dashboard/patients/${metadata.patientId}`);
    } else {
      router.replace("/dashboard/patients");
    }
  };

  const handleExit = () => {
    if (metadata.patientId) {
      router.replace(`/dashboard/patients/${metadata.patientId}`);
    } else {
      router.replace("/dashboard/patients");
    }
  };

  const handleSaveCodes = async () => {
    if (!encounterId) return;

    setSavingCodes(true);
    try {
      await apiClient.codes.save(encounterId, selectedCodes);
      setSavedCodes(selectedCodes);
      logger.log("Codes saved successfully");
    } catch (err) {
      logger.error("Failed to save codes", err);
    } finally {
      setSavingCodes(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!encounterId) return;
    const text = transcriptDraft.trim();
    if (!text) return;

    setSavingTranscript(true);
    try {
      await apiClient.transcribe.saveTranscript(encounterId, text);
      setTranscript({ text });
      setSoap(null); // force regeneration from edited transcript
    } catch (err) {
      logger.error("Failed to save transcript", err);
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleSaveSoap = async (updatedSoap: any) => {
    if (!encounterId) return;

    try {
      await apiClient.soap.update(encounterId, {
        soap: updatedSoap,
      });
      setSoap(updatedSoap);
    } catch (err) {
      logger.error("Failed to save SOAP note", err);
      throw err;
    }
  };

  const steps = [
    {
      name: "Patient Details",
      description: "Select patient and date",
      component: (
        <PatientDetailsStep
          metadata={metadata}
          setMetadata={setMetadata}
          patients={patients}
          loadingPatients={loadingPatients}
          patientsError={patientsError}
          loadSubscriber={loadSubscriber}
          subscriberLoading={subscriberLoading}
          subscriberError={subscriberError}
          subscriberSaving={subscriberSaving}
          encounterFieldErrors={encounterFieldErrors}
          lockedPatientId={searchPatientId}
        />
      ),
      canGoNext: (() => {
        if (!metadata.patientId || !metadata.date) return false;
        const p = patients.find((pt) => pt.id === metadata.patientId);
        if (!p) return false;
        if (p.insuranceType !== "SELF_PAY") {
          if (!p.insuranceType || !p.insuranceId) return false;
        }
        if (metadata.relationship !== "self") {
          const sub = metadata.subscriber;
          if (!sub?.full_name || !sub?.dob || !sub?.phone || !sub?.member_id) return false;
        }
        return true;
      })(),
      onNext: async () => {
        const validation = EncounterDetailsFormSchema.safeParse({
          patientId: metadata.patientId,
          date: metadata.date,
          encounterType: metadata.encounterType,
        });
        if (!validation.success) {
          const errs: Record<string, string> = {};
          validation.error.issues.forEach((err) => {
            const key = String(err.path[0]);
            if (key && !errs[key]) errs[key] = err.message;
          });
          setEncounterFieldErrors(errs);
          const first = validation.error.issues[0];
          throw new Error(first ? first.message : "Please fix encounter details");
        }
        
        if (metadata.relationship !== "self") {
          const subValidation = SubscriberFormSchema.safeParse(metadata.subscriber || {});
          if (!subValidation.success) {
            setSubscriberError("Please complete all required subscriber/insurance fields. Scroll down to fix errors.");
            throw new Error("Missing required subscriber fields");
          }
        }

        setEncounterFieldErrors({});

        // Validate patient insurance fields before any API call
        const selectedPatient = patients.find((p) => p.id === metadata.patientId);
        if (selectedPatient && selectedPatient.insuranceType !== "SELF_PAY") {
          const insuranceErrs: Record<string, string> = {};
          if (!selectedPatient.insuranceType) insuranceErrs.insurance_provider = "Insurance provider is required — update the patient profile";
          if (!selectedPatient.insuranceId) insuranceErrs.insurance_member_id = "Member / Policy ID is required — update the patient profile";
          if (Object.keys(insuranceErrs).length > 0) {
            setEncounterFieldErrors(insuranceErrs);
            throw new Error("This patient is missing required insurance information. Please update their profile first.");
          }
        }

        // Validate required subscriber fields
        if (metadata.relationship !== "self") {
          const subErrs: Record<string, string> = {};
          if (!metadata.subscriber?.full_name) subErrs.subscriber_full_name = "Subscriber name is required";
          if (!metadata.subscriber?.dob) subErrs.subscriber_dob = "Date of birth is required";
          if (!metadata.subscriber?.phone) subErrs.subscriber_phone = "Phone number is required";
          if (!metadata.subscriber?.member_id) subErrs.subscriber_member_id = "Member ID is required";
          if (Object.keys(subErrs).length > 0) {
            setEncounterFieldErrors((prev) => ({ ...prev, ...subErrs }));
            throw new Error("Please fill in all required subscriber fields.");
          }
        }

        // Step 1: Create or update encounter
        await persistSubscriber();
        try {
        if (!encounterId) {
          const res = await apiClient.encounters.create({
            patient_id: metadata.patientId,
            date_of_service: metadata.date,
            encounter_type: metadata.encounterType,
            chief_complaint: metadata.chiefComplaint,
            place_of_service: "11", // Default to office
            status: "draft",
          });
          const newId = res.data?.id || res.data?.data?.id;
          if (newId) {
            setEncounterId(newId);
            updateUrl(newId, 1);
          }
        } else {
          // Update existing encounter
          await apiClient.encounters.update(encounterId, {
            patient_id: metadata.patientId,
            date_of_service: metadata.date,
            encounter_type: metadata.encounterType,
            chief_complaint: metadata.chiefComplaint,
          });
        }
        } catch {
          throw new Error("Failed to save encounter. Please check all fields and try again.");
        }
      },
    },
    {
      name: "Transcription",
      description: "Record and transcribe audio",
      component: (
        <TranscriptionStep
          audioFile={audioFile}
          audioUrl={audioUrl}
          s3Key={s3Key}
          transcript={transcript}
          transcribeError={transcribeError}
          transcriptDraft={transcriptDraft}
          onTranscriptDraftChange={setTranscriptDraft}
          onSaveTranscript={handleSaveTranscript}
          savingTranscript={savingTranscript}
          uploading={uploading}
          uploadError={uploadError}
          transcribing={transcribing}
          onAudioSelected={handleAudioSelected}
          onClearAudio={clearAudioState}
          onTranscribe={handleTranscribe}
          allowedAudioTypes={allowedAudioTypes}
        />
      ),
      canGoNext: !!(transcript),
      onNext: async () => {
        // Step 2: Audio and transcript are already saved via handleAudioSelected and handleTranscribe
        // No additional save needed
      },
    },
    {
      name: "SOAP Note",
      description: "Generate SOAP note",
      component: (
        <SoapGenerationStep
          transcript={transcript}
          soap={soap}
          generatingSoap={generatingSoap}
          onGenerateSoap={handleGenerateSoap}
          onSaveSoap={handleSaveSoap}
        />
      ),
      canGoNext: !!soap,
      onNext: async () => {
        // Step 3: SOAP is already saved via handleGenerateSoap
        // No additional save needed
      },
    },
    {
      name: "Medical Codes",
      description: "Generate billing codes",
      component: (
        <MedicalCodesStep
          encounterId={encounterId}
          soap={soap}
          savedCodes={savedCodes}
          selectedCodes={selectedCodes}
          onSelectionChange={handleCodesSelected}
        />
      ),
      canGoNext: selectedCodes.some((c) => c.type === "ICD-10") && selectedCodes.some((c) => c.type === "CPT"),
      onNext: async () => {
        await handleSaveCodes();
      },
    },
    ...(canManageClaims ? [{
      name: "Review Claim",
      description: "Review and finalize",
      component: (
        <ReviewClaimStep
          encounterId={encounterId}
          onClaimChange={handleClaimChange}
          onValidationChange={setClaimValid}
          submitAttempt={claimSubmitAttempt}
        />
      ),
      canGoNext: true,
      onNext: async () => {
        if (!claimValid) {
          setClaimSubmitAttempt((n) => n + 1);
          throw new Error("Claim is missing required fields.");
        }
        // Step 5: Create or update claim, then finalize encounter status
        if (encounterId && claimDraft) {
          try {
            if (claimDraft.id) {
              await apiClient.claims.update(claimDraft.id, claimDraft);
            } else {
              const payload = { ...claimDraft, encounter_id: encounterId };
              const res = await apiClient.claims.create(payload);
              setClaimDraft(res.data?.data || res.data);
            }
          } catch (err) {
            logger.error("Failed to save claim", err);
            throw err;
          }
        }

        if (encounterId) {
          await apiClient.encounters.update(encounterId, {
            status: "ready",
          });
        }
      },
    }] : []),
  ];

  return (
    <WizardContainer
      steps={steps}
      onComplete={handleComplete}
      title="New Encounter"
      initialStep={currentStep}
      onStepChange={handleStepChange}
      onExit={handleExit}
    />
  );
}
