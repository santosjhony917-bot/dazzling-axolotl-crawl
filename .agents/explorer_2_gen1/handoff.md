# Handoff Report — Instagram Bio Link Extraction Investigation

## 1. Observation
* **File Location**: `public/chrome-extension/background.js` (lines 2596-2619) defines the script executed on the Instagram tab to locate bio links:
  ```javascript
  const links = Array.from(document.querySelectorAll('a'));
  for(let a of links) {
    const href = a.href || '';
    if(href.includes('linktr.ee') || href.includes('bio.link') || href.includes('goomer') || href.includes('anota.ai') || href.includes('livemenu') || href.includes('saipos') || href.includes('wa.me') || href.includes('ola.menu')) {
      clearInterval(interval);
      resolve(href);
      return;
    }
  }
  ```
* **Cached DOM structure** in `scratch/alain_bio.html`:
  ```html
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
  ```
* **Grep search** for `saipos` or `anota` in the rest of `scratch/alain_bio.html` returned no other occurrences besides this button element.

## 2. Logic Chain
1. The extension scraper expects the bio link to be inside a standard anchor (`<a>`) element with an `href` containing keywords like `'saipos'`, `'linktr.ee'`, etc.
2. In the profile page of `alainesfiharia`, Instagram renders a `<button>` tag instead of an `<a>` tag because there are multiple links registered on the profile.
3. The actual URL `"alainesfihariapatos.saipos.com"` is present only as text content inside a nested child `<span>` of that `<button>` element.
4. Because the existing scraper code only queries `document.querySelectorAll('a')`, it completely ignores `<button>` tags, and fails to find the URL, eventually timing out after 7.5 seconds and aborting.
5. In order to successfully extract links on profiles with multiple bio links, the script must query `<button>` tags, match the link icon/text indicators, and click them to open the links drawer (or parse the URL from the button's text content).

## 3. Caveats
* **Static DOM Constraints**: If the profile page DOM is analyzed in a static context (i.e. without execution of client-side JS or interaction), the additional links (under the "2 more") cannot be loaded, so only the first link represented in the button text can be extracted.
* **Locale Variations**: The button text structure (`"and X more"`) might change depending on the user's language settings in Instagram (e.g. `"e mais X"`, `"y X más"`). The selector must therefore rely heavily on structural features like the SVG `aria-label="Link icon"` or title tag `"Link icon"` rather than text-only matches.

## 4. Conclusion
The existing selector logic fails because it is restricted to `<a>` tags and does not handle the newer `<button>` elements that Instagram uses for accounts with multiple bio links. 
A robust fix requires implementing a multi-layered extraction approach:
1. Try direct anchors (`<a>`) as standard.
2. If none match, locate the bio link `<button>` via the Link Icon SVG.
3. Click the button to open the modal and scrape the nested `<a>` links.
4. Fall back to parsing the domain pattern directly from the button's text content.

## 5. Verification Method
1. Inspect the cached HTML `scratch/alain_bio.html` to confirm that the text `"alainesfihariapatos.saipos.com"` exists only inside the described `<button>` structure and that no other matching `<a>` tags exist.
2. Verify the logic in a Javascript environment by evaluating the proposed selection script:
   ```javascript
   const btn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg[aria-label="Link icon"]') || b.textContent.includes('more'));
   console.log(btn.textContent); // Should output: "alainesfihariapatos.saipos.com and 2 more"
   ```
3. Test extraction:
   ```javascript
   const match = btn.textContent.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
   console.log(match[1]); // Should output: "alainesfihariapatos.saipos.com"
   ```
