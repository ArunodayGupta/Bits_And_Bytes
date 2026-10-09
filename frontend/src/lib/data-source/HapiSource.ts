import { PatientDataSource, TimelineEvent, PrescriptionInfo, CareGapAlert } from './types';
import { injectRxIdsIntoBundle } from '../rxId';
import { parseFhirBundleToTimelineEvents } from './fhir-parser';
import { OfflineSource } from './OfflineSource';

export class HapiSource implements PatientDataSource {
    private parsedResources: TimelineEvent[] | null = null;
    private rawBundle: any = null;

    private async fetchAndProcess() {
        if (this.parsedResources) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
            const queryUrl = 'https://hapi.fhir.org/baseR4/Patient?_count=1&_revinclude=Encounter:patient&_revinclude=Condition:patient&_revinclude=Observation:patient&_revinclude=MedicationRequest:patient&_sort=-_lastUpdated';
            const response = await fetch(queryUrl, {
                signal: controller.signal,
                headers: { Accept: 'application/fhir+json, application/json' },
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Live FHIR responded with status: ${response.status}`);
            
            const data = await response.json();
            if (!data.entry || data.entry.length === 0) throw new Error('Live FHIR returned 0 records');

            this.rawBundle = data;
            const bundleCopy = JSON.parse(JSON.stringify(this.rawBundle));
            const { bundle: preparedBundle } = injectRxIdsIntoBundle(bundleCopy);
            
            this.parsedResources = parseFhirBundleToTimelineEvents(preparedBundle);
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    async getTimeline(abhaId: string, filter?: string, cursor?: string): Promise<{ items: TimelineEvent[], nextCursor: string | null }> {
        await this.fetchAndProcess();
        
        let filtered = this.parsedResources!;
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
        await this.fetchAndProcess();
        // Since we already fetched, we can use the same logic as OfflineSource for extraction.
        // It's slightly repetitive but acceptable.
        
        const meds = this.parsedResources!.filter(r => r.rxId === rxId && r.resourceType === 'MedicationRequest');
        if (meds.length === 0) throw new Error("Prescription not found");
        
        const rawMeds = meds.map(m => m.raw);
        let encounter = null;
        const firstMed: any = rawMeds[0];
        const encRef = firstMed.encounter?.reference;
        if (encRef) {
            const encEvent = this.parsedResources!.find(r => r.resourceType === 'Encounter' && (`urn:uuid:${r.id}` === encRef || `Encounter/${r.id}` === encRef));
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
        await this.fetchAndProcess();
        // We can just use the OfflineSource instance with our parsed resources to reuse the care gaps logic
        const offline = new OfflineSource();
        (offline as any).parsedResources = this.parsedResources;
        (offline as any).bundleProcessed = true;
        return offline.getCareGaps(abhaId);
    }
}
