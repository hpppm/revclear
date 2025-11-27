export interface User {
    id: string;
    email: string;
    name: string;
    practitionerType?: string;
    licenseId?: string;
}

export interface Patient {
    id: string;
    name: string;
    age: number;
    diagnosis?: string;
    dob?: string;
    email?: string;
    phone?: string;
    insuranceType?: string;
    insuranceId?: string;
    lastVisit?: string;
    status?: "Active" | "Archived";
}

export type ClaimStatus = "draft" | "submitted" | "approved" | "denied";

export interface ClaimCode {
    code: string;
    description: string;
    type: "CPT" | "ICD-10";
    amount?: number;
}

export interface Claim {
    claimNumber: string;
    status: ClaimStatus;
    dateOfService: string;
    patient: {
        id: string;
        name: string;
        insurance?: string;
    };
    provider: {
        name: string;
        npi: string;
    };
    facility: string;
    codes: ClaimCode[];
    notes?: string;
}
