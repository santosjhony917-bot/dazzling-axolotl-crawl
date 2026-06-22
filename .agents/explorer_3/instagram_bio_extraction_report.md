# Strategy & Injection Script for Instagram Bio Link Extraction

## Executive Summary
This report proposes a robust strategy and injection script logic for extracting the official cardápio/website link from an Instagram profile bio. The strategy is designed to work in two scenarios:
1. **Single link profile**: The bio contains a single direct link.
2. **Multi-link profile**: The bio contains multiple links hidden behind an interactive "and X more" / "e mais X" button, which opens a modal of links when clicked.

The proposed solution includes a self-contained content script logic to be executed in the page context, a wait/synchronization mechanism for handling dynamic DOM changes, a cleanup protocol, and a hybrid selection strategy combining rule-based heuristics and AI validation.

---

## 1. DOM Architecture Analysis

Based on the structure of Instagram profile pages (including `scratch/alain_bio.html`), the bio links can be represented in two ways depending on the account configuration:

### Case A: Single Bio Link
A standard anchor `<a>` element rendered directly in the profile header.
- **Selector Heuristics**: Inside the `<header>` container, there is an `<a>` tag whose `href` points to an external link or `l.instagram.com` redirect wrapper.
- **Markup Signature**:
  ```html
  <a class="x1i10hfl ... _aswp" href="https://l.instagram.com/?u=https%3A%2F%2Flinktr.ee%2Fmyrestaurant&e=..." target="_blank" role="link">
    <div class="...">
      <svg aria-label="Link icon" ...></svg>
      <span>linktr.ee/myrestaurant</span>
    </div>
  </a>
  ```

### Case B: Multiple Bio Links (Modal Trigger)
When an account configures multiple links, Instagram displays only the first link accompanied by a button/span indicating the number of additional links.
- **Selector Heuristics**: An interactive `<button>` or `[role="button"]` element inside the profile header containing:
  1. An SVG element with `aria-label="Link icon"` (English) or `aria-label="Ícone de link"` (Portuguese).
  2. Text content matching patterns like `"and X more"` or `"e mais X"` (e.g., `alainesfihariapatos.saipos.com and 2 more`).
- **Markup Signature**:
  ```html
  <button class=" _aswp _aswq _asws _aswu _asx0 _asx2" type="button">
    <div class="x3nfvp2 x193iq5w">
      <span class="xcknrev xyqdw3p">
        <svg aria-label="Link icon" ...><title>Link icon</title>...</svg>
      </span>
      <span class="..." dir="auto">
        <span>alainesfihariapatos.saipos.com and 2 more</span>
      </span>
    </div>
  </button>
  ```
- **Modal Behavior**: Clicking this button opens a modal dialog container (`div[role="dialog"]`) displaying all links vertically, each containing a title/label and a URL.
  - Row Text Structure: Usually renders the custom label (e.g., `"Unidade Patos"`) on the first line, and the destination URL (e.g., `"alainesfihariapatos.saipos.com"`) on the second line.

---

## 2. Proposed Content Script Injection Logic

Below is the proposed Javascript logic to be injected into the Instagram tab via `chrome.scripting.executeScript`. It handles detection, triggers the click for multiple links, waits for the modal asynchronously, extracts all links with their label context, closes the modal to restore the page state, and returns a structured array of link candidates.

