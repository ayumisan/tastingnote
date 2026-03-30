# CLAUDE.md — Tasting Note App

## Project Overview

**Tasting Note** is a client-side web application for recording and managing tasting notes (wine, spirits, beer, food, etc.). It is hosted as a static site on **GitHub Pages**, meaning all logic runs in the browser with no backend server.

## Tech Stack

| Layer | Technology |
|---|---|
| Hosting | GitHub Pages (static, no server-side processing) |
| Storage | LocalStorage / IndexedDB (client-side) |
| Photo storage | External service (Firebase Storage or Cloudinary) |
| Version control | Git, GitHub |
| Auth | None (out of scope for current requirements) |

## Repository Structure

> This project is in its initial phase. Update this section as source files are added.

```
tastingnote/
├── CLAUDE.md          # This file
├── index.html         # Entry point
├── src/               # Source code
├── public/            # Static assets
└── ...
```

## Key Constraints & Prerequisites

These are architectural constraints that must be respected in all implementations:

1. **No server-side code.** GitHub Pages serves static files only. Databases, backend APIs, and server-side rendering are not available. All logic must run in the browser.

2. **Client-side storage only.** Use `LocalStorage` or `IndexedDB` for persisting data. Data is stored per-device; cross-device sync is not automatic and requires an external BaaS (e.g., Firebase).

3. **Photo uploads require external storage.** If photo upload is implemented, it must use an external service such as Firebase Storage or Cloudinary.

4. **No authentication.** User authentication is out of scope for the current requirements.

5. **Data sync is not built-in.** Syncing data across multiple devices requires introducing a separate external service (BaaS).

## Development Workflow

### Branch Strategy
- Feature branches: `feature/<description>`
- Bug fixes: `fix/<description>`
- Claude-generated branches: `claude/<description>`
- Default production branch: `main`

### Running Locally
> Update this section once a build system is chosen (e.g., Vite, plain HTML, etc.)

```bash
# Example for a Vite project:
npm install
npm run dev

# Or for plain HTML, serve with any static server:
npx serve .
```

### Deploying
Pushes to `main` automatically deploy to GitHub Pages (configure in repo Settings → Pages → Source: `main` branch).

### Commit Convention
Use conventional commits:
```
feat: add tasting note creation form
fix: correct date parsing in note list
docs: update CLAUDE.md with storage details
refactor: extract note model helpers
```

## Code Conventions

- **Language:** Prefer TypeScript if a build step is used; plain JavaScript is acceptable for simple static pages.
- **Styling:** Keep CSS in dedicated files; avoid inline styles except for dynamic values.
- **Storage keys:** Use namespaced keys for LocalStorage (e.g., `tastingnote:notes`, `tastingnote:settings`) to avoid collisions.
- **No dead code:** Remove unused code rather than commenting it out.
- **No unnecessary abstractions:** Prefer simple, direct code over premature abstractions.

## Important Notes for AI Assistants

- Always respect the **no server-side code** constraint — do not suggest Express servers, databases, or backend APIs.
- When implementing storage, prefer **IndexedDB** (via a wrapper like `idb`) over LocalStorage for structured data; LocalStorage is acceptable for simple key-value settings.
- Photo upload features must integrate with **Firebase Storage or Cloudinary**, not store files locally.
- When adding dependencies, check they are **browser-compatible** (no Node.js-only packages).
- All data persistence is local to the browser; always inform users of this limitation where relevant in UX copy.
- Do not introduce authentication or user management — it is explicitly out of scope.
