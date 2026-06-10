# GrubGo Design System Compliance Analysis - Client Area

This analysis reports all design system deviations found in the Client Area files.

## Summary of Findings

We scanned the specified Client Area files and identified several deviations from the official **GrubGo Design System**:
- **Shadows**: Multiple files use standard Tailwind shadows (`shadow-sm`, `shadow-md`), custom black shadows with opacity > 6% (e.g., `rgba(0,0,0,0.1)`, `rgba(0,0,0,0.08)`, `rgba(0,0,0,0.15)`), or colored shadows with opacity > 12%.
- **Fonts**: The outdated brand name **FilterFood** is still present in the logo/headings (e.g. `Welcome.tsx`, `Home.tsx`), although the Lobster font itself is compliant for logos.
- **Rounded Corners**: Some card containers use `rounded-lg` (16px) or `rounded-3xl` (24px) instead of the official card standard `rounded-xl` or `rounded-[20px]`.
- **Colors**: Non-compliant orange/amber colors and gradients (e.g. `orange-500`, `orange-400`, `amber-500`, `#FF7E40`) and standard Tailwind red classes (`red-500`, `red-50`, `bg-red-500/10`) are used instead of official **Fire-Red** (`#EF2A39` / HSL `357 86% 57%`).

---

## Detailed Deviations & Recommended Replacements

### 1. Shadows
| File Path | Line | Target Content | Deviation | Recommended Replacement |
|---|---|---|---|---|
| `src/pages/ComboFinderPage.tsx` | 256 | `shadow-[0_4px_10px_rgba(0,0,0,0.1)]` | Custom black shadow with 10% opacity (> 6%). | `shadow-soft` or `shadow-[0_4px_10px_rgba(0,0,0,0.06)]` |
| `src/pages/ComboFinderPage.tsx` | 263 | `shadow-sm` | Standard Tailwind shadow class. | `shadow-none` (default flat look) |
| `src/pages/ComboFinderPage.tsx` | 298 | `shadow-sm hover:shadow-md` | Standard Tailwind shadow classes. | `shadow-none hover:shadow-soft` |
| `src/pages/ComboFinderPage.tsx` | 377 | `shadow-[0_10px_35px_rgba(0,0,0,0.08)]` | Custom black shadow with 8% opacity (> 6%). | `shadow-soft` or `shadow-[0_10px_35px_rgba(0,0,0,0.06)]` |
| `src/pages/Home.tsx` | 93 | `shadow-sm` | Standard Tailwind shadow class. | `shadow-none` |
| `src/pages/Home.tsx` | 112 | `shadow-[0_12px_24px_rgba(239,42,57,0.22)]` | Red shadow with 22% opacity (> 12% opacity limit). | `shadow-[0_12px_24px_rgba(239,42,57,0.12)]` |
| `src/pages/Home.tsx` | 149 | `shadow-sm` | Standard Tailwind shadow class. | `shadow-none` |
| `src/pages/LandingPage.tsx` | 78 | `hover: shadow-orange-500/10` | Uses non-compliant orange color for shadow. | `hover:shadow-primary/10` or `hover:shadow-soft` |
| `src/pages/LandingPage.tsx` | 195 | `hover:shadow-orange-500/35` | Orange shadow with 35% opacity (> 12%). | `hover:shadow-soft` |
| `src/pages/LandingPage.tsx` | 544 | `hover:shadow-orange-500/35` | Orange shadow with 35% opacity (> 12%). | `hover:shadow-soft` |
| `src/pages/Welcome.tsx` | 38 | `drop-shadow-md` | Standard drop shadow class. | `drop-shadow-none` or remove |
| `src/pages/Welcome.tsx` | 67 | `shadow-[0px_4px_19px_rgba(0,0,0,0.15)]` | Custom black shadow with 15% opacity (> 6%). | `shadow-[0px_4px_19px_rgba(0,0,0,0.06)]` or `shadow-soft` |

### 2. Fonts & Branding Text
| File Path | Line | Target Content | Deviation | Recommended Replacement |
|---|---|---|---|---|
| `src/pages/Welcome.tsx` | 38-40 | `FilterFood` (inside Lobster font tag) | Outdated brand name text. | `GrubGo` |
| `src/pages/Welcome.tsx` | 85 | `© 2026 FilterFood. ...` | Outdated brand name text in copyright footer. | `© 2026 GrubGo. ...` |
| `src/pages/Home.tsx` | 84-86 | `FilterFood` (inside Lobster font tag) | Outdated brand name text. | `GrubGo` |

### 3. Rounded Corners
| File Path | Line | Target Content | Deviation | Recommended Replacement |
|---|---|---|---|---|
| `src/pages/Profile/ProfilePage.tsx` | 17 | `rounded-lg` (on `SettingsCard` link card) | Uses `rounded-lg` (16px) instead of card standard. | `rounded-xl` or `rounded-[20px]` |
| `src/pages/Profile/ProfilePage.tsx` | 152 | `rounded-lg` (on account creation card container) | Uses `rounded-lg` (16px) instead of card standard. | `rounded-xl` or `rounded-[20px]` |
| `src/pages/FreelancerPortal.tsx` | 2902 | `rounded-lg` (on card items) | Card element uses `rounded-lg` (16px). | `rounded-xl` or `rounded-[20px]` |
| `src/pages/FreelancerPortal.tsx` | 3296 | `rounded-lg` (on card container) | Card section uses `rounded-lg` (16px). | `rounded-xl` or `rounded-[20px]` |
| `src/pages/ComboFinderPage.tsx` | 403 | `rounded-3xl` (on chat modal content) | Uses `rounded-3xl` (24px) instead of card standard. | `rounded-xl` or `rounded-2xl` |