```javascript
async function extractInstagramBioLinks() {
  // Helper to wait for a selector to appear in the DOM using MutationObserver
  const waitForElement = (selector, timeout = 3000) => {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const target = document.querySelector(selector);
        if (target) {
          observer.disconnect();
          resolve(target);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  };

  // Helper to extract and decode the final destination URL from Instagram redirect wrapper
  const cleanInstagramUrl = (url) => {
    if (!url) return '';
    if (url.includes('l.instagram.com/?u=') || url.includes('l.instagram.com/')) {
      try {
        const urlObj = new URL(url);
        const u = urlObj.searchParams.get('u');
        if (u) return decodeURIComponent(u);
      } catch (e) {}
    }
    return url;
  };

  // Helper to exclude non-delivery social media profiles or self-referential links
  const isIgnoredDomain = (url) => {
    const ignored = [
      'instagram.com',
      'facebook.com',
      'threads.net',
      'twitter.com',
      'x.com',
      'youtube.com',
      'tiktok.com'
    ];
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return ignored.some(domain => hostname.includes(domain));
    } catch (e) {
      return false;
    }
  };

  const results = [];

  // Target the profile header to scope selector searches (avoids grid posts/stories)
  const header = document.querySelector('header');
  const searchRoot = header || document.body;

  // 1. Detect multiple links button (contains "Link icon" svg and "and X more" text)
  const buttons = Array.from(searchRoot.querySelectorAll('button[type="button"], [role="button"]'));
  let multiLinkButton = null;

  for (const btn of buttons) {
    const hasLinkIcon = !!btn.querySelector('svg[aria-label="Link icon"], svg[aria-label="Ícone de link"]') ||
                        (btn.textContent && btn.textContent.toLowerCase().includes('link'));
    const btnText = btn.textContent || '';
    
    // Patterns for multi-link text: "and X more", "e mais X", "+ X more", "y X más"
    const multiLinkPattern = /(?:and|e mais|y\s+\d+\s+más|e|\+)\s*\d+\s*(?:more|others|mais|más|outro?s)?/i;
    
    if (hasLinkIcon && multiLinkPattern.test(btnText)) {
      multiLinkButton = btn;
      break;
    }
  }

  // 2. Multi-link Flow
  if (multiLinkButton) {
    console.log('[Extension Scraper] Multiple links button detected. Opening modal...');
    multiLinkButton.click();

    // Wait for the dialog to load (Instagram modal uses role="dialog")
    const dialog = await waitForElement('div[role="dialog"]', 3000);
    if (dialog) {
      console.log('[Extension Scraper] Modal opened. Extracting links...');
      const anchors = Array.from(dialog.querySelectorAll('a'));
      
      for (const a of anchors) {
        const href = a.getAttribute('href') || a.href || '';
        const decoded = cleanInstagramUrl(href);
        
        if (decoded && decoded.startsWith('http') && !isIgnoredDomain(decoded)) {
          // Extract text label and url text inside the modal link
          const innerText = a.innerText || a.textContent || '';
          
          // Split by newline: Line 1 is the Title/Label (e.g. "Cardápio Unidade Centro")
          // Line 2 is the displayed URL (e.g. "anota.ai")
          const lines = innerText.split('\n').map(l => l.trim()).filter(Boolean);
          const label = lines[0] || '';
          const urlText = lines[1] || '';
          
          results.push({
            url: decoded,
            label: label,
            urlText: urlText,
            source: 'modal',
            rawText: innerText
          });
        }
      }

      // Cleanup: Close the modal
      const closeBtn = Array.from(dialog.querySelectorAll('button')).find(btn => {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = btn.textContent.toLowerCase();
        return label.includes('close') || label.includes('fechar') || text.includes('close') || text.includes('fechar') ||
               btn.querySelector('svg[aria-label="Fechar"]') || btn.querySelector('svg[aria-label="Close"]');
      });

      if (closeBtn) {
        closeBtn.click();
      } else {
        // Fallback: click backdrop overlay (the overlay is usually the parent of the dialog)
        const overlay = dialog.parentElement;
        if (overlay) overlay.click();
      }
      
      // Small pause to allow the modal close animation to finish
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.warn('[Extension Scraper] Modal did not open in time.');
    }
  }

  // 3. Fallback / Single Link Flow
  // Runs if no multi-link button was found, or if the modal failed to load any links
  if (results.length === 0) {
    console.log('[Extension Scraper] Scanning for single bio links...');
    const anchors = Array.from(searchRoot.querySelectorAll('a'));
    
    for (const a of anchors) {
      const href = a.getAttribute('href') || a.href || '';
      const decoded = cleanInstagramUrl(href);
      
      // Filter out links inside stories/highlights/posts
      const isInsideStories = !!a.closest('a[href*="/stories/"]');
      const isInsidePosts = !!a.closest('a[href*="/p/"], a[href*="/reels/"]');
      
      if (decoded && decoded.startsWith('http') && !isInsideStories && !isInsidePosts && !isIgnoredDomain(decoded)) {
        const innerText = (a.innerText || a.textContent || '').trim();
        results.push({
          url: decoded,
          label: innerText,
          urlText: innerText,
          source: 'bio_direct',
          rawText: innerText
        });
      }
    }
  }

  return results;
}
```

