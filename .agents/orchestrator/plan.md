# Execution Plan - Chrome Extension Communication & Scraper Fixes

This plan details the phased approach to fixing the Chrome Extension port-closed error, validating menu extraction, ensuring resiliency to Tabs API blocking, and preventing fallbacks.

## Phase 1: Exploration and Root Cause Analysis
- **Objective**: Explore the extension codebase and background scripts. Locate the source of the crash/port-closed issue when `scrapeMenuFromInstagram` is sent. Investigate Instagram -> Linktree -> Anota AI navigation flow and how the Tabs API error 'Tabs cannot be edited right now' is handled.
- **Verification**: Explorer handoff report with detailed code locations, root cause explanation, and proposed fix strategies.
- **Agent Assigned**: `teamwork_preview_explorer`.

## Phase 2: Implementation of Fixes
- **Objective**: Apply changes to the extension service worker (`public/chrome-extension/background.js`) to:
  1. Fix the message port closure error.
  2. Implement robust Tabs API retry and recovery mechanics.
  3. Validate autonomous menu extraction (Instagram -> Linktree -> Anota AI) without falling back.
- **Verification**: Clean diff of modified files; code compiling and building successfully (`npm run build`).
- **Agent Assigned**: `teamwork_preview_worker`.

## Phase 3: Review and Challenger Validation
- **Objective**: Run automated Puppeteer tests and verify the extension behaves correctly without throwing port closed errors or triggering local Puppeteer API fallbacks.
- **Verification**: Execute `scratch/test_ext_communication.cjs` and verify it logs successful ping and menu scrape results. Review the code quality and robustness.
- **Agents Assigned**: `teamwork_preview_reviewer` (independent code review) and `teamwork_preview_challenger` (executing and validating tests).

## Phase 4: Forensic Integrity Audit
- **Objective**: Perform forensic audit checks on the implementation to verify no cheating (no hardcoding, fake responses, or bypassing checks).
- **Verification**: CLEAN audit verdict from the Forensic Auditor.
- **Agent Assigned**: `teamwork_preview_auditor`.
