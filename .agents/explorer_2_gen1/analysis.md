# Instagram Bio Link Extraction Analysis Report

## Summary
This report analyzes why the current Instagram bio link extraction logic fails on profiles with multiple links (such as `https://www.instagram.com/alainesfiharia/`), using the cached DOM in `scratch/alain_bio.html` and the extension service worker code in `public/chrome-extension/background.js`. We propose a robust, multi-layered extraction strategy to solve this issue.

---

## 1. Location of Existing Selector Logic
The DOM query selectors and extraction logic for Instagram profiles are defined in:
* **File Path**: `public/chrome-extension/background.js`
* **Function**: `handleMenuScrapeFromInstagram` (specifically lines 2596-2619)
* **Code Implementation**:
  ```javascript
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
          if (attempts >= 15) { // 7.5 seconds timeout
            clearInterval(interval);
            resolve(null);
          }
        }, 500);
      });
    }
  });
  ```

---

## 2. Analysis of the Cached DOM (`scratch/alain_bio.html`)
The cached HTML representing the profile `https://www.instagram.com/alainesfiharia/` contains the following structure in the bio link section:
```html
<button class=" _aswp _aswq _asws _aswu _asx0 _asx2" type="button">
  <div class="x3nfvp2 x193iq5w">
    <span class="xcknrev xyqdw3p">
      <svg aria-label="Link icon" class="x1lliihq x1n2onr6 x7l2uk3" fill="currentColor" height="12" role="img" viewBox="0 0 24 24" width="12">
        <title>Link icon</title>
        <path d="m9.726 5.123 1.228-1.228a6.47 6.47 0 0 1 9.15 9.152l-1.227 1.227m-4.603 4.603-1.228 1.228a6.47 6.47 0 0 1-9.15-9.152l1.227-1.227" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
        <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="8.471" x2="15.529" y1="15.529" y2="8.471"></line>
      </svg>
    </span>
    <span class="x1lliihq x1plvlek xryxfnj x1n2onr6 xyejjpt x15dsfln x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye xvs91rp x1xlr1w8 x1rpgw6r" dir="auto" style="--x---base-line-clamp-line-height: 18px; --x-lineHeight: 18px;">
      <span class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft">alainesfihariapatos.saipos.com and 2 more</span>
    </span>
  </div>
</button>
```

---

## 3. Why the Existing Logic Fails
1. **Target Element Type**: The existing code selects only anchor (`<a>`) tags: `document.querySelectorAll('a')`. On profiles with multiple links, Instagram renders a `<button>` element instead of a direct link anchor.
2. **Missing `href` Attribute**: The target URL (`alainesfihariapatos.saipos.com`) is not defined in any `href` attribute on load. Instead, it is embedded as plain text inside a child `<span>` element inside the `<button>`.
3. **Hidden / Lazy Loaded Links**: The additional links (the "2 more" links) are not rendered in the static HTML document at all. They are only fetched/rendered after clicking the button to open a modal.
4. **Failure Outcome**: The extraction script times out after 7.5 seconds, returning `null`, which causes `handleMenuScrapeFromInstagram` to abort with the error: `"Nenhum link de cardápio encontrado na Bio do Instagram."`

---

## 4. Proposed Robust Extraction Strategy
To resolve this issue, the extraction script must support **multi-link profiles** by detecting the bio link button, interacting with it to open the links drawer, and falling back to parsing the button text if interaction fails.

### A. Phase 1: Direct Anchor Extraction (Standard Path)
Query all direct anchor tags. If an `href` matches our target domains/keywords, resolve immediately.

### B. Phase 2: Detect the Link Button (Multi-Link Path)
If no direct anchor matches, search the DOM for a button containing a link icon or text matching multiple links pattern:
```javascript
const linkButton = Array.from(document.querySelectorAll('button')).find(btn => {
  const hasLinkIcon = btn.querySelector('svg[aria-label="Link icon"]') ||
                      btn.querySelector('svg[aria-label*="Link"]') ||
                      Array.from(btn.querySelectorAll('svg title')).some(title => title.textContent.toLowerCase().includes('link'));
  const text = (btn.textContent || '').toLowerCase();
  return hasLinkIcon || (text.includes('and ') && (text.includes('more') || text.includes('others')));
});
```

### C. Phase 3: Extraction Implementation
If `linkButton` is found, apply a two-pronged approach:

#### 1. Interactive Modal Scraping (Primary Strategy)
Simulate a click on the button, wait for the modal dialog to appear, and then scrape all anchor elements within it:
```javascript
if (linkButton) {
  // Click to open the links sheet
  linkButton.click();
  
  // Wait for the modal/dialog to appear (usually role="dialog" or wrapper)
  await new Promise((resolveModal) => {
    let modalAttempts = 0;
    const modalInterval = setInterval(() => {
      modalAttempts++;
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('div[class*="dialog"], div[class*="modal"]');
      if (dialog) {
        const dialogLinks = Array.from(dialog.querySelectorAll('a'));
        // Find if any link matches our target domains
        for (const a of dialogLinks) {
          let href = a.href || '';
          // Resolve Instagram redirection wrapper if present
          if (href.includes('l.instagram.com/?u=')) {
            try {
              const urlParams = new URL(href).searchParams;
              href = decodeURIComponent(urlParams.get('u') || href);
            } catch (e) {}
          }
          if (href.includes('saipos') || href.includes('anota.ai') || href.includes('linktr.ee') || href.includes('bio.link') || href.includes('goomer') || href.includes('livemenu') || href.includes('wa.me') || href.includes('ola.menu')) {
            clearInterval(modalInterval);
            resolveModal(href); // Found a valid menu/delivery link!
            return;
          }
        }
      }
      
      if (modalAttempts >= 10) { // 3 seconds timeout
        clearInterval(modalInterval);
        resolveModal(null);
      }
    }, 300);
  });
}
```

#### 2. Passive Text Fallback (Secondary Fallback)
If the modal fails to open or if we are executing in a non-interactive/static environment (such as server-side parsing of `alain_bio.html`), extract the URL pattern directly from the button's text:
```javascript
if (linkButton) {
  const buttonText = linkButton.textContent || '';
  // Match domain patterns like alainesfihariapatos.saipos.com
  const domainMatch = buttonText.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (domainMatch) {
    const domain = domainMatch[1];
    const url = `https://${domain}`;
    if (url.includes('saipos') || url.includes('anota.ai') || url.includes('linktr.ee') || url.includes('bio.link') || url.includes('goomer') || url.includes('livemenu') || url.includes('wa.me') || url.includes('ola.menu')) {
      return url;
    }
  }
}
```

---

## 5. Verification on `scratch/alain_bio.html`
Applying the **Passive Text Fallback** on the cached structure:
1. `linkButton` is successfully located via `<button>` selection containing the link icon/title.
2. `linkButton.textContent` returns `"alainesfihariapatos.saipos.com and 2 more"`.
3. The regex match retrieves `"alainesfihariapatos.saipos.com"`.
4. Prefixing `https://` gives `"https://alainesfihariapatos.saipos.com"`.
5. The extracted URL contains `"saipos"`, which matches the target domains and is returned successfully.
