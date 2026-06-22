## 2026-06-22T05:37:05Z
You are Worker 1, the implementation subagent. Your working directory is c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\.agents\worker_ig_bio_1.
Your task is to implement the Instagram bio link extraction fix inside the Chrome Extension files and the dashboard frontend.

### Requirements:
1. Modify `public/chrome-extension/background.js` to implement the robust bio link extraction logic:
   - Identify if there is a multi-link button on the page (matching Link icon svg or "link" text, and regex patterns for "and X more" / "e mais X").
   - If found, click it and wait for `div[role="dialog"]` to appear using a promise-based MutationObserver.
   - Extract all `<a>` links inside the modal, parse their labels (line 1 of innerText) and URLs (decoded from `l.instagram.com`).
   - Close the modal by finding and clicking the close button/svg or clicking the backdrop overlay.
   - Fallback to scanning direct `<a>` elements in the profile header if no button is found.
   - Match candidates against the target `city` and `neighborhood` if provided in the message. If a city match is found, use that link.
   - If no city is provided or no match is found, select the first link pointing to a known delivery domain (`saipos.com`, `anota.ai`, `goomer.app`, `linktr.ee`, etc.), or fall back to the first candidate.
   - Return/navigate the tab to that selected URL.
2. Modify `src/pages/admin/expansion/components/CityValidation.tsx` around line 499:
   - Pass the restaurant's `city` and `neighborhood` in the connection port payload so the background script can use them for exact location-based matching:
     ```typescript
     port.postMessage({ 
       action: "scrapeMenuFromInstagram", 
       instagramUrl: activeInstagramUrl, 
       restaurantName: restaurant.name,
       city: restaurant.city || '',
       neighborhood: restaurant.neighborhood || ''
     });
     ```
3. Run the build command `npm run build` using the run_command tool to compile the extension to `dist/chrome-extension/background.js`. Verify it builds without errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write a detailed handoff.md in your working directory reporting the code changes (with diffs) and the compilation output.
