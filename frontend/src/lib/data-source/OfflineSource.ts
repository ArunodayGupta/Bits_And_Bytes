import { PatientDataSource, TimelineEvent, PrescriptionInfo, CareGapAlert } from './types';
import bundle from '../../../../backend/fixtures/ramesh-kumar.bundle.json';
import { injectRxIdsIntoBundle } from '../rxId';
import { parseFhirBundleToTimelineEvents } from './fhir-parser';

export class OfflineSource implements PatientDataSource {
    private parsedResources: TimelineEvent[] = [];
    private bundleProcessed = false;
    private rawBundle = bundle;

    private processBundle() {
        if (this.bundleProcessed) return;

        const bundleCopy = JSON.parse(JSON.stringify(this.rawBundle));
        const { bundle: preparedBundle } = injectRxIdsIntoBundle(bundleCopy);
        
        this.parsedResources = parseFhirBundleToTimelineEvents(preparedBundle);
        this.bundleProcessed = true;
    }

    async getTimeline(abhaId: string, filter?: string, cursor?: string): Promise<{ items: TimelineEvent[], nextCursor: string | null }> {
        this.processBundle();
        
        let filtered = this.parsedResources;
        if (filter) {
            filtered = filtered.filter(item => item.resourceType === filter);
        }
        
        const limit = 50;
        const offset = cursor ? parseInt(cursor) : 0;
        
        const page = filtered.slice(offset, offset + limit);
        const nextCursor = offset + limit < filtered.length ? (offset + limit).toString() : null;
        
        return { items: page, nextCursor };
    }

    async getPrescription(rxId: string): Promise<PrescriptionInfo> {
        this.processBundle();
        
        const meds = this.parsedResources.filter(r => r.rxId === rxId && r.resourceType === 'MedicationRequest');
        if (meds.length === 0) {
            throw new Error("Prescription not found");
        }
        
        const rawMeds = meds.map(m => m.raw);
        let encounter = null;
        const firstMed: any = rawMeds[0];
        const encRef = firstMed.encounter?.reference;
        if (encRef) {
            const encEvent = this.parsedResources.find(r => r.resourceType === 'Encounter' && (`urn:uuid:${r.id}` === encRef || `Encounter/${r.id}` === encRef));
            if (encEvent) encounter = encEvent.raw;
        }

        const patientEntry = (this.rawBundle as any).entry.find((e: any) => e.resource.resourceType === 'Patient');
        const patientRaw = patientEntry?.resource || {};
        
        return {
            rx_id: rxId,
            issued_on: firstMed.authoredOn ? firstMed.authoredOn.split('T')[0] : null,
            hospital: encounter ? (encounter as any).serviceProvider?.display : null,
            doctor: firstMed.requester?.display || null,
            medications: rawMeds,
            encounter,
            patient: {
                name: patientRaw.name?.[0]?.text || "Unknown",
                gender: patientRaw.gender || null,
                dob: patientRaw.birthDate || null,
                abha_id: patientRaw.identifier?.find((i: any) => i.system?.includes('ndhm'))?.value || "Unknown"
            }
        };
    }

    async getCareGaps(abhaId: string): Promise<CareGapAlert[]> {
        this.processBundle();
        const gaps: CareGapAlert[] = [];
        let hasT2DM = false;
        let latestHbA1cDate: Date | null = null;
        let latestHbA1cVal: string | null = null;
        
        for (const item of this.parsedResources) {
            if (item.resourceType === 'Condition') {
                const raw = item.raw as any;
                const isT2dm = raw.code?.coding?.some((c: any) => c.system === 'http://snomed.info/sct' && c.code === '44054006');
                if (isT2dm) hasT2DM = true;
            }
            if (item.resourceType === 'Observation') {
                const raw = item.raw as any;
                const isHbA1c = raw.code?.coding?.some((c: any) => c.system === 'http://loinc.org' && c.code === '4548-4');
                if (isHbA1c && item.eventDate) {
                    const dt = new Date(item.eventDate);
                    if (!latestHbA1cDate || dt > latestHbA1cDate) {
                        latestHbA1cDate = dt;
                        latestHbA1cVal = item.value;
                    }
                }
            }
        }
        
        if (hasT2DM) {
            const now = new Date();
            let daysSince = null;
            if (latestHbA1cDate) {
                daysSince = Math.floor((now.getTime() - latestHbA1cDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            
            if (daysSince === null || daysSince > 180) {
                gaps.push({
                    code: 'HBA1C_OVERDUE',
                    severity: 'high',
                    days_since: daysSince,
                    last_value: latestHbA1cVal,
                    last_date: latestHbA1cDate ? latestHbA1cDate.toISOString() : null,
                    message: daysSince !== null ? `HbA1c test is overdue (last test was ${daysSince} days ago)` : "HbA1c test is missing"
                });
            }
        }
        return gaps;
    }
}
