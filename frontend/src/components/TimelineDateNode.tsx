import React from 'react';
import { Building2 } from 'lucide-react';
import type { TimelineDateGroup, TimelineEvent } from '@/lib/fhir/types';
import { EventCard } from './EventCard';
import { SavingsCard } from './SavingsCard';

interface TimelineDateNodeProps {
  group: TimelineDateGroup;
  onInspect: (event: TimelineEvent) => void;
}

export const TimelineDateNode: React.FC<TimelineDateNodeProps> = ({
  group,
  onInspect,
}) => {
  // Format date parts: "14 Oct 2024" -> "14 Oct" and italic "2024"
  const dateParts = group.displayDate.split(' ');
  const hasYear = dateParts.length === 3;
  const dayMonth = hasYear ? `${dateParts[0]} ${dateParts[1]}` : group.displayDate;
  const year = hasYear ? dateParts[2] : '';

  const medicationEvents = group.events.filter((e) => e.type === 'medication');
  const rxId = medicationEvents[0]?.rxId;

  return (
    <div className="relative mb-12 last:mb-0">
      {/* Date Header Node */}
      <div className="sticky top-20 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 bg-paper/90 backdrop-blur-md py-2 px-1 border-b border-hairline/80">
        <div className="flex items-center gap-3">
          {/* Timeline node dot */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-2 border-2 border-moss-500 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-moss-600" />
          </div>

          <h3 className="font-serif text-2xl font-normal text-ink">
            {dayMonth}{' '}
            {year && <span className="italic font-normal text-moss-600">{year}</span>}
          </h3>
        </div>

        {/* Hospital names and Prescription ID pills */}
        <div className="flex flex-wrap items-center gap-2">
          {rxId && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-moss-500/30 bg-moss-50 dark:bg-moss-950/40 px-3 py-1 text-xs text-moss-700 dark:text-moss-300 font-mono font-bold shadow-xs">
              <span className="text-[10px] uppercase font-sans font-semibold text-ink-soft">Rx-ID:</span>
              <span>{rxId}</span>
            </span>
          )}
          {group.hospitalNames.length > 0 &&
            group.hospitalNames.map((hosp, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-2 px-3 py-1 text-xs text-ink-soft"
              >
                <Building2 className="h-3 w-3 text-stone-500" />
                <span>{hosp}</span>
              </span>
            ))}
        </div>
      </div>

      {/* Events inside this date node */}
      <div className="grid grid-cols-1 gap-4 pl-3 sm:pl-8">
        {rxId && <SavingsCard rxId={rxId} defaultExpanded={false} />}
        {group.events.map((event) => (
          <EventCard
            key={event.id}
            event={event.type === 'medication' && !event.rxId && rxId ? { ...event, rxId } : event}
            onInspect={onInspect}
          />
        ))}
      </div>
    </div>
  );
};
