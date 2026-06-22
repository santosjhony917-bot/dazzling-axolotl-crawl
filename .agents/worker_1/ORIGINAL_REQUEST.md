## 2026-06-22T04:58:34Z

Please perform the following implementation steps to fix the extension port closed error, improve navigation reliability, ensure Tabs API resiliency, and avoid fallbacks:

1. **Tabs API Resilience**: In `public/chrome-extension/background.js`, update the retry helpers `createTabWithRetry`, `removeTabWithRetry`, and `updateTabWithRetry` to:
   - Use case-insensitive and broad substring matching to detect tab locks:
     ```javascript
     const isTabLockError = e => e && e.message && (
       e.message.toLowerCase().includes('cannot be edited') ||
       e.message.toLowerCase().includes('locked') ||
       e.message.toLowerCase().includes('dragging')
     );
     ```
   - Implement exponential backoff (starting at 200ms, multiplying by 1.5, up to 10 retries).
   - Ensure parameter types are verified (e.g. `tabId` must be a number) and check if the tab exists using `chrome.tabs.get` in remove/update wrappers to prevent synchronous/early API exceptions.

2. **Event-Driven Loading**: Implement a helper `waitForTabToComplete(tabId, timeoutMs)` in `background.js` using `chrome.tabs.onUpdated` matching status `'complete'`. Replace the hardcoded `setTimeout` delays (e.g. 4s, 5s, 6s, 4s) inside `handleMenuScrapeFromInstagram` with calls to `waitForTabToComplete(tabId)` followed by a brief 1-second delay for client-side dynamic rendering.

3. **Message Port Timeout Fix**:
   - In `public/chrome-extension/background.js`, add support for persistent connections using `chrome.runtime.onConnectExternal.addListener` to handle the `scrapeMenuFromInstagram` action. Ensure any exceptions within `handleMenuScrapeFromInstagram` are fully caught.
   - In `src/pages/admin/expansion/components/CityValidation.tsx` and `scratch/test_ext_communication.cjs`, change the communication interface for `scrapeMenuFromInstagram` from `chrome.runtime.sendMessage` to persistent ports via `chrome.runtime.connect`.
   - Keep the `ping` and other lightweight actions on `sendMessage` / `onMessageExternal` since they are instantaneous and do trigger timeouts.

4. **Compile and Verify**:
   - Run the production build command (`npm run build`) to ensure there are no compilation/TypeScript errors and the public chrome-extension files are copied to `dist/chrome-extension`.
   - Run the test script `node scratch/test_ext_communication.cjs` and verify both the ping and scrapeMenuFromInstagram actions succeed without throwing port closed errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
