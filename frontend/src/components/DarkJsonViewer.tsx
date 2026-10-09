import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';

interface DarkJsonViewerProps {
  data: unknown;
}

export const DarkJsonViewer: React.FC<DarkJsonViewerProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);
  const lines = jsonString.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Identifies whether a JSON line should be visually highlighted
   * (e.g. meta.profile, code, system lines)
   */
  const isHighlightedLine = (line: string): boolean => {
    const trimmed = line.trim();
    return (
      trimmed.includes('"profile"') ||
      trimmed.includes('"code"') ||
      trimmed.includes('"system"') ||
      trimmed.includes('https://nrces.in') ||
      trimmed.includes('http://snomed.info') ||
      trimmed.includes('http://loinc.org')
    );
  };

  /**
   * Formats a line of JSON with token classes
   * - keys: sage (#9DBB78)
   * - strings: cream (#FBF8F0)
   * - numbers/booleans: gold (#E0B95C)
   * - syntax chars: stone (#8A9A8A)
   */
  const renderLineContent = (line: string) => {
    // Regex for matching key-value pairs or tokens
    // e.g. "key": "value" or "key": 123
    const keyMatch = line.match(/^(\s*)("([^"]+)")(\s*:\s*)(.*)$/);

    if (keyMatch) {
      const [, indent, , keyName, colon, valuePart] = keyMatch;

      // Colorize valuePart
      let formattedValue: React.ReactNode = valuePart;

      if (valuePart.startsWith('"')) {
        // String value
        formattedValue = <span className="text-[#F1EDE0]">{valuePart}</span>;
      } else if (/^\d+(\.\d+)?([,}])?$/.test(valuePart.trim())) {
        // Number
        formattedValue = <span className="text-[#E0B95C]">{valuePart}</span>;
      } else if (/^(true|false|null)([,}])?$/.test(valuePart.trim())) {
        // Boolean or null
        formattedValue = <span className="text-[#E0B95C] italic">{valuePart}</span>;
      }

      return (
        <span>
          <span className="whitespace-pre">{indent}</span>
          <span className="text-[#A2C785]">"{keyName}"</span>
          <span className="text-stone-400">{colon}</span>
          {formattedValue}
        </span>
      );
    }

    // Line with just string or bracket
    const trimmed = line.trim();
    if (trimmed.startsWith('"')) {
      const indent = line.substring(0, line.indexOf('"'));
      return (
        <span>
          <span className="whitespace-pre">{indent}</span>
          <span className="text-[#F1EDE0]">{trimmed}</span>
        </span>
      );
    }

    return <span className="text-stone-400 whitespace-pre">{line}</span>;
  };

  return (
    <div className="relative flex flex-col rounded-xl border border-white/10 bg-[#0E1310] overflow-hidden text-xs font-mono shadow-inner">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-2.5">
        <div className="flex items-center gap-2 text-stone-300">
          <FileCode className="h-4 w-4 text-emerald-400" />
          <span className="text-[11px] font-sans font-medium tracking-wide">
            Raw FHIR Resource JSON
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy raw FHIR JSON to clipboard"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-stone-300 hover:bg-white/15 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-[11px] font-medium">Copy JSON</span>
            </>
          )}
        </button>
      </div>

      {/* Code body with line highlighting */}
      <div className="overflow-x-auto p-3 max-h-[500px]">
        <pre className="font-mono text-[13px] leading-relaxed">
          {lines.map((line, index) => {
            const isHighlight = isHighlightedLine(line);
            return (
              <div
                key={index}
                className={`flex items-start px-2 py-0.5 rounded-sm transition-colors ${
                  isHighlight
                    ? 'border-l-[3px] border-[#E0B95C] bg-[#E0B95C]/10 pl-2'
                    : 'border-l-[3px] border-transparent'
                }`}
              >
                <span className="w-8 shrink-0 select-none text-[10px] text-stone-600 text-right pr-3 font-mono">
                  {index + 1}
                </span>
                <span className="flex-1 break-all">{renderLineContent(line)}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};
