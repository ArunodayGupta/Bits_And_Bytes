import { z } from 'zod';

export const TimelineItemSchema = z.object({
    id: z.string(),
    resource_type: z.string(),
    event_date: z.string().nullable(),
    title: z.string(),
    value: z.string().nullable(),
    rx_id: z.string().nullable(),
    raw_json: z.any()
});
export type TimelineItem = z.infer<typeof TimelineItemSchema>;

export const TimelineResponseSchema = z.object({
    items: z.array(TimelineItemSchema),
    next_cursor: z.string().nullable()
});
export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;

export const PatientMinimalSchema = z.object({
    name: z.string(),
    gender: z.string().nullable(),
    dob: z.string().nullable(),
    abha_id: z.string()
});
export type PatientMinimal = z.infer<typeof PatientMinimalSchema>;

export const PrescriptionResponseSchema = z.object({
    rx_id: z.string(),
    issued_on: z.string().nullable(),
    hospital: z.string().nullable(),
    doctor: z.string().nullable(),
    medications: z.array(z.any()),
    encounter: z.any().nullable(),
    patient: PatientMinimalSchema
});
export type PrescriptionResponse = z.infer<typeof PrescriptionResponseSchema>;

export const CareGapResponseSchema = z.object({
    code: z.string(),
    severity: z.string(),
    days_since: z.number().nullable(),
    last_value: z.string().nullable(),
    last_date: z.string().nullable(),
    message: z.string()
});
export type CareGapResponse = z.infer<typeof CareGapResponseSchema>;

export const HealthResponseSchema = z.object({
    status: z.string(),
    db: z.string(),
    version: z.string()
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
