import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="rounded-28 border border-hairline bg-card p-10 max-w-md shadow-soft">
            <svg
              className="h-12 w-12 text-moss-500/60 mx-auto mb-4"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 52c16-2 32-18 36-36C32 20 16 36 12 52z" />
              <path d="M22 42c8-8 16-16 22-22" />
            </svg>
            <h2 className="font-serif text-3xl font-normal text-ink mb-2">
              Something went <span className="italic">quiet</span>.
            </h2>
            <p className="text-sm text-ink-soft mb-6 leading-relaxed">
              An unexpected condition occurred while rendering the clinical view.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full bg-moss-600 px-6 py-2.5 text-xs font-semibold text-paper hover:bg-moss-500 transition-colors shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reload to continue</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
