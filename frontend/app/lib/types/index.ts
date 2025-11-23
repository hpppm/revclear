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
    lastVisit?: string;
    status?: "Active" | "Archived";
}
