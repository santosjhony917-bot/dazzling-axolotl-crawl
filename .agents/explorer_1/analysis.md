# Detailed Codebase Analysis: Chrome Extension Scraping and Tab Operations Resilience

This report analyzes the behavior of the Chrome Extension service worker (`public/chrome-extension/background.js`), specifically focusing on the `scrapeMenuFromInstagram` action port closure, the menu extraction flow (Instagram -> Linktree -> Anota AI), and resilience strategies for the Chrome Tabs API.

---

## 1. The 'scrapeMenuFromInstagram' Port Closure Issue

When the frontend sends the action `'scrapeMenuFromInstagram'` via `chrome.runtime.sendMessage`, the message channel often closes immediately with the error:
`"The message port closed before a response was received"`

### Root Cause Analysis
In Manifest V3, service workers are short-lived, event-driven environments. When a message listener returns `true`, it signals to Chrome that `sendResponse` will be called asynchronously, keeping the port open. However:
1. **Message Channel Timeout:** Chrome enforces a strict timeout on message ports (typically between 10 to 15 seconds) to prevent extensions from keeping service workers alive indefinitely.
2. **Aggressive Hardcoded Delays:** The function `handleMenuScrapeFromInstagram` uses multiple long, hardcoded `setTimeout` delays to wait for page loads:
   - Line 2482: `await new Promise(r => setTimeout(r, 4000));` (4 seconds)
   - Line 2515: `await new Promise(r => setTimeout(r, 5000));` (5 seconds)
   - Line 2536: `await new Promise(r => setTimeout(r, 6000));` (6 seconds if Linktree/Bio Link is used)
   - Line 2564: `await new Promise(r => setTimeout(r, 4000));` (4 seconds)
   
   **Total sleep time alone is 13 to 19 seconds**, not counting page loading, DNS resolution, and script execution times. Because this total execution time consistently exceeds Chrome's message channel timeout, Chrome automatically tears down the message port before the script can finish and execute `sendResponse`, triggering the port closure error on the frontend.
3. **Service Worker Termination:** If the service worker is idle (only waiting on a promise like `setTimeout` rather than receiving extension events), Chrome will terminate the service worker thread, instantly closing all active ports.

---

## 2. Location of the Crash / Premature Closing in `background.js`

The crash or premature closing originates from several key locations in `public/chrome-extension/background.js`:

### A. The Long Delays in `handleMenuScrapeFromInstagram`
* **File Path:** `public/chrome-extension/background.js`
* **Line Numbers:** 2482, 2515, 2536, and 2564.
* **Mechanism:** As described above, these cumulative `setTimeout` calls cause the execution to exceed the browser's port timeout limit.

### B. Unprotected Tab Creation & ID Retrieval
* **File Path:** `public/chrome-extension/background.js`
* **Line Numbers:** 2478-2479
* **Code:**
  ```javascript
  2478:   const tab = await createTabWithRetry({ url: instagramUrl, active: false });
  2479:   const tabId = tab.id;
  ```
* **Issue:** These lines sit **outside** the `try...catch` block of `handleMenuScrapeFromInstagram`. If `createTabWithRetry` fails (e.g., due to an invalid URL format or missing scheme like `https://`), or if it returns `undefined`, it will throw an exception or a `TypeError: Cannot read properties of undefined (reading 'id')` outside the main handler's try block, crashing the execution before the script enters the secure try-catch scope.

### C. Protocol Incompatibility & Silent Failures during Redirects
* **File Path:** `public/chrome-extension/background.js`
* **Line Number:** 2514
* **Code:**
  ```javascript
  2514:     await updateTabWithRetry(tabId, { url: externalUrl });
  ```
* **Issue:** If `externalUrl` redirects to a non-HTTP/HTTPS protocol (such as a WhatsApp link `whatsapp://send` or similar app protocol), `chrome.tabs.update` will throw a synchronous validation exception. Furthermore, trying to run `chrome.scripting.executeScript` on such pages will throw an unhandled exception since extensions cannot inject scripts into non-web schemes.

### D. Synchronous Type Errors in Error Handler Cleanup
* **File Path:** `public/chrome-extension/background.js`
* **Line Number:** 2595
* **Code:**
  ```javascript
  2595:     try { await removeTabWithRetry(tabId); } catch(e){}
  ```
* **Issue:** If `tabId` is undefined or null (because tab creation failed), passing it to `removeTabWithRetry` will trigger `chrome.tabs.remove(undefined)`. In Chrome, calling tab operations with invalid parameter types can throw synchronous validation errors, which can crash the worker thread if not properly caught at the API level.

---

## 3. Instagram -> Linktree -> Anota AI Menu Extraction Flow

