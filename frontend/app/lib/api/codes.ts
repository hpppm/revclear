import { z } from "zod";
import api from "./axios";
import { MedicalCode } from "../types";

const UUID = z.string().uuid("Invalid encounter ID format");
const safeId = (id: string) => encodeURIComponent(UUID.parse(id));

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export const codesApi = {
    // Get AI code suggestions based on SOAP note.
    // POST returns 202 with jobId; polls status until done or error.
    match: async (encounterId: string): Promise<{ data: { data: { icdMatches: MedicalCode[], cptMatches: MedicalCode[] } } }> => {
        const postResponse = await api.post<{ data: { jobId: string; status: string } }>(
            `/encounters/${safeId(encounterId)}/codes/match`,
        );
        const { jobId } = postResponse.data.data;

        for (let poll = 0; poll < MAX_POLLS; poll++) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

            const statusResponse = await api.get<{
                success: boolean;
                data: { status: string; result?: { icdMatches: MedicalCode[]; cptMatches: MedicalCode[] } };
                error?: string;
            }>(`/encounters/${safeId(encounterId)}/codes/match/status/${encodeURIComponent(jobId)}`);

            const { data: statusData } = statusResponse.data;

            if (statusData.status === "done" && statusData.result) {
                return { data: { data: { icdMatches: statusData.result.icdMatches, cptMatches: statusData.result.cptMatches } } };
            }

            if (statusData.status === "error") {
                throw new Error(statusResponse.data.error ?? "Code matching failed");
            }
            // status === "pending" — continue polling
        }

        throw new Error("Code matching timed out waiting for results. Please try again.");
    },

    // Manual search for codes
    search: (query: string, type: "icd" | "cpt") =>
        api.get<{ data: MedicalCode[] }>(`/codes/search?q=${encodeURIComponent(query)}&type=${type}`),

    // Save selected codes for an encounter
    save: (encounterId: string, codes: MedicalCode[]) => {
        const payload = codes.map(c => ({
            code: c.code,
            codeType: c.type === "ICD-10" ? "ICD" : "CPT",
            description: c.description,
            category: c.category || "Unspecified",
            // Convert confidence from percentage (0-100) to decimal (0-1) for database
            confidence: c.confidence !== undefined ? c.confidence / 100 : undefined,
            isAiSuggested: !!c.confidence, // Assume AI suggested if confidence exists
        }));
        return api.post(`/encounters/${safeId(encounterId)}/codes`, { codes: payload });
    },

    // Get saved codes for an encounter
    getSaved: async (encounterId: string) => {
        interface RawCode {
            id: string;
            code_type: string;
            code: string;
            description: string;
            category: string;
            confidence_score?: number;
            is_ai_suggested: boolean;
        }

        let response;
        try {
            response = await api.get<{ data: RawCode[] }>(`/encounters/${safeId(encounterId)}/codes`);
        } catch (error: unknown) {
            // If no codes are saved yet, the API may return 404; treat that as "no codes"
            const status = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;
            if (status === 404) {
                return { data: { data: [] as MedicalCode[] } };
            }
            throw error;
        }

        const transformedData: MedicalCode[] = response.data.data.map((c) => ({
            id: c.id,
            type: (c.code_type === "ICD" ? "ICD-10" : "CPT") as "ICD-10" | "CPT",
            code: c.code,
            description: c.description,
            category: c.category,
            confidence: c.confidence_score ? Number(c.confidence_score) : undefined,
            source: c.is_ai_suggested ? "AI" : "Manual",
        }));
        return { data: { data: transformedData } };
    },
};
