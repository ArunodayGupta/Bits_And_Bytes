import React, { useState } from 'react';
import { Copy, Check, Volume2 } from 'lucide-react';
import { formatSpokenRxId } from '@/lib/rxId';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RxBadgeProps {
  rxId: string;
}

export const RxBadge: React.FC<RxBadgeProps> = ({ rxId }) => {
  const [copied, setCopied] = useState(false);
  const [showSpoken, setShowSpoken] = useState(false);

  const spokenPhrase = formatSpokenRxId(rxId);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rxId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSpoken = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSpoken(!showSpoken);
  };

  return (
    <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copy prescription ID ${rxId}. Read this aloud to your doctor`}
                className={`group flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 font-mono text-xs tracking-wider transition-all duration-200 ${
                  copied
                    ? 'border-moss-500 bg-moss-600 text-paper shadow-sm'
                    : 'border-hairline bg-paper-2 text-ink hover:border-moss-500 hover:bg-moss-100/40'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-paper" />
                    <span className="font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-ink-soft group-hover:text-ink transition-colors" />
                    <span className="font-medium">{rxId}</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Read this aloud to your doctor (click to copy)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button
          type="button"
          onClick={toggleSpoken}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-soft hover:text-moss-600 hover:bg-paper-2 transition-colors border border-transparent hover:border-hairline"
          aria-label="Toggle phonetic spoken form"
        >
          <Volume2 className="h-3 w-3" />
          <span>{showSpoken ? 'Hide guide' : 'Speak it'}</span>
        </button>
      </div>

      {showSpoken && (
        <div className="rounded-xl border border-moss-500/20 bg-moss-100/40 px-3 py-1.5 text-xs animate-fade-up">
          <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block mb-0.5">
            Phonetic Spoken Format
          </span>
          <p className="font-serif italic text-sm text-ink leading-relaxed">
            "{spokenPhrase}"
          </p>
        </div>
      )}
    </div>
  );
};