### Flow Structure
The extraction flow is structured as a step-by-step linear automation pipeline:
1. **Instagram Initialization (Steps 1-3):** Opens the Instagram profile in a background tab and waits 4 seconds.
2. **Bio Link Extraction (Step 4):** Runs `chrome.scripting.executeScript` to query anchor tags `a[target="_blank"]` and `a[rel~="nofollow"]` for bio-link domains (`linktr.ee`, `bio.link`, etc.).
3. **Bio Link Navigation (Steps 5-7):** Decodes the URL if wrapped in Instagram's redirect service (`l.instagram.com/?u=`), navigates the tab to it, and waits 5 seconds.
4. **Linktree Link Search (Step 8):** Checks if the URL matches Linktree. If yes, it runs a script to find a menu-related button (keywords like `cardapio`, `menu`, `ifood`), navigates the tab to that menu link, and waits 6 seconds.
5. **Menu Page Interception (Steps 9-10):** Runs an auto-clicker script to trigger click events on elements matching categories, accordions, and cursor-pointers, then waits 4 seconds.
6. **Anota AI Direct API Extraction (Steps 11-12):** Checks if the page is Anota AI. If so, it extracts the merchant slug, fetches the structured menu JSON from the Anota AI API, parses it, and closes the tab.
7. **HTML Fallback (Step 13):** If not Anota AI or if API extraction fails, it extracts the page's inner body text (`document.body.innerText`) and returns it to the server.

### Ensuring Reliable Execution Without Falling Back
To make the extraction flow completely reliable and prevent the browser from closing the port, we must apply the following structural changes:
1. **Use Persistent Connections (Ports):**
   Instead of using one-shot `sendMessage` requests that timeout, use `chrome.runtime.connect` to open a persistent message port. Keep-alive messages (heartbeats) can be sent between the frontend and the service worker to prevent Chrome from suspending the worker.
2. **Implement Event-Driven Tab Loading:**
   Replace the hardcoded `setTimeout` calls with a robust tab status listener. The service worker should monitor `chrome.tabs.onUpdated` and resolve only when the tab status is `'complete'`.
3. **Sanitize Redirects and Protocol Links:**
   Before updating a tab, check if the URL protocol is `http:` or `https:`. If the link points to a deep link (like WhatsApp), do not navigate to it programmatically or inject scripts, but extract the relevant information (like telephone number) directly.
4. **Improve Anota AI Slug Detection:**
   Wait for the Anota AI app container (e.g. `#anota-app` or `.anota-app`) to mount before checking for the slug, and clean up the slug of any search query parameters or trailing slashes.

---

## 4. Tabs API "Tabs cannot be edited right now" Error Handling

### Why It Happens
Chrome throws the error `"Tabs cannot be edited right now"` when the user is actively interacting with the tab bar (e.g., dragging a tab to reorder it or splitting it into a new window). Chrome locks the tab model to maintain consistency, causing mutations (`create`, `update`, `remove`) to fail.

### Current Implementation & Limitations
The extension currently uses retry helpers that catch the error by searching for the exact substring `"Tabs cannot be edited right now"`.
* **Limitations:**
  - Case-sensitivity and strict string matching: The exact error string can vary across Chrome versions or Chromium-based browsers (Edge, Opera, Brave).
  - Fixed retry wait times: It sleeps for 1000ms per attempt. If a user is dragging a tab for more than 5 seconds, it will timeout and fail.
  - Silent failures or TypeError when passing invalid tab IDs during retries.

### Resilience Recommendations
To make tab operations completely bulletproof:
1. **Case-Insensitive & Broader Substring Checks:**
   Change the error check to:
   ```javascript
   const isTabError = e.message && (
     e.message.toLowerCase().includes('cannot be edited') ||
     e.message.toLowerCase().includes('dragging') ||
     e.message.toLowerCase().includes('locked')
   );
   ```
2. **Implement Exponential Backoff with Jitter:**
   Instead of a fixed 1-second delay, use a retry delay that starts small (e.g., 200ms) and grows exponentially up to a maximum limit (e.g., 10 attempts, covering a window of up to 10 seconds of user interaction).
3. **Verify Tab Existence:**
   Before running updates or removals, call `chrome.tabs.get(tabId)` inside a try-catch block. If the tab has already been deleted or closed by the user, immediately resolve the operation and clean up the promise chain rather than retrying.
4. **Ensure Strict Parameter Validation:**
   Ensure `tabId` is checked to be a valid number before calling any Chrome Tabs APIs, preventing synchronous TypeError exceptions from crashing the thread.
5. **Listen to `chrome.tabs.onRemoved`:**
   During the scraping flow, register an event listener for `chrome.tabs.onRemoved`. If the scraped tab is closed by the user, trigger an immediate promise rejection to cancel any pending timeouts or scripts.
