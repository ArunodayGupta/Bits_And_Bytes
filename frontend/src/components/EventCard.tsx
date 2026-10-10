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
import type { TimelineEvent } from '@/lib/fhir/types';
import { RxBadge } from './RxBadge';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: TimelineEvent;
  onInspect: (event: TimelineEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onInspect }) => {
  // Config per event type
  const typeConfig = {
    medication: {
      label: 'Medication',
      icon: Pill,
      iconContainerClass: 'bg-[#E6EEF6] text-[#3F6F9E] dark:bg-[#1E2A36] dark:text-[#8DB6DC]',
      badgeClass: 'border-[#3F6F9E]/30 text-[#3F6F9E] dark:text-[#8DB6DC]',
    },
    lab: {
      label: 'Lab Result',
      icon: Droplet,
      iconContainerClass: 'bg-[#F7E6E2] text-[#B5473B] dark:bg-[#34211E] dark:text-[#E58B7F]',
      badgeClass: 'border-[#B5473B]/30 text-[#B5473B] dark:text-[#E58B7F]',
    },
    condition: {
      label: 'Condition',
      icon: Activity,
      iconContainerClass: 'bg-[#F8EDD2] text-[#A9741A] dark:bg-[#332A15] dark:text-[#E3B35A]',
      badgeClass: 'border-[#A9741A]/30 text-[#A9741A] dark:text-[#E3B35A]',
    },
    encounter: {
      label: 'Encounter',
      icon: Building2,
      iconContainerClass: 'bg-[#ECE9DF] text-[#5E665F] dark:bg-[#262B26] dark:text-[#B7BEB4]',
      badgeClass: 'border-[#5E665F]/30 text-[#5E665F] dark:text-[#B7BEB4]',
    },
  }[event.type];

  const IconComponent = typeConfig.icon;

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
        {/* 40px tinted icon tile */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105 ${typeConfig.iconContainerClass}`}
        >
          <IconComponent className="h-5 w-5" />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {/* Header row: event type & badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              {typeConfig.label}
            </span>

            {event.source === 'ocr_scan' && (
              <Badge
                variant="outline"
                title="Patient-uploaded, not lab-verified"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium px-2 py-0 cursor-help"
              >
                Scanned
              </Badge>
            )}

            {event.badge && !event.rxId && (
              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-2 py-0 ${typeConfig.badgeClass}`}
              >
                {event.badge}
              </Badge>
            )}

            {event.dateTimeRaw && (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
                <Clock className="h-3 w-3" />
                {new Date(event.dateTimeRaw).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base text-ink leading-snug group-hover:text-moss-600 transition-colors">
            {event.title}
          </h3>

          {/* Subtitle / Dosage / Clinical status */}
          {event.subtitle && (
            <p className="text-sm text-ink-soft leading-relaxed break-words">
              {event.subtitle}
            </p>
          )}

          {/* Clinician & facility info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft pt-1">
            {event.doctor && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-moss-600" />
                <span>{event.doctor}</span>
              </span>
            )}

            {event.hospital && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-stone-500" />
                <span>{event.hospital}</span>
              </span>
            )}
          </div>

          {/* Speakable Rx-ID Badge if medication */}
          {event.rxId && (
            <div className="mt-2 pt-2 border-t border-hairline/60">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-soft block mb-1">
                Prescription Code
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
