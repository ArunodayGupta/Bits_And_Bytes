import rameshBundle from './ramesh-kumar.bundle.json';
import priyaBundle from './priya-sharma.bundle.json';
import arunBundle from './arun-patel.bundle.json';
import sunitaBundle from './sunita-verma.bundle.json';
import vikramBundle from './vikram-malhotra.bundle.json';
import ananyaBundle from './ananya-deshmukh.bundle.json';
import type { FhirBundle } from '@/lib/fhir/types';

export interface PatientProfile {
  id: string;
  name: string;
  abha: string;
  age: number;
  gender: 'male' | 'female';
  primaryConditions: string[];
  facility: string;
  doctor: string;
  sampleRxId: string;
  careGapStatus: 'Controlled' | 'Moderate Gap' | 'Severe Gap' | 'Missing Test' | 'Non-Diabetic';
  bundle: FhirBundle;
}

export const PATIENT_PROFILES: PatientProfile[] = [
  {
    id: 'ramesh-kumar',
    name: 'Ramesh Kumar',
    abha: '91-1234-5678-9012',
    age: 52,
    gender: 'male',
    primaryConditions: ['Type 2 Diabetes', 'Hypertension'],
    facility: 'Apollo Hospitals',
    doctor: 'Dr. Rajesh Rao',
    sampleRxId: 'APL-RR-1410-RAME',
    careGapStatus: 'Moderate Gap',
    bundle: rameshBundle as unknown as FhirBundle,
  },
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    abha: '91-2345-6789-0123',
    age: 46,
    gender: 'female',
    primaryConditions: ['T2DM', 'Hypothyroidism'],
    facility: 'Fortis Healthcare',
    doctor: 'Dr. Sunita Sharma',
    sampleRxId: 'FRT-SS-1809-PRIY',
    careGapStatus: 'Controlled',
    bundle: priyaBundle as unknown as FhirBundle,
  },
  {
    id: 'arun-patel',
    name: 'Arun Patel',
    abha: '91-3456-7890-1234',
    age: 63,
    gender: 'male',
    primaryConditions: ['Coronary Artery Disease', 'Hypertension', 'Dyslipidemia'],
    facility: 'Manipal Hospital',
    doctor: 'Dr. Amit Sen',
    sampleRxId: 'MNP-AS-0511-ARUN',
    careGapStatus: 'Non-Diabetic',
    bundle: arunBundle as unknown as FhirBundle,
  },
  {
    id: 'sunita-verma',
    name: 'Sunita Verma',
    abha: '91-4567-8901-2345',
    age: 38,
    gender: 'female',
    primaryConditions: ['Bronchial Asthma', 'Allergic Rhinitis'],
    facility: 'MedCare Clinic',
    doctor: 'Dr. Priya Nair',
    sampleRxId: 'MDC-PN-1208-SUNI',
    careGapStatus: 'Non-Diabetic',
    bundle: sunitaBundle as unknown as FhirBundle,
  },
  {
    id: 'vikram-malhotra',
    name: 'Vikram Malhotra',
    abha: '91-5678-9012-3456',
    age: 57,
    gender: 'male',
    primaryConditions: ['T2DM', 'CKD Stage 2', 'Diabetic Nephropathy'],
    facility: 'AIIMS New Delhi',
    doctor: 'Dr. Rajesh Rao',
    sampleRxId: 'AMS-RR-2207-VIKR',
    careGapStatus: 'Missing Test',
    bundle: vikramBundle as unknown as FhirBundle,
  },
  {
    id: 'ananya-deshmukh',
    name: 'Ananya Deshmukh',
    abha: '91-6789-0123-4567',
    age: 51,
    gender: 'female',
    primaryConditions: ['T2DM', 'Hypertension', 'Knee Osteoarthritis'],
    facility: 'Apollo Hospitals',
    doctor: 'Dr. Rajesh Rao',
    sampleRxId: 'APL-RR-1410-ANAN',
    careGapStatus: 'Severe Gap',
    bundle: ananyaBundle as unknown as FhirBundle,
  },
];

export const DEFAULT_PATIENT_PROFILE = PATIENT_PROFILES[0];
