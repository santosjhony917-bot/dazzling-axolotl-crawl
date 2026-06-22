# Handoff Report — Explorer 2 (DOM Analysis & Selector Audit)

## 1. Observation
I analyzed the saved DOM of a logged-in Instagram profile page in `scratch/alain_bio.html` representing the profile `https://www.instagram.com/alainesfiharia/` (which has multiple bio links).

Key files observed:
- DOM file: `scratch/alain_bio.html`
- Extension Service Worker: `public/chrome-extension/background.js`
- Standalone Puppeteer script: `scratch/menu_extractor.cjs`

### Verbatim DOM Snippet for Multiple Links
The multiple-link container is represented as a native `<button>` element inside a `<section>` container (not a `<header>`):
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

### Verbatim Extension Code (`background.js` lines 2603-2611)
The extension only queries `a` tags without any button click triggers:
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

### Verbatim Standalone Code (`menu_extractor.cjs` lines 300-309)
The standalone scraper uses a fragile selector checking for `header` elements:
```javascript
    // Revela links escondidos na bio (ex: "e mais 2")
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

---

## 2. Logic Chain
1. **Observation of multiple links**: When an Instagram profile has multiple links, it renders as a native `<button>` element. The target links (e.g. redirect urls via `l.instagram.com`) are **not** present in the initial DOM. They only populate the page once the button is clicked.
2. **Analysis of extension (`background.js`)**: The service worker only polls for `<a>` anchors. It does not click any buttons or attempt to expand multiple links.
3. **Analysis of standalone crawler (`menu_extractor.cjs`)**: Although the standalone crawler attempts to click bio expanders, it utilizes the selector `'header span, header [role="button"], header a'`.
4. **Discrepancy**:
   - There is no `<header>` element in the profile section of `alain_bio.html` (it is a `<section>`).
   - The native `<button>` element lacks the explicit `role="button"` attribute and is not a `span` or `a` element.
   - Therefore, the selector `'header span, header [role="button"], header a'` fails to match the actual DOM structure of the bio link button.

---

## 3. Caveats
- Obfuscated utility classes like ` _aswp _aswq...` are highly dynamic and subject to change by Instagram.
- The tag wrapper (e.g., `<header>` vs `<section>`) can vary between web layout versions (e.g., mobile web viewport vs desktop web viewport).
- I did not test active clicking since I am running in read-only investigation mode.

---

## 4. Conclusion
The bio link extraction fails for multiple links because:
1. The Chrome extension (`background.js`) has no click handler to reveal hidden links in the bio.
2. The standalone script (`menu_extractor.cjs`) uses a fragile selector (`header [role="button"]`) that fails on native `<button>` elements and when `<header>` is replaced by `<section>`.

**Recommendation**:
Update `background.js` and `menu_extractor.cjs` to:
1. Look globally for `<button>` or `[role="button"]` elements containing text patterns like `"and "` / `"more"` / `"e mais"` / `"others"`, or possessing an SVG child with `aria-label="Link icon"`.
2. Click the button to expand the links and wait for the modal to render.
3. Query all `<a>` links after expansion to find the valid redirect URL.

---

## 5. Verification Method
To verify the DOM elements and test selections, open `scratch/alain_bio.html` in a browser and execute the following JS snippets in the developer console:

```javascript
// Test Selector 1: Find the native button globally by text content
const buttonByText = Array.from(document.querySelectorAll('button, [role="button"]')).find(el => {
  const text = el.textContent.toLowerCase();
  return text.includes('and ') || text.includes('e mais') || text.includes('more') || text.includes('others');
});
console.log("Found button by text:", buttonByText);

// Test Selector 2: Find the button using the Link SVG Icon inside it
const buttonBySvg = Array.from(document.querySelectorAll('button, [role="button"]')).find(el => {
  return !!el.querySelector('svg[aria-label="Link icon"], svg title');
});
console.log("Found button by SVG:", buttonBySvg);
```
Both of these test selectors successfully match the `<button>` element in `scratch/alain_bio.html`, verifying that a text-based or icon-based global query is highly resilient.