---

## 3. Link Selection & Filtering Strategy

When multiple bio links are returned, the extension must filter and select the link that belongs to the target establishment. We propose a **hybrid selection strategy** combining a fast local rule-based filter followed by AI validation for ambiguous cases.

### Strategy A: Return All Candidates (Recommended)
The content script should **always extract and return all candidates** to the background script. 
1. **Rationale**: The background script has full context of the target restaurant (retrieved from Google Maps or Supabase) such as:
   - Official name
   - City
   - Neighborhood
   - Physical address
   This details are not usually present in the DOM of the Instagram page itself, so keeping the content script read-only and letting the background script decide is more robust and cleaner.
2. **Implementation in `background.js`**:
   The background script receives the array of candidate links:
   ```javascript
   const candidates = await chrome.scripting.executeScript({ target: { tabId }, func: extractInstagramBioLinks });
   ```

---

### Strategy B: Fast Rule-Based Local Filtering (Background Script)
Before running expensive AI requests, the background script can filter candidates using fast string matching:

1. **Exact Location Match**:
   If a candidate's `label` or `url` mentions the restaurant's target city or neighborhood, select it.
   - *Example*: Target City = `"Patos"`. Candidate `label` = `"Cardápio Patos"`. Match found!
2. **Exclude Other Units**:
   If a candidate mentions another known city in the region, reject it.
   - *Example*: Target City = `"Patos"`. Candidate `label` = `"Unidade Sousa"`. Exclude.
3. **Keyword Ranking**:
   If no location matches are found, rank the candidates based on delivery keywords:
   - **Score 5**: Contains `"cardapio"`, `"cardápio"`, `"menu"`.
   - **Score 4**: Contains `"pedido"`, `"delivery"`, `"delivery"`, `"ifood"`, `"comprar"`.
   - **Score 3**: Points to known delivery aggregators (`linktr.ee`, `bio.link`, `heylink.me`, `anota.ai`, `goomer.app`, `saipos.com`, `ola.click`).
   - **Score 2**: WhatsApp link (`wa.me`, `api.whatsapp.com`).
   - **Score 1**: Generic link.

---

### Strategy C: AI-Based Selection (AI Validator integration)
If rule-based filtering results in a tie (multiple candidates look generic or have equal scores), or if the unit name is ambiguous, use the project's existing AI Validator (`scratch/ai_validator.cjs`).

We pass the candidates array to the LLM (GPT-4o-mini) with the following context and prompt instructions:

#### Prompt Details:
```
Você é um analisador de links de delivery.
O restaurante alvo fica na cidade: "${city}", bairro: "${neighborhood}" e endereço: "${address}".
Aqui estão os links extraídos da bio do Instagram:
${JSON.stringify(candidates)}

Sua tarefa é selecionar o link correto para a nossa unidade.
Regras:
1. Se a label ou URL do link mencionar OUTRA cidade (ex: Sousa, Campina Grande), REJEITE.
2. Se a label ou URL do link mencionar explicitamente a nossa cidade ("${city}") ou bairro ("${neighborhood}"), selecione-o.
3. Se houver links específicos para outras cidades e um link genérico (ex: "Fazer Pedido", "WhatsApp"), e a nossa cidade não estiver listada nos específicos, selecione o link genérico.
4. Analise DDDs de números de WhatsApp se presentes nas labels (ex: DDD 83 bate com Paraíba, DDD 11 bate com São Paulo).

Retorne um JSON:
{
  "selectedIndex": <número do índice escolhido ou -1 se nenhum for válido>,
  "reason": "Explicação da escolha",
  "confidence": "alta" | "media" | "baixa"
}
```

This ensures complete alignment with the existing validation architecture, avoiding duplicate implementations and maintaining high accuracy.
