# Simple Notes Manager (React)

A modern, responsive notes app with create, edit, delete, search, sort, attachments, voice notes, and local persistence. Styled with the Ocean Professional theme.

## Features

- Notes list view with title, truncated content, and created/updated timestamps
- Create and Edit notes via an accessible modal (prefilled on Edit with optimistic updates)
- Delete notes with confirmation
- Instant search/filter by title or content (debounced)
- Sorting by Updated (desc), Created (desc), and Title (asc)
- Local persistence via `localStorage` (notes legacy key: `notes_app_data_v1`)
- Multiple Notebooks:
  - Create, select, rename, and delete notebooks
  - Notes are scoped per selected notebook
  - First run migration: existing notes are moved into a default notebook "My Notes"
  - Local storage keys: `notes_app_notebooks_v1` and `notes_app_selected_notebook_v1`
- Optional backend integration (graceful fallback to localStorage)
- Responsive layout, keyboard accessible, ARIA labels, focus management
- Image attachments for notes:
  - Add via file picker or drag-and-drop
  - Supports PNG, JPG/JPEG, WEBP, GIF
  - Up to 10 images per note
  - 5MB per file pre-compression limit; large images are optionally resized client-side to ~1600px long edge at quality ~0.85
  - Thumbnails grid with remove and simple up/down reordering
  - Thumbnails ribbon shows up to 3 images in the note list
  - Fully client-side, persisted in localStorage or passed to backend when configured
- Voice notes (record and playback):
  - Record using your microphone with MediaRecorder
  - Live recording timer and visual indicator
  - Upload existing audio files (webm, mp3/mpeg, mp4/m4a, wav)
  - Add multiple clips per note (up to 10)
  - Play/pause per clip, rename, and delete
  - Audio data is stored as data URLs alongside the note in localStorage and included in API payloads when a backend is configured
  - Notes list shows a microphone badge with the clip count when a note has audio

## Dark Mode

- A toggle in the header switches between Light and Dark themes (Ocean Professional styling).
- The selection is saved in `localStorage` under `ui.theme` as `'light'` or `'dark'`.
- On first load, if no preference has been saved, the app auto-detects your system preference via `prefers-color-scheme` and applies it.
- The theme is applied by setting `data-theme="dark"` on the root `<html>` element; all components inherit colors from CSS variables.
- Accessibility: color contrast, focus rings, inputs, chips, search, badges, thumbnails, and empty states adjust automatically for readability.

## Browser & Security Requirements for Voice Notes

- Recording requires a modern browser that supports:
  - `navigator.mediaDevices.getUserMedia`
  - `MediaRecorder`
- Most browsers require HTTPS for microphone access. When running locally via `npm start`, localhost is allowed.
- You must allow microphone permissions in the browser when prompted.
- If the browser does not support recording, the UI shows a helpful message and you can still upload audio files.

## Limits and Behavior

- Up to 10 audio clips per note
- Per file limit ~10MB (recorded or uploaded). Larger files are rejected with a friendly error.
- Recording automatically stops and warns after 10 minutes.
- The app is fully client-side; audio clips are stored as data URLs in your browser’s storage. For production deployments, be mindful of storage quotas.
- Backward compatibility: existing notes (without audio) continue to work; the new `audio` array is defaulted to `[]` on load.

## Environment Variables

- `REACT_APP_API_BASE` or `REACT_APP_BACKEND_URL`: If defined, the app will attempt to use these as a base URL for a REST backend with the following minimal routes:
  - `GET /notes` -> list
  - `POST /notes` -> create
  - `PUT /notes/:id` -> update
  - `DELETE /notes/:id` -> delete
- If requests fail or the env var is not set, the app automatically falls back to localStorage.

No other env variables are required to run locally.

## Getting Started

In this directory:

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

## Project Structure

- `src/components/NotesPage.js` – main page, manages state, search, sort, and modal
- `src/components/NoteList.js` – renders the notes list
- `src/components/NoteListItem.js` – individual note view with actions
- `src/components/NoteModal.js` – accessible modal for create/edit with validation, attachments, sketch, and voice notes
- `src/lib/storage.js` – localStorage helpers (normalizes images and audio)
- `src/lib/api.js` – optional API client with graceful fallback to localStorage
- `src/index.css` – global theme and components styles (Ocean Professional)
- `src/App.js` – app shell with header/footer

## Theme

Ocean Professional:
- Primary `#2563EB`, Accent `#F59E0B`, Error `#EF4444`
- Background `#f9fafb`, Surface `#ffffff`, Text `#111827`
- Modern aesthetic with subtle shadows, rounded corners, and smooth transitions

## Notes

- The app fully functions without any backend.
- If you add a backend later, set `REACT_APP_API_BASE` or `REACT_APP_BACKEND_URL`, and the app will attempt to use it but still fall back if it fails.
- Backward compatibility: existing notes (without attachments or audio) continue to work. The new `images` and `audio` arrays default to `[]` on load.

## License

MIT
