import { TimelineEvent, PrescriptionInfo, CareGapAlert } from './types';
import { extractConceptDisplay } from '../fhir/buildTimeline';

export function parseFhirBundleToTimelineEvents(bundle: any): TimelineEvent[] {
    const items: TimelineEvent[] = [];
    
    const encounterHospitalMap = new Map<string, string>();
    for (const entry of bundle.entry || []) {
        if (entry.resource.resourceType === 'Encounter') {
            const hosp = entry.resource.serviceProvider?.display || 'Medical Center';
            if (entry.resource.id) {
                encounterHospitalMap.set(entry.resource.id, hosp);
                encounterHospitalMap.set(`urn:uuid:${entry.resource.id}`, hosp);
                encounterHospitalMap.set(`Encounter/${entry.resource.id}`, hosp);
            }
        }
    }
    
    for (const entry of bundle.entry || []) {
        const res = entry.resource;
        const resType = res.resourceType;
        let date: string | null = null;
        let title = 'Unknown';
        let value: string | null = null;
        let rxId: string | null = null;

        if (resType === 'Encounter') {
            date = res.period?.start || null;
            title = res.class?.display ? `${res.class.display} Consultation` : 'Clinical Consultation';
            value = res.serviceProvider?.display || 'Medical Center';
        } else if (resType === 'Condition') {
            date = res.recordedDate || res.onsetDateTime || null;
            title = extractConceptDisplay(res.code, 'Diagnosed Condition');
            value = res.clinicalStatus?.coding?.[0]?.code || 'active';
        } else if (resType === 'Observation') {
            date = res.effectiveDateTime || res.issued || res.effectivePeriod?.start || null;
            title = extractConceptDisplay(res.code, 'Lab Observation');
            if (res.component) {
                let sys, dia, unit;
                for (const comp of res.component) {
                    const code = comp.code?.coding?.[0]?.code;
                    if (code === '8480-6') sys = comp.valueQuantity?.value;
                    if (code === '8462-4') dia = comp.valueQuantity?.value;
                    if (comp.valueQuantity?.unit) unit = comp.valueQuantity.unit;
                }
                if (sys !== undefined && dia !== undefined) {
                    value = `${sys}/${dia} ${unit || 'mmHg'}`;
                }
            } else if (res.valueQuantity) {
                value = `${res.valueQuantity.value} ${res.valueQuantity.unit || res.valueQuantity.code || ''}`.trim();
            } else if (res.valueString) {
                value = res.valueString;
            }
        } else if (resType === 'MedicationRequest') {
            date = res.authoredOn || null;
            title = extractConceptDisplay(res.medicationCodeableConcept, 'Prescribed Medication');
            value = res.dosageInstruction?.[0]?.text || null;
            
            const rxTokenIdentifier = res.identifier?.find(
                (id: any) => id.system === 'https://phr-demo.example.org/rx-token' || id.system === 'https://abdm.gov.in/rx-token'
            );
            rxId = rxTokenIdentifier?.value || null;
        } else {
            continue;
        }

        items.push({
            id: res.id || Math.random().toString(),
            resourceType: resType,
            eventDate: date,
            title,
            value,
            rxId,
            raw: res
        });
    }
    
    return items.sort((a, b) => {
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return b.eventDate.localeCompare(a.eventDate);
    });
}
