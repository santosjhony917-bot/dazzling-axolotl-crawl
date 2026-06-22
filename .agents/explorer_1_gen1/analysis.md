# Instagram Bio Link Extraction Analysis Report

## Summary
The current Instagram scraper fails to extract bio links when a profile has multiple links configured. Instagram collapses multiple links into a single `<button>` element (e.g., displaying `"[first_domain] and X more"` alongside a link chain SVG icon). Because this element is a `<button>` without an `href` attribute, the scraper's query selector (`document.querySelectorAll('a')`) completely bypasses it, failing to extract the bio link.

This report documents the exact locations of the failing logic, explains the DOM structure of the logged-in Instagram profile from `scratch/alain_bio.html`, and proposes a robust, dual-stage extraction strategy that resolves the issue.

---

## 1. Location of Existing Selector Logic
In `public/chrome-extension/background.js`, within the `handleMenuScrapeFromInstagram` function (lines 2585–2619), the extension service worker executes the following selector logic inside the Instagram tab:

```javascript
// public/chrome-extension/background.js (lines 2596-2619)
let bioLink = await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: async () => {
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const links = Array.from(document.querySelectorAll('a'));
        for(let a of links) {
          const href = a.href || '';
          if(href.includes('linktr.ee') || href.includes('bio.link') || href.includes('goomer') || href.includes('anota.ai') || href.includes('livemenu') || href.includes('saipos') || href.includes('wa.me') || href.includes('ola.menu')) {
            clearInterval(interval);
            resolve(href);
            return;
          }
        }
        if (attempts >= 15) { // 15 attempts * 500ms = 7.5 seconds
          clearInterval(interval);
          resolve(null);
        }
      }, 500);
    });
  }
});
```

### Key Elements of Original Logic:
- **Selector:** `document.querySelectorAll('a')` (Queries only anchor elements).
- **Match Regex/Keywords:** `linktr.ee`, `bio.link`, `goomer`, `anota.ai`, `livemenu`, `saipos`, `wa.me`, `ola.menu`.
- **Method:** Iterates over `a` tags, reads the `href` attribute, and checks if it contains any of the keywords.

---

## 2. DOM Structure Analysis of `scratch/alain_bio.html`
In the cached logged-in Instagram profile page representation (`scratch/alain_bio.html`), the bio section is structured as follows:

```html
<section class="xc3tme8 x1xdureb x18wylqe x1vnunu7 x1iom2gc x172qv1o x1jfgfrl x69nqbv x2wt2w x6ikm8r x10wlt62">
  <div class="x7a106z x972fbf x10w94by x1qhh985 x14e42zd x9f619 x78zum5 xdt5ytf x2lah0s xdj266r x14z9mp xat24cr x1lziwak xexx8yu xyri2b x18d9i69 x1c1uobl x1n2onr6 x11njtxf x1fkh5qu x1ddbhtg x1dlrdel">
    <div class="html-div ...">Alain</div>
    <div class="html-div ...">
      <div class="x1dc814f x1yrsyyn x10b6aqq">
        <a class="..." href="https://www.threads.com/@alainesfiharia?xmt=..." role="link" tabindex="0" target="_blank">
          <!-- Threads SVG and Text -->
        </a>
      </div>
    </div>
    <span class="_ap3a _aaco _aacu _aacx _aad7 _aade" dir="auto">
      <!-- Bio Text description -->
      Atendimento: 10h às 23h30<br>Patos 83 99642-2426...
    </span>
    
    <!-- BIO LINK ELEMENT -->
    <button class=" _aswp _aswq _asws _aswu _asx0 _asx2" type="button">
      <div class="x3nfvp2 x193iq5w">
        <span class="xcknrev xyqdw3p">
          <svg aria-label="Link icon" class="x1lliihq x1n2onr6 x7l2uk3" fill="currentColor" height="12" role="img" viewBox="0 0 24 24" width="12">
            <title>Link icon</title>
            <path d="..." fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
          </svg>
        </span>
        <span class="x1lliihq x1plvlek xryxfnj x1n2onr6 xyejjpt x15dsfln x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye xvs91rp x1xlr1w8 x1rpgw6r" dir="auto">
          <span class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft">alainesfihariapatos.saipos.com and 2 more</span>
        </span>
      </div>
    </button>
  </div>
</section>
```

### Key Observations from the DOM:
1. **No Anchor (`<a>`) Tag for the Bio Link:** The primary link element is a `<button>` with `type="button"`.
2. **Text Containment:** The text inside this button is `"alainesfihariapatos.saipos.com and 2 more"`. This text shows the first domain and hints that there are 2 other links collapsed behind it.
3. **Link Icon SVG:** The button contains an SVG with the `aria-label="Link icon"` and a `<title>Link icon</title>` element, which is the standardized link indicator on Instagram.
4. **No href Attribute:** Because it is a `<button>`, there is no `href` attribute containing the URL.

---

## 3. Why the Original Logic Fails
1. **Selector Limitation:** The original logic does `document.querySelectorAll('a')`, which skips the `<button>` entirely.
2. **Missing `href`:** Even if the query selector included `button`, the code looks for `a.href`. The button does not have an `href` property.
3. **Information Hidden:** When there are multiple links, Instagram hides the actual target links inside a popup modal that only renders after the user clicks the `<button>`. Since the scraper never clicks the button, the other links (like `saipos.com` or other menu domains) are never added to the DOM and cannot be scraped.

---

## 4. Proposed Robust Extraction Strategy
To handle both profile formats (single link vs. multiple collapsed links) under logged-in and logged-out states, a robust, two-stage extraction strategy is required:

