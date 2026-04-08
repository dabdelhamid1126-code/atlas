import { useState, useEffect, createContext, useContext } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('atlas-theme') || 'parchment'; }
    catch { return 'parchment'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'midnight') {
      root.setAttribute('data-theme', 'midnight');
    } else {
      root.removeAttribute('data-theme');
    }
    try { localStorage.setItem('atlas-theme', theme); }
    catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}