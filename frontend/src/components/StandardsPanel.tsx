import React from 'react';
import { Shield, ExternalLink, CheckCircle, Tag } from 'lucide-react';
import type { FhirResource, FhirCoding } from '@/lib/fhir/types';
import { getSystemLabel, getSystemBadgeClass } from '@/lib/fhir/codeSystems';

interface StandardsPanelProps {
  resource: FhirResource;
}

interface ExtractedCoding extends FhirCoding {
  path: string;
}

/**
 * Traverses a FHIR resource to extract all coding elements.
 */
function extractCodings(obj: unknown, path = ''): ExtractedCoding[] {
  const codings: ExtractedCoding[] = [];

  if (!obj || typeof obj !== 'object') {
    return codings;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      codings.push(...extractCodings(item, `${path}[${index}]`));
    });
    return codings;
  }

  const record = obj as Record<string, unknown>;

  // Check if current object is a coding
  if (record.system && (record.code || record.display)) {
    codings.push({
      system: String(record.system),
      code: record.code ? String(record.code) : undefined,
      display: record.display ? String(record.display) : undefined,
      path,
    });
  }

  // Recurse into properties
  for (const [key, value] of Object.entries(record)) {
    codings.push(...extractCodings(value, path ? `${path}.${key}` : key));
  }

  return codings;
}

function getCodingTitle(coding: ExtractedCoding): string {
  if (coding.display && coding.display.trim()) {
    return coding.display;
  }
  if (coding.system?.includes('unitsofmeasure.org')) {
    return `Measurement Unit: ${coding.code || 'Unit'}`;
  }
  if (coding.system?.includes('source') || coding.code === 'ocr-scan') {
    return 'Source: Patient Scanned Document';
  }
  if (coding.code) {
    return `Concept Code: ${coding.code}`;
  }
  return 'Clinical Terminology Concept';
}

export const StandardsPanel: React.FC<StandardsPanelProps> = ({ resource }) => {
  const profiles = resource.meta?.profile || [];
  const codings = extractCodings(resource);

  // De-duplicate codings by system + code
  const uniqueCodings = Array.from(
    new Map(
      codings.map((c) => [`${c.system}#${c.code}`, c])
    ).values()
  );

  // Basic structural check
  const hasValidType = Boolean(resource.resourceType);
  const hasId = Boolean(resource.id);
  const hasProfile = profiles.length > 0;
  const isBasicValid = hasValidType && hasId && hasProfile;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/30 p-4">
      {/* Header and Basic Structural Check */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-200">
            Standards & Interoperability
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="h-3 w-3" />
          <span>Basic structural check: {isBasicValid ? 'Valid FHIR R4' : 'Incomplete'}</span>
        </div>
      </div>

      {/* Profiles declared */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
          Declared Profiles
        </span>
        {profiles.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {profiles.map((url, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-lg bg-stone-900/60 p-2 text-xs border border-white/10"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] text-stone-400 font-mono">Profile declared:</span>
                  <span className="font-mono text-stone-100 truncate">{url}</span>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-stone-400 hover:text-emerald-400 transition-colors p-1"
                  aria-label={`View profile definition for ${url}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic">No explicit meta.profile URI declared</p>
        )}
      </div>

      {/* Extracted Codings & Terminology */}
      {uniqueCodings.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
            Clinical Terminologies & Codings ({uniqueCodings.length})
          </span>

          <div className="grid grid-cols-1 gap-2">
            {uniqueCodings.map((c, i) => {
              const systemLabel = getSystemLabel(c.system);
              const badgeClass = getSystemBadgeClass(c.system);

              return (
                <div
                  key={i}
                  className="flex flex-col gap-1 rounded-lg bg-stone-900/60 p-2.5 border border-white/10 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-stone-400" />
                      <span className="font-semibold text-stone-100">
                        {getCodingTitle(c)}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}
                    >
                      {systemLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-stone-400">
                    {c.code && (
                      <span>
                        Code: <strong className="text-amber-300 font-medium">{c.code}</strong>
                      </span>
                    )}
                    <span className="truncate text-[10px] text-stone-400 max-w-[280px]">
                      {c.system}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
