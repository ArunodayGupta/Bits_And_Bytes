export type TimelineEvent = {
    id: string;
    resourceType: string;
    eventDate: string | null;
    title: string;
    value: string | null;
    rxId: string | null;
    raw: unknown;
};

export type PatientMinimal = {
    name: string;
    gender: string | null;
    dob: string | null;
    abha_id: string;
};

export type PrescriptionInfo = {
    rx_id: string;
    issued_on: string | null;
    hospital: string | null;
    doctor: string | null;
    medications: unknown[];
    encounter: unknown | null;
    patient: PatientMinimal;
};

export type CareGapAlert = {
    code: string;
    severity: string;
    days_since: number | null;
    last_value: string | null;
    last_date: string | null;
    message: string;
};

export interface PatientDataSource {
    getTimeline(abhaId: string, filter?: string, cursor?: string): Promise<{ items: TimelineEvent[], nextCursor: string | null }>;
    getPrescription(rxId: string): Promise<PrescriptionInfo>;
    getCareGaps(abhaId: string): Promise<CareGapAlert[]>;
}
