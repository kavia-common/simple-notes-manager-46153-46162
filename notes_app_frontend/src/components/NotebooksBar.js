import React, { useEffect, useMemo, useState } from 'react';
import {
  listNotebooks,
  createNotebook,
  renameNotebook,
  deleteNotebook,
  getSelectedNotebookId,
  setSelectedNotebookId,
} from '../lib/api';

/**
 * NotebooksBar
 * A selector with create/rename/delete actions for notebooks.
 * - Displays notebooks as a select plus inline actions
 * - Persists selected notebook
 * - Emits onChange when selection changes
 *
 * Props:
 * - onChange: (notebookId: string|null, notebookObj?: object) => void
 */
// PUBLIC_INTERFACE
export default function NotebooksBar({ onChange }) {
  const [notebooks, setNotebooks] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const list = await listNotebooks();
        if (!mounted) return;
        setNotebooks(list);
        const stored = getSelectedNotebookId();
        const initial =
          (stored && list.find((n) => String(n.id) === String(stored))?.id) ||
          (list[0]?.id || '');
        setSelected(initial);
        setSelectedNotebookIdSafe(initial);
        if (onChange) onChange(initial || null, list.find((n) => n.id === initial) || null);
      } catch (e) {
        setErr('Failed to load notebooks.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSelectedNotebookIdSafe(id) {
    try {
      setSelectedNotebookId(id || '');
    } catch {
      // ignore
    }
  }

  const current = useMemo(
    () => notebooks.find((n) => String(n.id) === String(selected)) || null,
    [notebooks, selected]
  );

  const onSelect = (e) => {
    const id = e.target.value;
    setSelected(id);
    setSelectedNotebookIdSafe(id);
    if (onChange) onChange(id || null, notebooks.find((n) => n.id === id) || null);
  };

  const onCreate = async () => {
    const name = window.prompt('New notebook name?', 'New Notebook');
    if (!name) return;
    try {
      const nb = await createNotebook(name);
      setNotebooks((prev) => [nb, ...prev]);
      setSelected(nb.id);
      setSelectedNotebookIdSafe(nb.id);
      if (onChange) onChange(nb.id, nb);
    } catch {
      alert('Failed to create notebook.');
    }
  };

  const onRename = async () => {
    if (!current) return;
    const name = window.prompt('Rename notebook', current.name);
    if (!name || !name.trim()) return;
    try {
      const nb = await renameNotebook(current.id, name.trim());
      setNotebooks((prev) => prev.map((n) => (n.id === nb.id ? nb : n)));
    } catch {
      alert('Failed to rename notebook.');
    }
  };

  const onDeleteClick = async () => {
    if (!current) return;
    if (!window.confirm(`Delete notebook "${current.name}"? This cannot be undone.\n\nChoose OK to delete. Notes will be deleted as well unless moved manually beforehand.`)) {
      return;
    }
    try {
      await deleteNotebook(current.id);
      const nextList = notebooks.filter((n) => n.id !== current.id);
      setNotebooks(nextList);
      const nextSel = nextList[0]?.id || '';
      setSelected(nextSel);
      setSelectedNotebookIdSafe(nextSel);
      if (onChange) onChange(nextSel || null, nextList.find((n) => n.id === nextSel) || null);
    } catch {
      alert('Failed to delete notebook.');
    }
  };

  return (
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <div style={{ minWidth: 260 }}>
          <label htmlFor="nb-select" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Notebook
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              id="nb-select"
              className="select"
              value={selected}
              onChange={onSelect}
              aria-label="Select notebook"
              disabled={loading || notebooks.length === 0}
            >
              {notebooks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn secondary" onClick={onCreate} aria-label="Create notebook">
              ＋
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={onRename}
              aria-label="Rename selected notebook"
              disabled={!current}
            >
              ✎
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={onDeleteClick}
              aria-label="Delete selected notebook"
              disabled={!current || notebooks.length <= 1}
              title={notebooks.length <= 1 ? 'At least one notebook is required' : 'Delete notebook'}
            >
              🗑
            </button>
          </div>
          {err ? (
            <div className="helper" role="alert" style={{ color: 'var(--color-error)', marginTop: 6 }}>
              {err}
            </div>
          ) : null}
        </div>
        <div className="helper" style={{ minWidth: 200 }}>
          Group your notes into separate notebooks. Selection is saved locally.
        </div>
      </div>
    </div>
  );
}