### 4. Colors (Red/Orange Deviations)
| File Path | Line | Target Content | Deviation | Recommended Replacement |
|---|---|---|---|---|
| `src/pages/Home.tsx` | 112 | `hover:bg-[#D62230]` | Non-compliant hardcoded dark red hover. | `hover:bg-primary/90` or `hover:bg-highlight-hover` |
| `src/pages/Home.tsx` | 123 | `from-[#FF7E40] to-[#EF2A39]` | Uses non-compliant orange `#FF7E40` in gradient. | `from-magic-feature to-primary` or `bg-primary` |
| `src/pages/Home.tsx` | 168 | `bg-red-50 text-[#EF2A39]` | Standard Tailwind `bg-red-50` class. | `bg-primary/10 text-[#EF2A39]` |
| `src/pages/Home.tsx` | 183 | `bg-red-50 text-[#EF2A39]` | Standard Tailwind `bg-red-50` class. | `bg-primary/10 text-[#EF2A39]` |
| `src/pages/ComboFinderPage.tsx` | 390 | `hover:bg-[#D62230]` | Non-compliant hardcoded dark red hover. | `hover:bg-primary/90` or `hover:bg-highlight-hover` |
| `src/pages/Favorites.tsx` | 169 | `hover:bg-red-50/50` | Standard Tailwind `red-50` hover background class. | `hover:bg-primary/10` |
| `src/pages/ClientProfilePage.tsx` | 136-137 | `bg-red-500/10`, `text-red-500`, `fill-red-500/10` | Standard Tailwind `red-500` classes instead of Fire-Red / primary theme. | `bg-primary/10`, `text-primary`, `fill-primary/10` |
| `src/pages/FriendsPage.tsx` | 190 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/FriendsPage.tsx` | 222 | `bg-red-500` | Standard Tailwind `red-500` class. | `bg-primary` |
| `src/pages/FriendsPage.tsx` | 277 | `hover:text-red-500 hover:bg-red-50/50` | Standard Tailwind red classes. | `hover:text-primary hover:bg-primary/10` |
| `src/pages/FriendsPage.tsx` | 297 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/FriendsPage.tsx` | 350 | `hover:text-red-500 hover:bg-red-50/50` | Standard Tailwind red classes. | `hover:text-primary hover:bg-primary/10` |
| `src/pages/FriendsPage.tsx` | 446 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/HappyHourHub.tsx` | 199 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/HappyHourRoom.tsx` | 338 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/HappyHourRoom.tsx` | 414 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/HappyHourRoom.tsx` | 465 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/HappyHourRoom.tsx` | 505 | `ring-orange-500/30` | Standard Tailwind orange ring class. | `ring-primary/30` |
| `src/pages/HappyHourRoom.tsx` | 559 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/LandingPage.tsx` | 78 | `from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600` | Non-standard orange/amber gradients. | `from-primary to-magic-feature hover:from-primary/95 hover:to-magic-feature/95` |
| `src/pages/LandingPage.tsx` | 138 | `from-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary to-magic-feature` |
| `src/pages/LandingPage.tsx` | 162 | `text-orange-400` | Uses standard Tailwind orange-400. | `text-primary` |
| `src/pages/LandingPage.tsx` | 174 | `from-orange-400 via-orange-500 to-amber-500` | Non-standard orange/amber gradient. | `from-primary via-primary/90 to-magic-feature` |
| `src/pages/LandingPage.tsx` | 195 | `from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600` | Non-standard orange/amber gradients. | `from-primary to-magic-feature` |
| `src/pages/LandingPage.tsx` | 251-252 | `text-orange-400` | Uses standard Tailwind orange-400. | `text-primary` |
| `src/pages/LandingPage.tsx` | 283 | `text-orange-300` | Uses standard Tailwind orange-300. | `text-primary` |
| `src/pages/LandingPage.tsx` | 289 | `text-orange-300` | Uses standard Tailwind orange-300. | `text-primary` |
| `src/pages/LandingPage.tsx` | 308 | `bg-orange-50 text-orange-600` | Standard Tailwind orange classes. | `bg-primary/10 text-primary` |
| `src/pages/LandingPage.tsx` | 350 | `text-orange-400` | Uses standard Tailwind orange-400. | `text-primary` |
| `src/pages/LandingPage.tsx` | 408 | `text-orange-400` | Uses standard Tailwind orange-400. | `text-primary` |
| `src/pages/LandingPage.tsx` | 439 | `hover:bg-orange-600` | Uses standard Tailwind orange-600. | `hover:bg-primary/90` |
| `src/pages/LandingPage.tsx` | 465 | `text-orange-400` | Uses standard Tailwind orange-400. | `text-primary` |
| `src/pages/LandingPage.tsx` | 471 | `text-orange-400` | Uses standard Tailwind orange-400. | `text-primary` |
| `src/pages/LandingPage.tsx` | 544 | `from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600` | Non-standard orange/amber gradients. | `from-primary to-magic-feature` |
| `src/pages/FreelancerPortal.tsx` | *Multiple* | `bg-orange-100`, `text-orange-400`, `bg-red-500`, etc. | Numerous standard red and orange classes. | Apply theme color aliases such as `primary` and `highlight`. |
