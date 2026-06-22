# Project: Instagram Bio Link Extraction Fix

## Architecture
- **Chrome Extension (Service Worker)**: `public/chrome-extension/background.js` (compiled to `dist/chrome-extension/background.js`). Receives messages from the dashboard panel via `chrome.runtime.onMessageExternal`.
- **Dashboard Panel**: `src/pages/admin/expansion/components/CityValidation.tsx` (communicates with the extension).
- **Puppeteer Test Runner**: Integration and validation tests run via Node/Puppeteer.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Audit Instagram bio link DOM structure changes and current selectors | None | DONE (Conv: 5b9bb3c0-3527-4fc3-af87-cd7f8b581758) |
| 2 | Code Correction | Fix Instagram bio link selectors and regex logic in background.js | M1 | DONE (Conv: 1ce83567-c44a-443e-aeb1-8c0c611aafec) |
| 3 | Verification & Review | Run Puppeteer validation tests and perform code reviews | M2 | DONE (Conv: 4dc6ebd7-cadf-4373-9187-5ef16f602ca7) |
| 4 | Forensic Audit Gating | Execute Forensic Auditor check to verify no hardcoding/facades | M3 | IN_PROGRESS (Conv: 7a2204ce-67dc-4868-bb36-6b1f24dd6344) |

## Interface Contracts
### Panel ↔ Chrome Extension (via persistent connect port)
- **Scrape Menu Message**: `{ action: "scrapeMenuFromInstagram", instagramUrl: string, restaurantName: string }` sent over `scrapeMenuFromInstagramPort` -> returns success and extraction status.

## Code Layout
- `public/chrome-extension/background.js`: Service worker source.
- `dist/chrome-extension/background.js`: Compiled output of service worker.
- `src/pages/admin/expansion/components/CityValidation.tsx`: Frontend validation component.
