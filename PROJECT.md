# Project: FilterFood Design System Remediation

## Architecture
FilterFood is a React application built with TypeScript, Tailwind CSS, and Vite. The codebase has three main visual areas:
- Client Area (Customer)
- Restaurant Area (Merchant Dashboard)
- Admin Panel (Management Dashboard)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Audit | Scan all files in `src/` for design deviations | None | PLANNED |
| 2 | Remediation | Fix deviations (fonts, colors, corners, shadows) | M1 | PLANNED |
| 3 | E2E & Build Verification | Run builds and verify full system compilation | M2 | PLANNED |

## Interface Contracts
- Colors: Fire-Red `#EF2A39` / HSL `357 86% 57%`
- Fonts: `Poppins` for standard typography; `Lobster` for logos
- Rounded: `rounded-[20px]` / `rounded-xl` for standard cards
- Shadows: Soft UI styles (`shadow-soft` or `shadow-float`), max 12% opacity for red, max 6% for gray/black shadows.

## Code Layout
- `src/components/`: Shared UI components
- `src/pages/`: Page containers (client, restaurant, admin)
- `src/styles/`: Global stylesheets and utility variables
- `src/globals.css`: Global styles, variable definitions
