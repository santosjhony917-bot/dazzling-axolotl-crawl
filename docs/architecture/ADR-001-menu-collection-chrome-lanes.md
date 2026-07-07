# ADR-001: Chrome Lanes for Menu Collection

## Status

Accepted

## Context

The project needs to collect restaurant menus quickly and reliably from Google, Instagram and menu platforms that often block headless/browserless access. The user must manually log in to Google and Instagram. Multiple Codex chats may work in parallel.

The existing Chrome extension captures visible evidence and executes browser actions. However, a single Chrome window cannot safely serve multiple workers at once because visible-tab screenshots, active tab changes and command/result queues can cross-contaminate work.

## Decision

Use one Chrome profile per worker lane.

Each lane has:

- independent user-data-dir;
- independent CDP port;
- extension loaded from `public/chrome-extension`;
- lane id persisted in extension storage;
- lane-scoped command queue and result queue;
- lane-scoped snapshot directory;
- manual Google and Instagram login readiness check.

## Rationale

1. It preserves access to sites that require the user's real logged-in browser.
2. It prevents one chat from capturing another chat's tab.
3. It lets the orchestrator assign exclusive restaurant batches.
4. It scales on the local machine before introducing heavier infrastructure.
5. It keeps visual evidence compatible with the existing extension requirement.

## Trade-offs

- More memory and CPU usage per lane.
- The user must log in once per profile.
- Chrome extension service workers may sleep, so scripts must wake/reload the extension.
- True national scale still needs persistent leases and worker telemetry in Supabase.

## Consequences

Positive:

- Parallel collection is possible without tab/result collisions.
- Failures are isolated by lane.
- Workers can be audited through per-lane manifests and evidence.

Negative:

- Too many lanes can overload the desktop.
- Manual login is still required.

Mitigation:

- Start with 2-3 lanes and only increase after measuring throughput.
- Use `scratch/menu-collection-orchestrator.mjs` to lease IDs and avoid duplicate work.
- Use `scratch/wait-lane-logins.cjs` before every worker run.
- Use `scratch/set-extension-lane.cjs` to wake/reload the extension and set the lane id.

## Revisit Trigger

Revisit when:

- one city consistently exceeds local machine capacity;
- multiple operators need to work from different machines;
- leases must survive restarts across machines;
- the menu source mix changes enough that a queue-level scheduler should learn platform ROI automatically.
