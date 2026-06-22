# Analysis: Instagram Bio Link Extraction Investigation

## Summary
The Instagram bio link extraction currently fails for profiles like `@alainesfiharia` because modern Instagram renders multiple bio links inside a `<button>` element rather than a standard `<a>` anchor tag. Since the actual delivery URLs (e.g., Saipos, Anota AI) are hidden within a modal sheet that only renders *after* clicking this button, the existing selector logic (which only queries static `<a>` elements on load) finds nothing. A robust solution must detect and click this "Multiple Links" button, wait for the modal to open, and then extract the links.

---

## 1. Location of Existing Selector/Extraction Logic
In `public/chrome-extension/background.js`, the Instagram bio link extraction is defined inside the function `handleMenuScrapeFromInstagram` (starting at line 2585). 

Specifically, lines 2596–2619 execute a script in the Instagram profile tab:
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
        if (attempts >= 15) { // 15 attempts * 500ms = 7.5 seconds
          clearInterval(interval);
          resolve(null);
        }
      }, 500);
    });
  }
});
```

---

## 2. Analysis of `scratch/alain_bio.html`
The cached HTML representing `https://www.instagram.com/alainesfiharia/` reveals the following DOM structure for the bio and links section:

```html
<section class="xc3tme8 x1xdureb x18wylqe x1vnunu7 x1iom2gc x172qv1o x1jfgfrl x69nqbv x2wt2w x6ikm8r x10wlt62">
  <div class="x7a106z x972fbf x10w94by x1qhh985 x14e42zd x9f619 x78zum5 xdt5ytf x2lah0s xdj266r x14z9mp xat24cr x1lziwak xexx8yu xyri2b x18d9i69 x1c1uobl x1n2onr6 x11njtxf x1fkh5qu x1ddbhtg x1dlrdel">
    
    <!-- Profile Name -->
    <div class="html-div ..."><span ...>Alain</span></div>
    
    <!-- Threads Link (renders as standard a tag) -->
    <div class="html-div ...">
      <div class="x1dc814f x1yrsyyn x10b6aqq">
        <a class="..." href="https://www.threads.com/@alainesfiharia..." role="link" ...>
          ...
        </a>
      </div>
    </div>
    
    <!-- Bio Text -->
    <span class="_ap3a _aaco _aacu _aacx _aad7 _aade" dir="auto">
      <div aria-disabled="false" role="button" tabindex="0" style="display: inline; cursor: pointer;">
        <span class="_ap3a _aaco _aacu _aacx _aad7 _aade" dir="auto">
          Atendimento: 10h às 23h30<br>
          Patos 83 99642-2426 | Sousa 83 99350-7609 <br>|  João Pessoa 83 98704-7570<br>⚠️FAÇA SEU PEDIDO
        </span>
      </div>
      ...
    </span>
    
    <!-- Multiple Links Button -->
    <button class=" _aswp _aswq _asws _aswu _asx0 _asx2" type="button">
      <div class="x3nfvp2 x193iq5w">
        <span class="xcknrev xyqdw3p">
          <svg aria-label="Link icon" class="x1lliihq x1n2onr6 x7l2uk3" ...>
            <title>Link icon</title>
            ...
          </svg>
        </span>
        <span class="x1lliihq x1plvlek xryxfnj x1n2onr6 xyejjpt x15dsfln x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye xvs91rp x1xlr1w8 x1rpgw6r" dir="auto" ...>
          <span class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft">alainesfihariapatos.saipos.com and 2 more</span>
        </span>
      </div>
    </button>

  </div>
</section>
```

---

## 3. Why the Existing Selector Logic Fails
1. **Element Tag Mismatch**: The crawler queries `a` (anchor) tags. However, the bio link element is a `<button type="button">` element.
2. **Missing `href` Attribute**: Since it's a `<button>`, it doesn't have an `href` attribute. The target URL is not present in any attribute of the button.
3. **Hidden content**: The actual bio links (specifically the Saipos links or Linktree/Anota AI URLs) are not present anywhere in the DOM initially. They are lazy-loaded and rendered inside a popup/bottom-sheet modal only after the button is clicked. 
4. **Unmatched Anchor tag**: The only anchor tag `<a>` within the bio section is the Threads profile link (`threads.com/@alainesfiharia`), which is ignored by the domain whitelist filter.

---

## 4. Proposed Robust Extraction Strategy
To make bio link extraction highly reliable under both old (single link) and new (multiple links button) Instagram layout versions, we propose the following multi-stage strategy:

