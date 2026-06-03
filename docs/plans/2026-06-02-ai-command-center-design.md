# AI Command Center — Design (MVP)

Date: 2026-06-02
Status: Approved (build in progress)

## Goal

A local Windows desktop app to run **ChatGPT.com** and **Claude.ai** side by
side, with a center control panel that helps the user relay instructions
between them. Strictly **user-controlled, transparent, and safe** — not a
bypass/automation tool.

## Decisions

1. **Stack:** Electron + electron-vite + TypeScript + React 18 + Vite, packaged
   with electron-builder (Windows NSIS). Zero runtime deps beyond Electron/React.
2. **Browser panels:** Electron `WebContentsView` (modern replacement for the
   deprecated `BrowserView`). Each view has its own persistent, isolated session
   partition (`persist:chatgpt`, `persist:claude`) and a real Chrome user-agent.
   Because these are top-level navigations (not iframes), `X-Frame-Options` /
   CSP `frame-ancestors` do not apply, so embedding generally works and logins
   persist locally between launches.
   - **Bounds syncing:** the renderer reports each panel's pixel rect via
     `ResizeObserver`; main calls `view.setBounds(...)`.
   - **Z-order:** native views always paint above the DOM, so the renderer hides
     them (`setViewVisible`) when Settings overlays a panel or a panel falls back.
   - **Fallback:** on `did-fail-load` / render-process-gone / "Open externally",
     the view hides and the panel shows a status card with **Open in browser**.
3. **Safe relay model — nothing is injected into or scraped from the AI pages:**
   - *Prepare for X* = apply Template A/B/C into the editable composer.
   - *Send to X* = copy the composed prompt to clipboard, focus that panel, log
     it, archive to `CHATGPT_PROMPTS.md` / `CLAUDE_PROMPTS.md`. **The user**
     pastes (Ctrl+V) and presses Enter. No auto-submit.
   - *Capture* = the user copies the model's reply and pastes it into a labeled
     response box. A stage indicator advises the next step but never auto-advances.
4. **Build method:** contract-first parallel workflow. The IPC/type contract,
   Electron main process, preload, and the App integration shell are authored
   first (the coupled core); the renderer's presentational components, lib
   modules, styles, and docs are fanned out as independent files against the
   locked contracts, then verified with typecheck + build.

## Architecture

- `src/shared/types.ts` — IPC channel names, data types, and the `window.api`
  contract (single source of truth for main + preload + renderer).
- `src/main/` — `main.ts` (lifecycle + window), `viewManager.ts`
  (WebContentsView), `ipc.ts` (handlers), `projectFs.ts` (whitelisted, traversal-
  guarded file writes), `store.ts` (settings JSON), `preload.ts` (contextBridge).
- `src/renderer/` — `App.tsx` (state + relay brain), `components/*`,
  `lib/{promptTemplates,projectFiles,storage}.ts`, `styles/globals.css`.

## Safety constraints (hard)

No hidden automation, no scraping, no auto-submit, no credential handling beyond
normal browser logins (stored locally, isolated per site), every relay action is
manual and logged. "Send" = copy + focus; the user presses Enter.

## Project memory

A chosen project folder holds `TASKS.md`, `DECISIONS.md`, `AI_LOG.md`,
`CLAUDE_PROMPTS.md`, `CHATGPT_PROMPTS.md`. Writes are append-only with ISO
timestamps and restricted to this whitelist inside the selected folder.
