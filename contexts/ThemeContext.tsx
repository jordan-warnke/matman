import React, { createContext, useContext, useEffect, useState } from 'react';
import { Colors, ThemeColors } from '../constants/Theme';
import { loadGlobalSettings, saveGlobalSettings } from '../store/HistoryStore';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  timed: boolean;
  setTimed: (v: boolean) => void;
  multipleChoice: boolean;
  setMultipleChoice: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.light,
  isDark: false,
  toggleTheme: () => {},
  timed: false,
  setTimed: () => {},
  multipleChoice: false,
  setMultipleChoice: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [timed, setTimedState] = useState(false);
  const [multipleChoice, setMCState] = useState(false);

  useEffect(() => {
    loadGlobalSettings().then((s) => {
      setIsDark(s.theme === 'dark');
      setTimedState(!!s.timed);
      setMCState(!!s.multipleChoice);
    });
  }, []);

  async function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    await saveGlobalSettings({ theme: next ? 'dark' : 'light' });
  }

  async function setTimed(v: boolean) {
    setTimedState(v);
    await saveGlobalSettings({ timed: v });
  }

  async function setMultipleChoice(v: boolean) {
    setMCState(v);
    await saveGlobalSettings({ multipleChoice: v });
  }

  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, timed, setTimed, multipleChoice, setMultipleChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
