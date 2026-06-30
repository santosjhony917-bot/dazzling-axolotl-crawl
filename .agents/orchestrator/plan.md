# Project Plan: Coleta Resiliente com Extensão, OCR Local, IA e Novas Melhorias

## Architecture
1. **Chrome Extension (`public/chrome-extension/background.js`)**:
   - Add a routine `cleanPopupsAndCookies` to identify and remove cookie banners, dialog backdrops, and modal popups (e.g., matching common classes or keywords like cookie, aceitar, fechar, consent).
   - Implement tab screen capture: after page loads and auto-clicks, activate the tab, wait for transition, and call `chrome.tabs.captureVisibleTab(null, { format: 'png' })`.
   - Send the captured image to the backend `/api/local-collector/ocr` using POST, and/or return the base64 image to the caller.
   - **Click Product Modals**: Expand elements/clickable selectors in line 1438 to include: `.item-content`, `[class*="item-content"]`, `.item-title`, `[data-qa="item-desc"]`, etc. Open product modal, capture inner text, append/inject text into the original element as `.scraper-extracted-modal-text` div, and close modal (via Close button or Escape key). Repeat for all items.
2. **Backend OCR local endpoint (`vite.config.ts`)**:
   - Install `tesseract.js` in `package.json` dependencies.
   - Add POST endpoint `/api/local-collector/ocr` to process base64 string, convert it to a Buffer, run Tesseract OCR on it using the Portuguese/English model, and return the extracted raw text.
3. **Menu Scraper & Validator (`scratch/menu_scraper.cjs` / `vite.config.ts`)**:
   - Receive traditional HTML scrape text (`rawText`) and OCR text (`ocrText`).
   - Implement text comparison logic: compare length, price counts, and log comparison results.
   - If traditional text is empty or fails, route OCR text to GPT-4o-mini for JSON structuring.
   - Pass the structured JSON through an AI Audit step (GPT-4o-mini) to cross-reference items and prices against the source text to prevent hallucinations.
   - Insert audited menu items and categories into Supabase `menu_categories` and `menu_items` tables.
4. **Instagram Validation & Phone Extraction (`scratch/validate_instagram.cjs`)**:
   - Update OpenAI prompts (both single profile validation and candidate selection) to collect and return `additional_phones` (secondary phone/WhatsApp contacts in bio).
   - Normalize and compare the extracted phone numbers with the existing main phone in the database (`rest.phone`).
   - If different and valid, concatenate them into the database `phone` field using a slash (` / `), e.g., `(83) 3113-0958 / (83) 98704-7570`.
   - Save the list of additional contacts in `visit_notes` (appending or setting it).
   - Log the phone enrichment process in `ai_log`.
5. **Frontend Integration (`src/pages/admin/expansion/components/CityValidation.tsx`)**:
   - Pass `restaurantId` to the extension.
   - Capture base64, trigger OCR, call `re-scrape-menu` with both traditional text and OCR text.
   - Verify success.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Extension Screen Capture & Modal Clicking | Implement cookie cleanup, product modal clicking, and `chrome.tabs.captureVisibleTab` in `background.js`. | None | PLANNED |
| 2 | Backend OCR Local Endpoint | Add `/api/local-collector/ocr` using `tesseract.js` in `vite.config.ts`. | None | PLANNED |
| 3 | AI Structuring & Audit Fallback | Update `menu_scraper.cjs` to compare texts, fallback to OCR, structure with GPT-4o-mini, and run a final AI audit step. | M2 | PLANNED |
| 4 | Instagram Additional Phone Extraction | Update `validate_instagram.cjs` to extract additional phones, concatenate to `phone`, write to `visit_notes`, and write to `ai_log`. | None | PLANNED |
| 5 | Frontend Integration & Verification | Update `CityValidation.tsx` to orchestrate the flow and run E2E validation verifying fallback mechanism and Instagram enrichment. | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Extension ↔ Backend OCR
- Endpoint: `/api/local-collector/ocr` (POST)
- Request: `{ image: "data:image/png;base64,...", restaurantId: "string" }`
- Response: `{ success: true, text: "string" }`

### Frontend ↔ Backend Menu Extraction
- Endpoint: `/api/local-collector/re-scrape-menu?restaurantId=...` (POST)
- Request: `{ parsedMenu: object (optional), rawText: string, ocrText: string }`
- Response: `{ success: true, count: number }`

## Code Layout
- `public/chrome-extension/background.js` - Tab screen capture, cookie cleaning, modal clicking, and OCR trigger.
- `public/chrome-extension/manifest.json` - Permissions check.
- `vite.config.ts` - Custom server middlewares for `/api/local-collector/ocr` and `/re-scrape-menu` routing.
- `package.json` - Add `tesseract.js` dependency.
- `scratch/menu_scraper.cjs` - Text comparison, fallback logic, AI structuring and audit.
- `scratch/validate_instagram.cjs` - Secondary phone numbers extraction, DB concatenation, saving to `visit_notes` and `ai_log`.
- `src/pages/admin/expansion/components/CityValidation.tsx` - Triggering execution.
