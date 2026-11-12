import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Home } from './screens/Home';
import { Viewer } from './screens/Viewer';
import './styles/base.css';
import './styles/grid.css';
import './styles/print.css';

export const App: React.FC = () => {
  const status = useStore((s) => s.status);
  const theme = useStore((s) => s.theme);

  const [systemIsDark, setSystemIsDark] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && systemIsDark);
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme, systemIsDark]);

  if (status === 'ready') {
    return <Viewer />;
  }

  return <Home />;
};
