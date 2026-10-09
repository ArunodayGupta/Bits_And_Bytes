import { TimelineEvent } from './types';

export interface TimelineDateGroup {
    date: string;
    displayDate: string;
    hospitalNames: string[];
    events: TimelineEvent[];
}

export function formatDisplayDate(dateKey: string): string {
    if (dateKey === 'Undated') return 'Undated Records';
    try {
        const [y, m, d] = dateKey.split('-').map(Number);
        if (!y || !m || !d) return dateKey;
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateKey;
    }
}

export function extractLocalDateString(dateStr?: string | null): string {
    if (!dateStr) return 'Undated';
    const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Undated';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return 'Undated';
    }
}

export function buildTimelineFromEvents(events: TimelineEvent[]): TimelineDateGroup[] {
    const groupsByDate = new Map<string, TimelineEvent[]>();
    for (const ev of events) {
        const d = extractLocalDateString(ev.eventDate);
        if (!groupsByDate.has(d)) groupsByDate.set(d, []);
        groupsByDate.get(d)!.push(ev);
    }

    const dateGroups: TimelineDateGroup[] = [];
    for (const [dateKey, groupedEvents] of groupsByDate.entries()) {
        const priorityMap: Record<string, number> = {
            'Encounter': 1,
            'Condition': 2,
            'Observation': 3,
            'MedicationRequest': 4,
        };

        groupedEvents.sort((a, b) => {
            const pA = priorityMap[a.resourceType] ?? 5;
            const pB = priorityMap[b.resourceType] ?? 5;
            return pA - pB;
        });

        const hospitalSet = new Set<string>();
        for (const ev of groupedEvents) {
            if (ev.resourceType === 'Encounter' && ev.value) hospitalSet.add(ev.value);
            // In the old code, Meds also had hospitals, but we'll stick to encounters.
        }

        dateGroups.push({
            date: dateKey,
            displayDate: formatDisplayDate(dateKey),
            hospitalNames: Array.from(hospitalSet),
            events: groupedEvents,
        });
    }

    dateGroups.sort((a, b) => {
        if (a.date === 'Undated') return 1;
        if (b.date === 'Undated') return -1;
        return b.date.localeCompare(a.date);
    });

    return dateGroups;
}

export interface TrendPoint {
  date: string;
  displayDate: string;
  value: number;
  unit: string;
}

export interface TrendSeries {
  code: string;
  name: string;
  unit: string;
  points: TrendPoint[];
}

export function extractObservationTrends(groups: TimelineDateGroup[]): TrendSeries[] {
    const seriesMap = new Map<string, TrendPoint[]>();
    const metaMap = new Map<string, { name: string; unit: string }>();

    for (const group of groups) {
        for (const event of group.events) {
            if (event.resourceType === 'Observation' && event.value && group.date !== 'Undated') {
                const match = event.value.match(/^([\d.]+)\s*(.*)$/);
                if (match) {
                    const numericValue = parseFloat(match[1]);
                    if (!isNaN(numericValue)) {
                        const testCode = event.title;
                        const unit = match[2];

                        if (!seriesMap.has(testCode)) {
                            seriesMap.set(testCode, []);
                            metaMap.set(testCode, { name: testCode, unit });
                        }

                        seriesMap.get(testCode)!.push({
                            date: group.date,
                            displayDate: group.displayDate,
                            value: numericValue,
                            unit,
                        });
                    }
                }
            }
        }
    }

    const result: TrendSeries[] = [];
    for (const [code, points] of seriesMap.entries()) {
        if (points.length >= 2) {
            points.sort((a, b) => a.date.localeCompare(b.date));
            const meta = metaMap.get(code)!;
            result.push({
                code,
                name: meta.name,
                unit: meta.unit,
                points,
            });
        }
    }
    return result;
}
