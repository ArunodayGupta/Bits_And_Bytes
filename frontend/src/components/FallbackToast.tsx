import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';

export const FallbackToast: React.FC = () => {
  const { toastMessage, clearToast } = usePatientData();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
      <div className="flex items-center gap-3 rounded-full border border-amber-500/40 bg-[#1D2A22] text-[#FBF8F0] px-4 py-2.5 shadow-elevated text-xs font-medium">
        <span className="flex h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
        <span>{toastMessage}</span>
        <button
          type="button"
          onClick={clearToast}
          className="ml-2 rounded-full p-1 text-stone-400 hover:text-white transition-colors"
          aria-label="Dismiss message"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
