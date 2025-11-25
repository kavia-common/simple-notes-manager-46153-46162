import React from 'react';
import './App.css';
import './index.css';
import NotesPage from './components/NotesPage';

// PUBLIC_INTERFACE
function App() {
  /** Main app layout with Ocean Professional header and NotesPage */
  return (
    <div className="app-root">
      <header className="app-header" role="banner" aria-label="Application header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-badge" aria-hidden="true">✦</span>
            <h1 className="brand-title">Simple Notes Manager</h1>
          </div>
          <div className="header-actions">
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
