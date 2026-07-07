# Menu Review Subagent Playbook

Use this playbook to pre-audit restaurant menu collection batches for Campina Grande.

## Scope

Subagents only pre-audit evidence. Do not write to Supabase, do not import menus, and do not delete screenshots. Codex keeps final approval.

Primary QA is structural: inspect the saved database/menu structure first. Screenshots are no longer mandatory for menu approval. Use visual evidence only for gallery quality, ambiguous source identity, or a suspected structure mismatch that the database cannot explain.

Allowed inputs:

- `summary.json`
- `target-queue.json`
- `review-queue.json`
- restaurant `menu-evidence.json`
- `dry-run.json`
- structural audit outputs from `scratch/restaurant-ready-structural-auditor.mjs`
- extension screenshot paths referenced by those JSON files, when available

## Decision Tiers

### Green

Use green only when all are true:

- Database structural audit has no red findings.
- `dryRun.success=true`.
- `dryRun.audit.approved=true`.
- `dryRun.audit.issues=[]`.
- `confidence >= 0.97` for Cardapio Web/Anota AI, or `>= 0.95` for other structured platforms.
- `pricedRatio >= 0.95`.
- `unresolvedPriceCount=0`.
- No visual block, no disabled/404/shell-only page.
- No operational options leaked as menu choices.
- No placeholder item/option, no full item price saved as pizza flavor delta, and no instruction/title saved as public add-on.

Platform hints:

- Cardapio Web is usually green when the criteria above hold and the screenshot shows item cards/prices.
- Anota AI is green only when dense: `itemCount >= 20`, `optionCount > 100`, high confidence, and approved dry-run. A viewport snapshot timeout is acceptable if the full-page extension screenshot exists and shows menu content.

### Yellow

Use yellow when the menu may be valid but needs Codex review:

- Good extraction but structural audit has non-blocking warnings.
- Good extraction but screenshots are partial/odd and source identity cannot be proven from URL/DB fields.
- Anota AI, Cardapio AI, WhatsMenu, Cardapio Digital, Accon, own sites, or platform-specific navigation is involved.
- `itemCount < 8`, `optionCount=0` for a restaurant expected to have add-ons, or prices/options look suspicious.
- Dry-run approved but screenshot is small or only partially useful.
- Possible unit/address ambiguity.

### Red

Use red when the current source should not be imported:

- iFood source.
- Visible 404, disabled store, inactive site, shell page, login wall, or selector-only page.
- No structured items.
- Direct image/PDF/asset link instead of a structured public menu.
- City/state/unit conflict.
- Dry-run failed because of missing items/prices.
- Structural audit has red findings such as missing categories/items, operational options, placeholder options, invalid address split, missing canonical hours, missing logo/cover/gallery, forbidden iFood source, or suspicious price deltas.

## Review Output

For each reviewed restaurant, return:

- `restaurantId`
- `restaurantName`
- `tier`
- `decision`: `approve_fast_review`, `needs_codex_review`, or `reject_source`
- `reason`
- `structuralEvidence`: structural audit run/path and issue codes inspected
- `screenshotEvidence`: list of screenshot paths inspected, if any
- `riskFlags`
- `importReadiness`: `ready`, `hold`, or `blocked`

Keep comments short and concrete. Mention exact visible evidence such as restaurant name, item cards, prices, or disabled-page text.

## Never Approve

- iFood menus.
- A menu whose visible page belongs to another city, unit, or restaurant.
- A dry-run that imports interface labels, category navigation, buttons, or store selector content as products.
- Any case where the source visibly conflicts with the Google Maps row.
- Any case where the saved database structure has red findings, even if a screenshot looks good.
