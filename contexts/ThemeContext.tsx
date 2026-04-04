import React, { createContext, useContext, useEffect, useState } from 'react';
import { Colors, ThemeColors } from '../constants/Theme';
import { loadGlobalSettings, saveGlobalSettings } from '../store/HistoryStore';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  isWork: boolean;
  isWorkDark: boolean;
  themeMode: 'light' | 'dark' | 'work';
  setThemeMode: (mode: 'light' | 'dark' | 'work') => void;
  toggleWorkDark: () => void;
  timed: boolean;
  setTimed: (v: boolean) => void;
  multipleChoice: boolean;
  setMultipleChoice: (v: boolean) => void;
  smartSense: boolean;
  setSmartSense: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.light,
  isDark: false,
  isWork: false,
  isWorkDark: false,
  themeMode: 'light',
  setThemeMode: () => {},
  toggleWorkDark: () => {},
  timed: false,
  setTimed: () => {},
  multipleChoice: false,
  setMultipleChoice: () => {},
  smartSense: false,
  setSmartSense: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'work'>('light');
  const [workDark, setWorkDark] = useState(false);
  const [timed, setTimedState] = useState(false);
  const [multipleChoice, setMCState] = useState(false);
  const [smartSense, setSSState] = useState(false);

  useEffect(() => {
    loadGlobalSettings().then((s) => {
      setThemeMode(s.theme === 'dark' ? 'dark' : s.theme === 'work' ? 'work' : 'light');
      setTimedState(!!s.timed);
      setMCState(!!s.multipleChoice);
      setSSState(!!s.smartSense);
    });
  }, []);

  async function setThemeModeAndSave(mode: 'light' | 'dark' | 'work') {
    setThemeMode(mode);
    await saveGlobalSettings({ theme: mode });
  }

  async function setTimed(v: boolean) {
    setTimedState(v);
    await saveGlobalSettings({ timed: v });
  }

  async function setMultipleChoice(v: boolean) {
    setMCState(v);
    await saveGlobalSettings({ multipleChoice: v });
  }

  async function setSmartSense(v: boolean) {
    setSSState(v);
    await saveGlobalSettings({ smartSense: v });
  }

  const colors = themeMode === 'dark' ? Colors.dark : themeMode === 'work' ? (workDark ? Colors.workDark : Colors.work) : Colors.light;
  const isDark = themeMode === 'dark' || (themeMode === 'work' && workDark);
  const isWork = themeMode === 'work';
  const isWorkDark = themeMode === 'work' && workDark;

  function toggleWorkDark() {
    setWorkDark((v) => !v);
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, isWork, isWorkDark, themeMode, setThemeMode: setThemeModeAndSave, toggleWorkDark, timed, setTimed, multipleChoice, setMultipleChoice, smartSense, setSmartSense }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
