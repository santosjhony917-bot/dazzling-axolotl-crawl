# Instagram Bio Link Extraction - Design Context

## Problem Summary
- In modern Instagram updates, accounts with multiple links in their bio display a native `<button>` element instead of a standard `<a>` tag.
- The button contains text like `"URL and X more"` (or `"URL e mais X"`) and an SVG chain-link icon.
- Direct delivery links (e.g., Saipos, Anota AI) are hidden until this button is clicked and a modal dialog (`div[role="dialog"]`) is rendered.
- The current implementation in `background.js` only searches for static `<a>` elements and does not trigger the click or wait for the modal, leading to failure.

## Aggregated Selector & Extraction Design
1. **Modal Trigger Button Selector**:
   - Query all buttons in the profile header.
   - Look for an SVG with `aria-label="Link icon"` or `aria-label="Ícone de link"`.
   - Check if text content matches `/(?:and|e mais|y\s+\d+\s+más|e|\+)\s*\d+\s*(?:more|others|mais|más|outro?s)?/i`.
2. **Modal dialog wait**:
   - Wait for `div[role="dialog"]` to appear using MutationObserver.
3. **Extraction**:
   - Query all `<a>` links inside the modal dialog.
   - Clean/decode the `href` if it uses the `l.instagram.com/?u=` redirect.
   - For each link, split inner text by newlines `\n` to extract the label (line 1) and displayed URL (line 2).
4. **Cleanup**:
   - Close the modal by clicking the button with `aria-label="Close"`, `aria-label="Fechar"`, or a close SVG icon. Alternatively, click the parent backdrop overlay.
5. **Direct Bio Fallback**:
   - If no button is found or extraction returns empty, fall back to scanning `<a>` elements in the profile header directly.
6. **Background Selection / Filtering**:
   - Allow passing `city` and `neighborhood` in the connect message payload from the dashboard panel.
   - If `city` is provided, select candidate links matching the city name (case-insensitive).
   - If no matches or no city provided, find the first link matching known delivery platform keywords/domains (`saipos.com`, `anota.ai`, `linktr.ee`, etc.), or fall back to the first extracted link.
