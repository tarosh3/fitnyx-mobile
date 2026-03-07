import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { updateProfile } from '@/src/lib/api/users';
import { useAuth } from '@/src/providers/AuthProvider';
import type { ThemeMode } from '@/src/theme/colors';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'fitnyx-theme',
}: ThemeProviderProps) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (stored === 'dark' || stored === 'light') {
          setThemeState(stored);
        }
      })
      .catch(() => undefined);
  }, [storageKey]);

  useEffect(() => {
    AsyncStorage.setItem(storageKey, theme).catch(() => undefined);
  }, [theme, storageKey]);

  useEffect(() => {
    const preference = user?.user_metadata?.theme_preference;
    if (preference === 'dark' || preference === 'light') {
      setThemeState(preference);
    }
  }, [user]);

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    if (user) {
      updateProfile({ theme_preference: nextTheme }).catch((error) => {
        console.error('Failed to persist theme', error);
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
