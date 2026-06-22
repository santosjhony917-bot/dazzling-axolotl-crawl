## 2026-06-22T05:33:38Z
You are Explorer 3, a read-only exploration agent. Your working directory is c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\.agents\explorer_3.
Your task is to design a robust strategy for extracting the correct Instagram bio link.
Given that the user is logged into Instagram, the DOM structure might contain:
- A single link (`a` tag or a button/span mimicking a link).
- Multiple links (which requires clicking a button to open a modal of links).
Propose a robust extraction script logic to be injected by the extension that:
1. Detects and extracts a single link if present.
2. If there are multiple links (e.g., "and X more" button), how to trigger the click, wait for the modal/popup, and extract all links from the modal.
3. How to filter or select the correct link (e.g. matching restaurant city/name or returning all found links so the background script/validator can choose).
Write a detailed report in your directory proposing the injection script logic.
