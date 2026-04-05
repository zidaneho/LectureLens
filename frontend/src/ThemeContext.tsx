import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from './SettingsContext';

type Theme = 'dark_high' | 'dark_low' | 'light_high';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, updatePreference } = useSettings();
  const [theme, setThemeState] = useState<Theme>('dark_low');

  // Sync theme from preferences
  useEffect(() => {
    if (preferences?.theme) {
      const t = preferences.theme as string;
      // Handle legacy light_low -> light_high migration
      const actualTheme = t === 'light_low' ? 'light_high' : t;
      setThemeState(actualTheme as Theme);
    }
  }, [preferences?.theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    updatePreference('theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-dark_high', 'theme-dark_low', 'theme-light_high', 'theme-light_low');
    root.classList.add(`theme-${theme}`);
    
    // Also set color-scheme for browser UI elements
    root.style.colorScheme = theme.startsWith('dark') ? 'dark' : 'light';
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
