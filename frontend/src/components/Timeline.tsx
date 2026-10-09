import React, { useMemo } from 'react';
import { Search, Pill, Droplet, Activity, Building2, SlidersHorizontal, Sparkles } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { useTimeline } from '@/hooks/useTimeline';
import { TimelineDateNode } from './TimelineDateNode';
import { ObservationTrend } from './ObservationTrend';
import { buildTimelineFromEvents, extractObservationTrends, TimelineDateGroup } from '@/lib/data-source/timeline-utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimelineEvent } from '@/lib/data-source/types';

export const Timeline: React.FC = () => {
  const {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    setSelectedResource,
  } = usePatientData();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTimeline();

  const handleInspect = (event: TimelineEvent) => {
    setSelectedResource(event.raw);
  };

  const allItems = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || [];
  }, [data]);

  const timelineGroups = useMemo(() => {
    return buildTimelineFromEvents(allItems);
  }, [allItems]);

  // Filtered timeline based on active filter chip and search query (run client-side over loaded items)
  const filteredTimelineGroups = useMemo(() => {
    if (!timelineGroups.length) return [];
    const lowerQuery = searchQuery.trim().toLowerCase();

    return timelineGroups
      .map((group) => {
        const filteredEvents = group.events.filter((ev) => {
          if (!lowerQuery) return true;
          const matchesTitle = ev.title.toLowerCase().includes(lowerQuery);
          const matchesValue = ev.value?.toLowerCase().includes(lowerQuery);
          const matchesRx = ev.rxId?.toLowerCase().includes(lowerQuery);
          return matchesTitle || matchesValue || matchesRx;
        });

        return { ...group, events: filteredEvents };
      })
      .filter((group) => group.events.length > 0);
  }, [timelineGroups, searchQuery]);

  const trendSeries = useMemo(() => {
    return extractObservationTrends(timelineGroups);
  }, [timelineGroups]);

  const filterOptions: Array<{ id: string; label: string; icon: React.ElementType }> = [
    { id: 'all', label: 'All Records', icon: SlidersHorizontal },
    { id: 'MedicationRequest', label: 'Medications', icon: Pill },
    { id: 'Observation', label: 'Lab Tests', icon: Droplet },
    { id: 'Condition', label: 'Conditions', icon: Activity },
    { id: 'Encounter', label: 'Encounters', icon: Building2 },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto py-8">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <Skeleton className="h-11 w-72 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-36 rounded-20" />
          <Skeleton className="h-36 rounded-20" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-20" />
          <Skeleton className="h-28 rounded-20" />
          <Skeleton className="h-28 rounded-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-4xl mx-auto py-4">
      {/* Search Bar & Filter Controls */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagnoses, medications, labs, or hospitals..."
              aria-label="Search patient medical history"
              className="h-11 w-full rounded-full border border-hairline bg-card pl-11 pr-4 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-teal-700 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick counts */}
          <div className="flex items-center gap-2 text-xs text-ink-soft self-start sm:self-center font-medium">
            <Sparkles className="h-3.5 w-3.5 text-moss-600" />
            <span>
              Showing {filteredTimelineGroups.reduce((acc: number, g: TimelineDateGroup) => acc + g.events.length, 0)} events
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveFilter(opt.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-moss-600 text-white shadow-sm'
                    : 'bg-card text-ink border border-hairline hover:bg-paper-2 hover:border-moss-500/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mini Trend Sparklines */}
      {trendSeries.length > 0 && activeFilter !== 'MedicationRequest' && activeFilter !== 'Encounter' && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow-pill text-[10px]">
              <span className="eyebrow-dot" />
              Longitudinal Biomarker Trends
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trendSeries.map((series) => (
              <ObservationTrend key={series.code} series={series} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline Section */}
      {filteredTimelineGroups.length === 0 ? (
        /* Friendly Empty State with botanical SVG leaf */
        <div className="flex flex-col items-center justify-center rounded-28 border border-hairline bg-card p-12 text-center shadow-soft">
          <svg
            className="h-16 w-16 text-moss-500/60 mb-4"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 52c16-2 32-18 36-36C32 20 16 36 12 52z" />
            <path d="M22 42c8-8 16-16 22-22" />
            <path d="M12 52L8 56" />
          </svg>
          <h3 className="font-serif text-2xl font-normal text-ink mb-2">
            No matching records <span className="italic">found</span>
          </h3>
          <p className="max-w-md text-sm text-ink-soft mb-4">
            We couldn't find any clinical records matching "{searchQuery}". Try adjusting your filters or search keywords.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
            className="rounded-full bg-paper-2 border border-hairline px-4 py-2 text-xs font-medium text-ink hover:bg-moss-100/50"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical spine line */}
          <div className="absolute left-[13px] sm:left-[13px] top-6 bottom-6 w-[2px] bg-moss-500/30" />

          {/* Date nodes */}
          <div className="relative">
            {filteredTimelineGroups.map((group: TimelineDateGroup) => (
              <TimelineDateNode
                key={group.date}
                group={group}
                onInspect={handleInspect}
              />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full bg-paper-2 border border-hairline px-6 py-2.5 text-sm font-medium text-ink hover:bg-moss-100/50 disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