### A. Detect and Click "Multiple Links" Button
If an Instagram account has multiple bio links, find and click the trigger button.
* **Identify the Button**: Locate `<button>` elements that:
  - Contain an SVG icon with `aria-label="Link icon"` or a `<title>` with "Link".
  - Or have text matching the pattern of "and X more" (e.g., `/and \d+ more/i` or `/e mais \d+/i` in Portuguese).
  - Or contain domain-like text (`/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/`).
* **Trigger Click**: Call `.click()` on the button to open the modal.

### B. Extract Links from Modal Dialog
Once clicked, wait briefly (500ms to 1000ms) for the modal/dialog to mount, and then query all `<a>` tags.
* **Modal Selector**: Select links inside the modal container, typically having `role="dialog"` or classes containing `dialog` or `sheet`.
* **Universal Fetch**: Query all `<a>` tags on the page, as any new links added by the modal will now be queried.

### C. Extract from Button Text (Fallback)
If the click fails or the modal does not open, parse the button text directly.
* E.g., from text `"alainesfihariapatos.saipos.com and 2 more"`, extract `"alainesfihariapatos.saipos.com"` and construct `"https://alainesfihariapatos.saipos.com"`.

### D. Single Link Scenario (Fallback)
If no multiple-link button is found, fallback immediately to scanning for standard `<a>` tags in the bio section (e.g. within the profile header or bio section).

### E. Resolve Redirects
Clean any `l.instagram.com` wrapper links to get the clean destination URL using `new URL(href).searchParams.get('u')`.

---

## 5. Draft Implementation Script
The proposed replacement script for the `bioLink` execution chunk in `handleMenuScrapeFromInstagram`:

```javascript
let bioLink = await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: async () => {
    return new Promise((resolve) => {
      // 1. Check for the Multiple Links button
      const buttons = Array.from(document.querySelectorAll('button'));
      const multiLinkButton = buttons.find(btn => {
        const text = btn.textContent || '';
        const hasLinkIcon = !!btn.querySelector('svg[aria-label*="Link"], svg title*="Link"');
        const hasMoreText = /and \d+ more/i.test(text) || /e mais \d+/i.test(text);
        const hasDomain = /[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
        return hasLinkIcon || hasMoreText || hasDomain;
      });

      // Helper function to extract matching URL from a list of strings/links
      const getMatchingLink = (urls) => {
        const keywords = ['linktr.ee', 'bio.link', 'goomer', 'anota.ai', 'livemenu', 'saipos', 'wa.me', 'ola.menu'];
        for (const url of urls) {
          if (!url) continue;
          if (keywords.some(kw => url.toLowerCase().includes(kw))) {
            return url;
          }
        }
        // Fallback to any external link that is not threads, facebook, or instagram
        for (const url of urls) {
          if (!url) continue;
          const lower = url.toLowerCase();
          if (!lower.includes('instagram.com') && !lower.includes('threads.net') && !lower.includes('facebook.com') && (lower.startsWith('http://') || lower.startsWith('https://'))) {
            return url;
          }
        }
        return null;
      };

      if (multiLinkButton) {
        console.log('[Scraper] Multiple links button detected. Clicking...');
        multiLinkButton.click();
        
        // Poll for the modal/dialog links
        let modalAttempts = 0;
        const modalInterval = setInterval(() => {
          modalAttempts++;
          
          // Get links inside dialog elements or anywhere on the page
          const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [class*="dialog"], [class*="sheet"]'));
          const links = [];
          
          if (dialogs.length > 0) {
            dialogs.forEach(dialog => {
              dialog.querySelectorAll('a').forEach(a => {
                if (a.href) links.push(a.href);
              });
            });
          } else {
            // General fallback: check all page a tags (modal links will be appended to DOM)
            document.querySelectorAll('a').forEach(a => {
              if (a.href) links.push(a.href);
            });
          }

          const matched = getMatchingLink(links);
          if (matched) {
            clearInterval(modalInterval);
            resolve(matched);
            return;
          }

          if (modalAttempts >= 10) { // 2 seconds timeout
            clearInterval(modalInterval);
            
            // Text-extraction fallback: extract domain name from button text
            const btnText = multiLinkButton.textContent || '';
            const domainMatch = btnText.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (domainMatch && domainMatch[1]) {
              resolve('https://' + domainMatch[1]);
            } else {
              resolve(null);
            }
          }
        }, 200);
      } else {
        // 2. Standard single link scanning loop
        let scanAttempts = 0;
        const scanInterval = setInterval(() => {
          scanAttempts++;
          const links = Array.from(document.querySelectorAll('a')).map(a => a.href);
          const matched = getMatchingLink(links);
          
          if (matched) {
            clearInterval(scanInterval);
            resolve(matched);
            return;
          }
          
          if (scanAttempts >= 10) {
            clearInterval(scanInterval);
            resolve(null);
          }
        }, 200);
      }
    });
  }
});
```
