# DOM Analysis of Instagram Bio Links

This report provides a detailed analysis of the DOM structure of Instagram profile pages, specifically studying the saved DOM in `scratch/alain_bio.html` (which represents the real DOM structure of a logged-in Instagram profile page for `https://www.instagram.com/alainesfiharia/`).

---

## 1. Bio Link Location in the DOM

In `scratch/alain_bio.html`, the bio content and links are located in the fourth `<section>` element of the profile page hierarchy. This section has the following classes:
`xc3tme8 x1xdureb x18wylqe x1vnunu7 x1iom2gc x172qv1o x1jfgfrl x69nqbv x2wt2w x6ikm8r x10wlt62`.

Inside this section:
1. A container `div` holds all bio components: profile name, Threads link, bio text, and the bio link element.
2. The bio text is enclosed in a `span` with classes `_ap3a _aaco _aacu _aacx _aad7 _aade`.
3. Directly following the bio text, the bio link element is rendered.

---

## 2. DOM Elements, Classes, Attributes, and SVG Icons

For a profile with **multiple links** (as in the case of `alainesfiharia`), the bio link element is rendered as a `<button>` rather than an anchor link. Below is the detailed breakdown:

### HTML Snippet (Multiple Links)
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

### Attributes and Classes Breakdown
- **Element Tag**: `<button>`
- **Classes**: ` _aswp _aswq _asws _aswu _asx0 _asx2` (note the leading space, indicating static or utility styling classes).
- **Attributes**:
  - `type="button"`
  - *Note*: It lacks `href`, `target`, and `role="button"` attributes.
- **SVG Icon**:
  - `aria-label="Link icon"`
  - `class="x1lliihq x1n2onr6 x7l2uk3"`
  - Inner `<title>`: `"Link icon"`
  - Represents a chain link icon with `path` and `line` drawings.
- **Text Content**:
  - `"alainesfihariapatos.saipos.com and 2 more"` (nested inside standard Stylex `span` elements).

---

## 3. DOM Differences: Single Link vs. Multiple Links

The DOM structure diverges significantly based on whether the Instagram profile has one link or multiple links configured in its bio.

| Feature | Single Link DOM Structure | Multiple Links DOM Structure |
|---|---|---|
| **Primary HTML Element** | Anchor `<a>` | Button `<button>` |
| **Direct URL (`href`)** | Yes (`href="https://l.instagram.com/?u=..."`) | No (requires clicking to open modal) |
| **Attributes Present** | `role="link"`, `target="_blank"` | `type="button"` (no `role` or `href` attributes) |
| **Text Content Pattern** | `domain.com/path` | `[first_link] and [N] more` (e.g. `domain.com and 2 more`) |
| **Accessibility Role** | `link` | Default `button` (from native element) |
| **Availability of Target URLs** | Instantly accessible in initial DOM | Hidden; requires clicking the button to render target URLs in a popup/bottom-sheet modal |

### Single Link DOM Example (Inferred from Workspace Scraper Rules)
```html
<a class="x1i10hfl xjbqb8w ... x1a2a7pz" href="https://l.instagram.com/?u=https%3A%2F%2Fdomain.com%2F&amp;e=..." role="link" tabindex="0" target="_blank">
  <div class="...">
    <svg aria-label="Link icon" class="..." ...><title>Link icon</title>...</svg>
  </div>
  <span class="...">domain.com</span>
</a>
```

---

## 4. Selector Discrepancy & Root Cause of Failures

The current Chrome Extension (`public/chrome-extension/background.js`) fails to scrape multiple bio links due to two primary issues:

1. **No Button Click Execution**:
   - The background script (`background.js` lines 2596-2619) only queries `document.querySelectorAll('a')` and checks if their `href` matches menu keywords.
   - It **does not click** the "and X more" button. Because the links are not in the DOM initially, it fails to find any URL, resulting in a `'Nenhum link de cardápio encontrado na Bio do Instagram.'` error.

2. **Fragile Scraper Selectors**:
   - The standalone Node script `scratch/menu_extractor.cjs` has a click helper but uses the selector `header span, header [role="button"], header a`.
   - In modern Instagram updates (or mobile/embedded views), the `<header>` element is absent (replaced by `<section>`).
   - The native `<button>` element does not have `role="button"` and is not a `span` or `a`, meaning the selector completely misses it.
