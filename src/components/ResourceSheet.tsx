import React from 'react';
import type { FhirResource } from '@/lib/fhir/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { StandardsPanel } from './StandardsPanel';
import { DarkJsonViewer } from './DarkJsonViewer';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';

interface ResourceSheetProps {
  resource: FhirResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResourceSheet: React.FC<ResourceSheetProps> = ({
  resource,
  open,
  onOpenChange,
}) => {
  if (!resource) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-5 sm:max-w-[580px] w-full">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow-pill text-[10px] bg-white/10 border-white/20 text-stone-300">
              <span className="eyebrow-dot bg-emerald-400" />
              FHIR R4 Inspector
            </span>
            <Badge variant="outline" className="border-white/20 text-stone-300 text-xs font-mono">
              {resource.id}
            </Badge>
          </div>
          <SheetTitle className="text-3xl text-paper">
            {resource.resourceType} <span className="italic font-normal text-stone-400">Resource</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-stone-400">
            Inspect raw FHIR R4 schema, NRCeS interoperability profiles, and standardized clinical coding.
          </SheetDescription>
        </SheetHeader>

        {/* Standards & Terminology Inspection Panel */}
        <div className="space-y-4">
          <StandardsPanel resource={resource} />

          {/* Raw JSON inspector with line highlights */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-medium flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Resource Payload
              </span>
              <span className="text-[11px] text-stone-500 font-mono">
                application/fhir+json
              </span>
            </div>
            <DarkJsonViewer data={resource} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
