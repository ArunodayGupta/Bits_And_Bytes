import React from 'react';
import {
  Pill,
  Droplet,
  Activity,
  Building2,
  ChevronRight,
  User,
  Clock,
} from 'lucide-react';
import type { TimelineEvent } from '@/lib/data-source/types';
import { RxBadge } from './RxBadge';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: TimelineEvent;
  onInspect: (event: TimelineEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onInspect }) => {
  // Config per event type
  const typeConfig: Record<string, any> = {
    MedicationRequest: {
      label: 'Medication',
      icon: Pill,
      iconContainerClass: 'bg-[#E6EEF6] text-[#3F6F9E] dark:bg-[#1E2A36] dark:text-[#8DB6DC]',
      badgeClass: 'border-[#3F6F9E]/30 text-[#3F6F9E] dark:text-[#8DB6DC]',
    },
    Observation: {
      label: 'Lab Result',
      icon: Droplet,
      iconContainerClass: 'bg-[#F7E6E2] text-[#B5473B] dark:bg-[#34211E] dark:text-[#E58B7F]',
      badgeClass: 'border-[#B5473B]/30 text-[#B5473B] dark:text-[#E58B7F]',
    },
    Condition: {
      label: 'Condition',
      icon: Activity,
      iconContainerClass: 'bg-[#F8EDD2] text-[#A9741A] dark:bg-[#332A15] dark:text-[#E3B35A]',
      badgeClass: 'border-[#A9741A]/30 text-[#A9741A] dark:text-[#E3B35A]',
    },
    Encounter: {
      label: 'Encounter',
      icon: Building2,
      iconContainerClass: 'bg-[#ECE9DF] text-[#5E665F] dark:bg-[#262B26] dark:text-[#B7BEB4]',
      badgeClass: 'border-[#5E665F]/30 text-[#5E665F] dark:text-[#B7BEB4]',
    },
  };

  const config = typeConfig[event.resourceType] || typeConfig['Encounter'];
  const IconComponent = config.icon;

  const raw = event.raw as any;
  let doctor = null;
  let hospital = null;
  let badge = null;
  let dateTimeRaw = event.eventDate;

  if (event.resourceType === 'MedicationRequest') {
      doctor = raw.requester?.display;
  } else if (event.resourceType === 'Encounter') {
      doctor = raw.participant?.[0]?.individual?.display;
      hospital = raw.serviceProvider?.display;
      badge = raw.class?.code;
  } else if (event.resourceType === 'Observation') {
      badge = raw.code?.coding?.[0]?.code ? `LOINC: ${raw.code?.coding[0].code}` : null;
  } else if (event.resourceType === 'Condition') {
      badge = raw.code?.coding?.[0]?.code ? `SNOMED: ${raw.code?.coding[0].code}` : null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onInspect(event)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspect(event);
        }
      }}
      aria-label={`View FHIR details for ${event.title}`}
      className="group relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-20 border border-hairline bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-moss-500 hover:shadow-elevated cursor-pointer text-left"
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105 ${config.iconContainerClass}`}
        >
          <IconComponent className="h-5 w-5" />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              {config.label}
            </span>

            {badge && !event.rxId && (
              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-2 py-0 ${config.badgeClass}`}
              >
                {badge}
              </Badge>
            )}

            {dateTimeRaw && (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
                <Clock className="h-3 w-3" />
                {new Date(dateTimeRaw).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-base text-ink leading-snug group-hover:text-moss-600 transition-colors">
            {event.title}
          </h3>

          {event.value && (
            <p className="text-sm text-ink-soft leading-relaxed break-words">
              {event.value}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft pt-1">
            {doctor && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-moss-600" />
                <span>{doctor}</span>
              </span>
            )}

            {hospital && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-stone-500" />
                <span>{hospital}</span>
              </span>
            )}
          </div>

          {event.rxId && (
            <div className="mt-2 pt-2 border-t border-hairline/60">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-soft block mb-1">
                Prescription ID (ABDM Token)
              </span>
              <RxBadge rxId={event.rxId} />
            </div>
          )}
        </div>
      </div>

      {/* Inspect button indicator */}
      <div className="hidden sm:flex items-center self-center shrink-0 pl-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft opacity-0 group-hover:opacity-100 group-hover:text-moss-600 transition-all">
          <span>Inspect</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
};
