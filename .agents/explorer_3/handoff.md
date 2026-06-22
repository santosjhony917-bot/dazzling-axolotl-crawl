# Handoff Report

## 1. Observation

- **Instagram DOM Structure (Multi-link)**:
  In `scratch/alain_bio.html`, we observed the button indicating multiple links:
  ```html
  <button class=" _aswp _aswq _asws _aswu _asx0 _asx2" type="button">
    <div class="x3nfvp2 x193iq5w">
      <span class="xcknrev xyqdw3p">
        <svg aria-label="Link icon" class="x1lliihq x1n2onr6 x7l2uk3" ...><title>Link icon</title>...</svg>
      </span>
      <span class="..." dir="auto">
        <span class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft">alainesfihariapatos.saipos.com and 2 more</span>
      </span>
    </div>
  </button>
  ```
- **Previous Scraper Attempt**:
  In `scratch/menu_extractor.cjs` (lines 299–309), we observed a simple click action without dialog wait states or cleanup:
  ```javascript
  try {
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('header span, header [role="button"], header a'));
      for (const el of elements) {
        const text = (el.textContent || '').toLowerCase();
        if (text.includes('e mais') || text.includes('and ') || text.includes('others')) {
          el.click();
        }
      }
    });
    await delay(1500);
  } catch (e) {}
  ```
- **Current Bio Link Extraction**:
  In `public/chrome-extension/background.js` (lines 2596–2619), the extension has `handleMenuScrapeFromInstagram` which searches for anchors directly but doesn't handle multiple links/modal logic:
  ```javascript
  const links = Array.from(document.querySelectorAll('a'));
  for(let a of links) {
    const href = a.href || '';
    if(href.includes('linktr.ee') || href.includes('bio.link') ... ) { ... }
  }
  ```
- **AI Validator rules**:
  In `scratch/ai_validator.cjs` (line 945), rules are defined for choosing the correct link by city/neighborhood/unit:
  ```javascript
  // 7. SELEÇÃO DE LINK POR UNIDADE/CIDADE/BAIRRO (CRÍTICO): Se houver MÚLTIPLOS links na Bio...
  ```

---

## 2. Logic Chain

1. **Current Shortcoming**: The current script in `background.js` retrieves only direct bio links (using hardcoded domains) and cannot extract multiple links hidden behind the `"and X more"` button because it does not trigger the click or wait for the modal dialog `div[role="dialog"]`.
2. **Instagram Modal Trigger**: As seen in `alain_bio.html`, profiles with multiple links render a button with a `"Link icon"` title or label and text indicating additional links. Clicking this button dynamically renders a modal overlay with `role="dialog"`.
3. **Wait & Extraction Mechanism**: The script must click this button, wait for `div[role="dialog"]` to appear using a MutationObserver or a polling loop, and query all `a` elements within the dialog.
4. **Label Extraction**: Inside the modal, the inner text of each anchor usually has two lines: line 1 is the custom label (e.g., `"Unidade Patos"`) and line 2 is the domain. By splitting the text by `\n`, the script can extract the label, which is critical for location filtering.
5. **Cleanup**: To maintain the integrity of the tab state, the script must close the modal by clicking the close button (identified by `aria-label="Close"` or localized equivalent) or clicking the backdrop overlay.
6. **Selection and Integration**: The content script should return all extracted candidates (URL and label) to the background script, allowing the background script or the existing `ai_validator.cjs` to run contextual filtering (e.g., matching the restaurant's target city or neighborhood) which requires Supabase/Google Maps context.

---

## 3. Caveats

- **Login Requirement**: Assumes the user is logged into Instagram. If not, clicking the button or loading the profile page may trigger a login gate.
- **Localization**: Elements like the Link icon title (`"Link icon"` / `"Ícone de link"`) or multi-link text (`"and X more"` / `"e mais X"`) may change based on the Instagram account's locale settings. The script uses robust regex and multiple fallback strings to cover common languages (English, Portuguese, Spanish).
- **Dynamic Layout Changes**: Instagram class names are highly dynamic. To prevent breakage, the proposed selectors rely on stable functional roles (`role="dialog"`, `role="button"`) and standard attributes rather than class names.

---

## 4. Conclusion

- We proposed a robust extraction script that handles both single and multiple links, wait states, and dialog closures.
- Returning all extracted link candidates with their custom titles/labels back to the background script enables location-specific filtering through rule-based heuristics or the project's AI Validator.
- The detailed design is documented in `.agents/explorer_3/instagram_bio_extraction_report.md`.

---

## 5. Verification Method

To verify the proposed strategy:
1. Inspect the detailed report and script in `.agents/explorer_3/instagram_bio_extraction_report.md`.
2. To test the extraction logic in practice, open an Instagram profile with multiple links (e.g., `@alainesfiharia`) in a browser where you are logged in.
3. Open the browser's developer console, paste the `extractInstagramBioLinks` function, and run `await extractInstagramBioLinks()`.
4. Verify that:
   - The modal opens and closes automatically.
   - The function returns a list of candidate objects containing the correct URLs (decoded) and their corresponding labels (e.g., `"Unidade Patos"`).
