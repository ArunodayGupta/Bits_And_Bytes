import { PatientDataSource, TimelineEvent, PrescriptionInfo, CareGapAlert } from './types';
import * as api from '../api/endpoints';

export class BackendSource implements PatientDataSource {
    async getTimeline(abhaId: string, filter?: string, cursor?: string): Promise<{ items: TimelineEvent[], nextCursor: string | null }> {
        const res = await api.getTimeline(abhaId, filter, 50, cursor);
        const items: TimelineEvent[] = res.items.map(item => ({
            id: item.id,
            resourceType: item.resource_type,
            eventDate: item.event_date,
            title: item.title,
            value: item.value,
            rxId: item.rx_id,
            raw: item.raw_json
        }));
        return { items, nextCursor: res.next_cursor };
    }

    async getPrescription(rxId: string): Promise<PrescriptionInfo> {
        const res = await api.getPrescription(rxId);
        return {
            rx_id: res.rx_id,
            issued_on: res.issued_on,
            hospital: res.hospital,
            doctor: res.doctor,
            medications: res.medications,
            encounter: res.encounter,
            patient: {
                name: res.patient.name,
                gender: res.patient.gender,
                dob: res.patient.dob,
                abha_id: res.patient.abha_id
            }
        };
    }

    async getCareGaps(abhaId: string): Promise<CareGapAlert[]> {
        const res = await api.getCareGaps(abhaId);
        return res.map(gap => ({
            code: gap.code,
            severity: gap.severity,
            days_since: gap.days_since,
            last_value: gap.last_value,
            last_date: gap.last_date,
            message: gap.message
        }));
    }
}
