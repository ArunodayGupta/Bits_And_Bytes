import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('healthsafe-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.localStorage.setItem('healthsafe-theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="theme-toggle inline-flex h-9 sm:h-10 min-w-9 sm:min-w-10 items-center justify-center gap-2 rounded-full border border-hairline/80 bg-card/80 hover:bg-paper-2 hover:border-moss-500/40 px-3 text-xs font-semibold text-ink transition-all hover:-translate-y-0.5 shadow-xs"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-gold-400 transition-transform hover:rotate-45 duration-200" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-moss-600 transition-transform hover:-rotate-12 duration-200" aria-hidden="true" />
      )}
      <span className="hidden xl:inline text-xs font-medium">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
};
