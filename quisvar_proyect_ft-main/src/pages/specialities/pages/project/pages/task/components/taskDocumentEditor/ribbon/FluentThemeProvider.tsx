import { useEffect, useState, type ReactNode } from 'react';
import {
  FluentProvider,
  teamsHighContrastTheme,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components';

export type WriterThemeMode = 'light' | 'dark' | 'high-contrast';

const getSystemTheme = (): WriterThemeMode => {
  if (window.matchMedia('(forced-colors: active)').matches) return 'high-contrast';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const DhyriumFluentThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<WriterThemeMode>(() => getSystemTheme());

  useEffect(() => {
    const contrast = window.matchMedia('(forced-colors: active)');
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setMode(getSystemTheme());
    contrast.addEventListener('change', update);
    dark.addEventListener('change', update);
    return () => {
      contrast.removeEventListener('change', update);
      dark.removeEventListener('change', update);
    };
  }, []);

  const theme = mode === 'high-contrast'
    ? teamsHighContrastTheme
    : mode === 'dark' ? webDarkTheme : webLightTheme;

  return (
    <FluentProvider
      className="canvas-word-ribbon__fluent-provider"
      data-dhyrium-theme={mode}
      theme={theme}
    >
      {children}
    </FluentProvider>
  );
};

