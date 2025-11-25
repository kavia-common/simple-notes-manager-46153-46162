import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import './index.css';
import NotesPage from './components/NotesPage';

const THEME_STORAGE_KEY = 'ui.theme';

// PUBLIC_INTERFACE
function App() {
  /** Main app layout with Ocean Professional header and NotesPage */

  const [theme, setTheme] = useState('light');

  // Detect initial theme: localStorage -> system preference -> light
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
        return;
      }
    } catch {
      // ignore
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  // Apply theme to :root via data-theme attr and persist
  useEffect(() => {
    const root = document.documentElement; // :root (html)
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const icon = useMemo(() => (theme === 'dark' ? '🌙' : '☀️'), [theme]);
  const label = useMemo(() => (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'), [theme]);

  return (
    <div className="app-root">
      <header className="app-header" role="banner" aria-label="Application header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-badge" aria-hidden="true">✦</span>
            <h1 className="brand-title">Simple Notes Manager</h1>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={toggleTheme}
              aria-label={label}
              title={label}
            >
              {icon} Theme
            </button>
            <a
              className="link-docs"
              href="https://react.dev"
              target="_blank"
              rel="noreferrer"
              aria-label="Open React documentation in new tab"
            >
              React Docs
            </a>
          </div>
        </div>
      </header>
      <main className="app-main" role="main">
        <div className="container">
          <NotesPage />
        </div>
      </main>
      <footer className="app-footer" role="contentinfo">
        <div className="container footer-inner">
          <span>Ocean Professional theme</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
