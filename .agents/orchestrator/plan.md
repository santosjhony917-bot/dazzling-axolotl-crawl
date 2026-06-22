# Execution Plan - Instagram Bio Link Extraction Fix

This plan details the phased approach to fixing the Instagram bio link extraction logic inside the Chrome Extension (`background.js`) to support updated Instagram DOM structures.

## Phase 1: Exploration and DOM Analysis
- **Objective**: Explore the current DOM selectors and regex pattern matching used in the extension background script to extract links from Instagram bio page. Analyze the DOM of a logged-in Instagram profile page (e.g., `https://www.instagram.com/alainesfiharia/`) to identify where the bio link is rendered (including obfuscated links, spans mimicking click events, or classes such as `x1i10hfl`).
- **Verification**: Explorer handoff report with exact selector suggestions and DOM analysis.
- **Agent Assigned**: `teamwork_preview_explorer`.

## Phase 2: Implementation of Fixes
- **Objective**: Apply changes to the extension service worker (`public/chrome-extension/background.js` and `dist/chrome-extension/background.js`) to:
  1. Correctly scan and extract the Linktree/Anota AI menu link from the Instagram bio page using updated selectors/text scans.
  2. Maintain stability (including persistent ports and the 15-retries polling loop).
- **Verification**: Compilation check via build (`npm run build`).
- **Agent Assigned**: `teamwork_preview_worker`.

## Phase 3: Review and Challenger Validation
- **Objective**: Independently review the modified extraction code and run verification tests using Puppeteer (simulating a logged-in session or fetching the target Instagram page) to confirm the correct bio URL is successfully extracted and no error is returned.
- **Verification**: Test script execution prints the correct URL and completes with zero errors.
- **Agents Assigned**: `teamwork_preview_reviewer` (code review) and `teamwork_preview_challenger` (executing and validating tests).

## Phase 4: Forensic Integrity Audit
- **Objective**: Perform forensic audit checks on the implementation to verify no cheating (no hardcoding profile links, fake selector results, or bypassing validation).
- **Verification**: CLEAN audit verdict from the Forensic Auditor.
- **Agent Assigned**: `teamwork_preview_auditor`.
