# Project: Coletor Auxiliar - Chrome Extension Fixes

## Architecture
- **Chrome Extension (Service Worker)**: `public/chrome-extension/background.js` (compiled to `dist/chrome-extension/background.js`). Receives messages from the dashboard panel via `chrome.runtime.onMessageExternal`.
- **Dashboard Panel**: `src/components/CityValidation.tsx` (sends messages to the extension and handles fallback to local Puppeteer API).
- **Puppeteer Test Runner**: `scratch/test_ext_communication.cjs` runs a headless Chrome with the extension loaded to verify communication.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Audit extension communication issues, Tabs API resilience, and navigation flow | None | DONE (Conv: 7922fdac-fd9e-4afe-9ba9-183fd9b6704e) |
| 2 | Code Correction | Fix service worker message port closures, Tabs API error handler, and Linktree/Anota AI flow | M1 | DONE (Conv: 4d1b457f-203c-491b-90d4-e955bb719839) |
| 3 | Verification & Review | Run Puppeteer communication tests, verify build integrity, and confirm zero fallbacks | M2 | IN_PROGRESS (Conv: 5615ebad-7fa1-4dfc-8cc6-5b82ea971ebe) |
| 4 | Forensic Audit Gating | Execute the Forensic Auditor to check compliance and verify no cheating/facades | M3 | PLANNED |

## Interface Contracts
### Panel ↔ Chrome Extension (via runtime.sendMessage)
- **Ping Message**: `{ action: "ping" }` -> Returns `{ success: true, version: "1.0.0" }`.
- **Scrape Menu Message**: `{ action: "scrapeMenuFromInstagram", instagramUrl: string, restaurantName: string }` -> Returns `{ success: true, parsedMenu: Array }` or `{ success: true, rawText: string }`.

## Code Layout
- `public/chrome-extension/`: Source folder for Manifest V3 extension.
- `dist/chrome-extension/`: Production build output of the extension.
- `src/components/CityValidation.tsx`: Frontend component that communicates with the extension.
- `scratch/test_ext_communication.cjs`: Integration/communication test script.