### Stage 1: Active Interactive Scraping (Real Browser Environment)
1. **Check for standard `<a>` tags:** Look for any direct links that match target domains.
2. **Locate multi-link button:** If no direct matching link exists, look for a `<button>` or element containing:
   - An SVG with `aria-label` or `<title>` containing "link" (case-insensitive).
   - Text containing target domains (e.g., `saipos.com`) and/or indicator phrases like `and X more` / `e mais X` / `others`.
3. **Simulate a Click:** Programmatically click the button to trigger Instagram's modal overlay.
4. **Poll for the Modal Links:** Wait up to 3 seconds for the modal (which populates the DOM with the actual `<a>` tags) to load, then select and return the matching link.
5. **Fall back to Text Parsing:** If clicking fails or links are not found in the modal, extract the partial domain directly from the button's text (e.g. `alainesfihariapatos.saipos.com`) using regex and prepend `https://`.

### Stage 2: Static DOM Fallback (Regex Parser)
If executed in a headless/static context where clicks cannot be simulated:
1. Locate the button or container with the link icon SVG.
2. Extract the text containing the domain.
3. Match it against the delivery domains list and construct the full URL.

---

## 5. Proposed Replacement Code for `background.js`
The following asynchronous function can replace the target logic in `public/chrome-extension/background.js` starting at line 2596:

```javascript
let bioLink = await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: async () => {
    return new Promise((resolve) => {
      const targetKeywords = ['linktr.ee', 'bio.link', 'goomer', 'anota.ai', 'livemenu', 'saipos', 'wa.me', 'ola.menu', 'linktree'];
      
      const isMatch = (url) => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return targetKeywords.some(kw => lowerUrl.includes(kw));
      };

      const cleanUrl = (url) => {
        if (url && url.includes('l.instagram.com/?u=')) {
          try {
            const urlParams = new URL(url).searchParams;
            return decodeURIComponent(urlParams.get('u') || url);
          } catch (e) {}
        }
        return url;
      };

      // Step 1: Look for direct matching <a> links in the DOM
      const links = Array.from(document.querySelectorAll('a'));
      for (let a of links) {
        const href = a.href || '';
        const cleaned = cleanUrl(href);
        if (isMatch(cleaned)) {
          resolve(cleaned);
          return;
        }
      }

      // Step 2: Look for the multiple-links button
      let multiLinkButton = null;
      const buttons = Array.from(document.querySelectorAll('button'));
      for (let btn of buttons) {
        // Detect by Link Icon SVG
        const hasLinkIcon = !!btn.querySelector('svg[aria-label*="link" i]') || 
                            (btn.querySelector('svg title') && btn.querySelector('svg title').textContent.toLowerCase().includes('link'));
        
        // Detect by text content pattern (domain + "and X more")
        const text = (btn.textContent || '').toLowerCase();
        const hasKeywords = targetKeywords.some(kw => text.includes(kw));
        const hasMore = text.includes('more') || text.includes('mais') || text.includes('other');

        if (hasLinkIcon || (hasKeywords && hasMore)) {
          multiLinkButton = btn;
          break;
        }
      }

      // Slower fallback if button detection failed: search by simple text match
      if (!multiLinkButton) {
        for (let btn of buttons) {
          const text = (btn.textContent || '').toLowerCase();
          if (targetKeywords.some(kw => text.includes(kw))) {
            multiLinkButton = btn;
            break;
          }
        }
      }

      // Step 3: If a button was found, click it to open the modal
      if (multiLinkButton) {
        console.log("[Scraper] Multi-link button found, clicking to reveal links...");
        multiLinkButton.click();

        // Step 4: Poll the DOM for links that appear inside the modal
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const modalLinks = Array.from(document.querySelectorAll('a'));
          for (let a of modalLinks) {
            const href = a.href || '';
            const cleaned = cleanUrl(href);
            if (isMatch(cleaned)) {
              clearInterval(interval);
              resolve(cleaned);
              return;
            }
          }

          if (attempts >= 10) { // 10 attempts * 300ms = 3.0 seconds
            clearInterval(interval);
            
            // Step 5: Fallback if modal did not load — Parse domain from button text
            const btnText = multiLinkButton.textContent || '';
            const domainRegex = /([a-z0-9-]+\.[a-z0-9-.]+)/i;
            const match = btnText.match(domainRegex);
            if (match && match[1]) {
              const extractedDomain = match[1].split(' ')[0];
              if (targetKeywords.some(kw => extractedDomain.includes(kw))) {
                resolve(`https://${extractedDomain}`);
                return;
              }
            }
            resolve(null);
          }
        }, 300);
      } else {
        resolve(null);
      }
    });
  }
});
```

---

## 6. Verification and Proof of Strategy
By analyzing the DOM of `scratch/alain_bio.html`:
- Standard `<a>` tags list:
  1. `href="#"` (text: `"71K followers"`)
  2. `href="#"` (text: `"419 following"`)
  3. `href="https://www.threads.com/@alainesfiharia..."`
  4. Highlight URLs (e.g. `/stories/highlights/...`)
  None of these match the original keywords.
- Button list:
  - Text: `"alainesfihariapatos.saipos.com and 2 more"`
  - SVG title: `"Link icon"`
- Running the proposed parser:
  1. Skips `<a>` tags because none are target delivery links.
  2. Identifies the button by the text `"alainesfihariapatos.saipos.com and 2 more"` and the SVG title `"Link icon"`.
  3. Under static/fallback mode, extracts the domain `"alainesfihariapatos.saipos.com"` from the button text via regex and resolves to `https://alainesfihariapatos.saipos.com`.
  4. Under interactive mode, clicks the button, polls the modal, and resolves to the exact target link.
