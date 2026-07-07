# Restaurant Hub Visual Rollout

Objective: apply the `/restaurant-area-hub` visual identity across the app without changing product behavior.

Reference language:
- Desktop outer background: cool slate `#f1f5f9`.
- App shell: centered mobile column, `max-width: 448px`, white/light background, subtle side border.
- Surfaces: white cards, `24px` radius, `border-slate-100`, soft shadow.
- Accent: FilterFood orange `#df4b1c`.
- Text: compact Poppins, primary `#3C2F2F`, muted slate gray.

Consensus tokens:
- `/restaurant-area-hub` is the visual source of truth for the app shell and restaurant entry surfaces.
- Core CSS tokens live in `src/globals.css` as `--filterfood-*`, with existing aliases such as `--primary-hex`, `--highlight-hex`, `--soft-shadow`, and `--float-shadow` preserved for compatibility.
- Tailwind exposes matching future-facing utilities under `filterfood.*` colors and semantic shadows: `shadow-soft`, `shadow-float`, `shadow-hover`, `shadow-focus`, `shadow-nav`, and `shadow-modal`.
- Card surfaces use `24px` radius; compact icon tiles use `16px` radius. Avoid introducing new global accent colors or gradients into the base identity.
- Focus and hover states should use visible orange rings/shadows while keeping behavior unchanged.

Implementation slices:
- Global shell/tokens: `src/globals.css`, `tailwind.config.ts`, `src/layouts/SharedLayoutWrapper.tsx`.
- Shared chrome: `src/components/Header.tsx`, bottom navigation components.
- Public restaurant entry flow: hub, login, signup, claim, forgot password, auth.
- Restaurant owner screens: profile/menu/gallery/metrics pages through `RestaurantAreaPageLayout`.

Coordination notes:
- Component changes should keep semantic navigation, visible focus states, and aria labels for icon-only actions.
- Engineering may introduce shared `PhoneShell` or `FloatingBottomNav` wrappers later, but this token pass keeps current behavior and class names intact.
- QA should recheck the hub modal/cards first, then icon-only controls, focus visibility, and contrast.

Verification:
- Build the Vite app.
- Preview core routes visually: `/restaurant-area-hub`, `/restaurant-area/login`, `/restaurant-area/signup`, `/home`, `/restaurant-area/profile-menu`.
