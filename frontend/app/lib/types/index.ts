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
    diagnosis: string;
    dob?: string;
    email?: string;
    phone?: string;
    insuranceType?: string;
    insuranceId?: string;
    diagnosisType?: string;
    lastVisit?: string;
    status?: "Active" | "Archived";
}
