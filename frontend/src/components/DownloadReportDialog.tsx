import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { FhirBundle } from '@/lib/fhir/types';
import {
  buildClinicalItems,
  downloadFhirBundlePdf,
  type ClinicalItem,
} from '@/lib/fhir/downloadFhirBundlePdf';
import {
  Download,
  Search,
  CheckSquare,
  Square,
  Calendar,
  Pill,
  Droplet,
  Activity,
  Building2,
  FileText,
  Loader2,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface DownloadReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: FhirBundle | null;
  patientName?: string;
  defaultSelectedIds?: string[];
}

type CategoryFilter = 'all' | 'lab' | 'prescription' | 'diagnosis' | 'visit' | 'other';

function getItemCategoryType(item: ClinicalItem): CategoryFilter {
  switch (item.category) {
    case 'Clinical history':
    case 'Lab report':
      return 'lab';
    case 'Prescription':
      return 'prescription';
    case 'Diagnosis':
      return 'diagnosis';
    case 'Visit':
      return 'visit';
    default:
      return 'other';
  }
}

function getCategoryMeta(type: CategoryFilter) {
  switch (type) {
    case 'lab':
      return {
        label: 'Lab & Biomarker',
        icon: Droplet,
        badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/40',
        iconClass: 'text-rose-600 dark:text-rose-400',
      };
    case 'prescription':
      return {
        label: 'Prescription',
        icon: Pill,
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
        iconClass: 'text-blue-600 dark:text-blue-400',
      };
    case 'diagnosis':
      return {
        label: 'Diagnosis',
        icon: Activity,
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/40',
        iconClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'visit':
      return {
        label: 'Doctor Visit',
        icon: Building2,
        badgeClass: 'bg-moss-50 text-moss-700 dark:bg-moss-950/40 dark:text-moss-300 border-moss-200 dark:border-moss-900/40',
        iconClass: 'text-moss-600 dark:text-moss-400',
      };
    default:
      return {
        label: 'Clinical Record',
        icon: FileText,
        badgeClass: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700',
        iconClass: 'text-stone-600 dark:text-stone-400',
      };
  }
}

export const DownloadReportDialog: React.FC<DownloadReportDialogProps> = ({
  open,
  onOpenChange,
  bundle,
  patientName = 'Patient',
  defaultSelectedIds,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Extract all clinical items from bundle
  const allItems = useMemo<ClinicalItem[]>(() => {
    if (!bundle) return [];
    return buildClinicalItems(bundle);
  }, [bundle]);

  // Reset or initialize selections when dialog opens or bundle changes
  useEffect(() => {
    if (open && allItems.length > 0) {
      if (defaultSelectedIds && defaultSelectedIds.length > 0) {
        setSelectedIds(new Set(defaultSelectedIds));
      } else {
        setSelectedIds(new Set(allItems.map((item) => item.id)));
      }
      setSearchQuery('');
      setActiveCategory('all');
      setDownloadSuccess(false);
    }
  }, [open, allItems, defaultSelectedIds]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: allItems.length, lab: 0, prescription: 0, diagnosis: 0, visit: 0, other: 0 };
    for (const item of allItems) {
      const cat = getItemCategoryType(item);
      counts[cat] += 1;
    }
    return counts;
  }, [allItems]);

  // Filtered items based on category and search query
  const displayedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      const cat = getItemCategoryType(item);
      if (activeCategory !== 'all' && cat !== activeCategory) {
        return false;
      }
      if (!query) return true;
      const titleMatch = item.title.toLowerCase().includes(query);
      const dateMatch = item.dateLabel.toLowerCase().includes(query);
      const detailsMatch = item.details.some((detail) => detail.toLowerCase().includes(query));
      return titleMatch || dateMatch || detailsMatch;
    });
  }, [allItems, activeCategory, searchQuery]);

  const selectedCount = useMemo(() => {
    return allItems.filter((item) => selectedIds.has(item.id)).length;
  }, [allItems, selectedIds]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(allItems.map((i) => i.id)));
  }, [allItems]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSelectOnlyCategory = useCallback((cat: CategoryFilter) => {
    const matching = allItems.filter((i) => (cat === 'all' ? true : getItemCategoryType(i) === cat));
    setSelectedIds(new Set(matching.map((i) => i.id)));
  }, [allItems]);

  const handleDownload = async () => {
    if (!bundle || selectedCount === 0 || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadFhirBundlePdf(bundle, {
        selectedResourceIds: selectedIds,
        reportTitle: selectedCount === allItems.length ? undefined : 'Custom Clinical Report',
      });
      setDownloadSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 700);
    } catch (err) {
      console.error('Failed to download custom PDF report:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const categoryTabs: Array<{ id: CategoryFilter; label: string; count: number; icon: React.ElementType }> = [
    { id: 'all', label: 'All', count: categoryCounts.all, icon: Sparkles },
    { id: 'lab', label: 'Labs', count: categoryCounts.lab, icon: Droplet },
    { id: 'prescription', label: 'Prescriptions', count: categoryCounts.prescription, icon: Pill },
    { id: 'diagnosis', label: 'Diagnoses', count: categoryCounts.diagnosis, icon: Activity },
    { id: 'visit', label: 'Visits', count: categoryCounts.visit, icon: Building2 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-24 gap-0">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 border-b border-hairline bg-paper dark:bg-card">
          <div className="flex items-center gap-2 text-moss-600 dark:text-moss-400 mb-1">
            <Download className="h-5 w-5" />
            <span className="text-xs uppercase font-mono tracking-wider font-semibold">
              PDF Export Customizer
            </span>
          </div>
          <DialogTitle className="font-serif text-2xl text-ink">
            Select Reports to Download
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-ink-soft mt-1">
            Choose which doctor visits, lab tests, diagnoses, and prescriptions to include in{' '}
            <strong className="text-ink">{patientName}&apos;s</strong> PDF report.
          </DialogDescription>

          {/* Quick Actions & Filters Bar */}
          <div className="mt-4 flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft/70" />
              <Input
                type="text"
                placeholder="Search reports by test, medicine, condition, doctor, or hospital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-xs sm:text-sm rounded-xl bg-card border-hairline"
                aria-label="Filter report list"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills & Selection Shortcuts */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeCategory === tab.id;
                  if (tab.id !== 'all' && tab.count === 0) return null;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-moss-600 text-white shadow-xs'
                          : 'bg-paper-2 hover:bg-stone-200/70 dark:bg-stone-800 dark:hover:bg-stone-700 text-ink-soft'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-ink-soft'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-moss-700 dark:text-moss-400 hover:underline font-medium cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-ink-soft/40">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-ink-soft hover:text-ink hover:underline cursor-pointer"
                >
                  Clear
                </button>
                {activeCategory !== 'all' && (
                  <>
                    <span className="text-ink-soft/40">•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectOnlyCategory(activeCategory)}
                      className="text-teal-700 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                    >
                      Only {activeCategory}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Report List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 max-h-[46vh] bg-paper-2/40 dark:bg-stone-950/20">
          {displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-10 w-10 text-ink-soft/40 mb-2" />
              <p className="text-sm font-medium text-ink">No matching reports found</p>
              <p className="text-xs text-ink-soft mt-1">
                {searchQuery
                  ? `No records matched your search "${searchQuery}".`
                  : 'There are no records in this category.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-xs"
              >
                Reset filters
              </Button>
            </div>
          ) : (
            displayedItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const catType = getItemCategoryType(item);
              const meta = getCategoryMeta(catType);
              const Icon = meta.icon;

              // Filter out ID lines for preview snippet
              const previewDetails = item.details.filter(
                (d) =>
                  !d.startsWith('FHIR resource ID:') &&
                  !d.startsWith('Status:') &&
                  !d.startsWith('Recorded:')
              );
              const snippet = previewDetails.slice(0, 2).join(' · ');

              return (
                <div
                  key={item.id}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => toggleItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleItem(item.id);
                    }
                  }}
                  className={`group flex items-start gap-3.5 p-3.5 rounded-16 border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-moss-500/70 bg-card shadow-xs dark:border-moss-500/80 ring-1 ring-moss-500/20'
                      : 'border-hairline bg-card/60 opacity-70 hover:opacity-100 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="pt-0.5 shrink-0 text-moss-600 dark:text-moss-400">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5 text-ink-soft/40 group-hover:text-ink-soft" />
                    )}
                  </div>

                  {/* Icon Tile */}
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-ink text-sm leading-tight">
                        {item.title}
                      </span>
                      <Badge variant="outline" className={`text-[10px] py-0 px-2 font-medium ${meta.badgeClass}`}>
                        {meta.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                        <Calendar className="h-3 w-3 text-ink-soft/70" />
                        {item.dateLabel}
                      </span>
                      {snippet && (
                        <span className="text-[11px] text-ink-soft/90 truncate max-w-md">
                          {snippet}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t border-hairline bg-paper dark:bg-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:space-x-0">
          {/* Summary Count Indicator */}
          <div className="flex items-center gap-2">
            <span data-testid="selected-summary" className="text-xs text-ink-soft">
              Selected <strong className="text-ink font-semibold">{selectedCount}</strong> of{' '}
              {allItems.length} reports
            </span>
            {selectedCount === 0 && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                (Select at least one)
              </span>
            )}
            {selectedCount > 0 && selectedCount < allItems.length && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1 text-[11px] text-moss-700 dark:text-moss-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Select all
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              disabled={selectedCount === 0 || isDownloading}
              className="btn-primary-tech text-xs gap-1.5 shadow-sm"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF ({selectedCount})</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
