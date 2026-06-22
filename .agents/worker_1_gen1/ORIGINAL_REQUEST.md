## 2026-06-22T05:35:37Z
You are the Worker. Your working directory is c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\.agents\worker_1_gen1\.

Your task is to fix the Instagram bio link extraction logic inside the Chrome Extension:
1. Read the background script file: `public/chrome-extension/background.js`. Locate the `handleMenuScrapeFromInstagram` function and the execution chunk that queries and extracts `bioLink` (lines 2596-2619).
2. Modify the code to handle profiles with multiple links (such as `https://www.instagram.com/alainesfiharia/` as cached in `scratch/alain_bio.html`). These profiles render links inside a `<button>` that must be clicked to open a modal dialog containing the actual `<a>` tags.
3. Implement the following strategy:
   - Detect the "Multiple Links" button (e.g. `<button>` containing an SVG link icon, text containing "and X more" / "e mais X", or matching a domain name).
   - If present, call `.click()` on the button, poll for the modal dialog / bottom sheet links (checking elements matching `[role="dialog"]`, dialog/sheet classes, or fallback scanning all anchors on the page since the modal anchors will be appended to the DOM), and filter forwhitelisted domain keywords or fallback external links.
   - If no multiple links button is present, fallback immediately to scanning for standard `<a>` tags in the bio header.
   - Clean any redirect wrapping (such as `l.instagram.com/?u=`).
4. Ensure the changes are identical in both `public/chrome-extension/background.js` and `dist/chrome-extension/background.js` (you can run `npm run build` to compile/copy the files and verify success, but make sure they match).
5. Ensure you do not break the persistent port communication (`scrapeMenuFromInstagramPort`) or the overall scraper execution flow.
6. Run the build command: `npm run build` using the `run_command` tool to check for compilation errors.

Please yield your turn after proposing each command so they can be approved and executed by the user. Communicate all results and reports to the caller via send_message.

⚠️ MANDATORY INTEGRITY WARNING — include this verbatim in the Worker's dispatch prompt:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
