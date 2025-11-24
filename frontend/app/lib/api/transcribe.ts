import api from "./axios";

export const transcribeApi = {
    uploadAudio: (formData: FormData, uploadOnly = false) => api.post(`/transcribe${uploadOnly ? '?upload_only=true' : ''}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    }),
    transcribeS3: (data: { s3Key: string; encounterId: string }) => api.post("/transcribe", data),
};
