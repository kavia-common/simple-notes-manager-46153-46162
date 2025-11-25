# Simple Notes Manager (React)

A modern, responsive notes app with create, edit, delete, search, sort, attachments, and local persistence. Styled with the Ocean Professional theme.

## Features

- Notes list view with title, truncated content, and created/updated timestamps
- Create and Edit notes via an accessible modal (prefilled on Edit with optimistic updates)
- Delete notes with confirmation
- Instant search/filter by title or content (debounced)
- Sorting by Updated (desc), Created (desc), and Title (asc)
- Local persistence via `localStorage` (key: `notes_app_data_v1`)
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
- `src/components/NoteModal.js` – accessible modal for create/edit with validation and attachments
- `src/lib/storage.js` – localStorage helpers
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
- Backward compatibility: existing notes (without attachments) continue to work. The new `images` array is defaulted to `[]` on load.

## License

MIT
