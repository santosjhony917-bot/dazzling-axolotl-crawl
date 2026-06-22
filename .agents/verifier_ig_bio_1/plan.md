# Verification Plan - Instagram Bio Link Logic

This plan outlines the steps to build the Chrome extension and verify the Instagram bio extraction logic using integration tests.

## Steps

1. **Verify Workspace Environment**: Check directories and files (done).
2. **Build the Extension**: Run `npm run build` to compile the TypeScript/Vite extension to `dist/chrome-extension`.
3. **Execute Integration Test**: Run `node scratch/test_ext_communication.cjs` using Puppeteer to simulate extension communication and bio extraction.
4. **Inspect Output**: Check that the test outputs extracted candidate URLs and details successfully without port closed errors.
5. **Report Findings**: Write the results to `handoff.md` and message the orchestrator.
