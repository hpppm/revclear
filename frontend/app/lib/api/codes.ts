import api from "./axios";
import { MedicalCode } from "../types";

export const codesApi = {
    // Get AI code suggestions based on SOAP note
    match: (encounterId: string) =>
        api.post<{ data: { icdMatches: MedicalCode[], cptMatches: MedicalCode[] } }>(`/encounters/${encounterId}/codes/match`),

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
        return api.post(`/encounters/${encounterId}/codes`, { codes: payload });
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
            response = await api.get<{ data: RawCode[] }>(`/encounters/${encounterId}/codes`);
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
