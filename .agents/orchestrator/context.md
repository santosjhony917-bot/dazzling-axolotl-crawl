# Environment and Design Context

## Target Project Configuration
- **Root Directory**: `c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main`
- **Source Code Directory**: `src/`
- **Build Command**: `npm run build`
- **Integrity Mode**: `development`

## Official Design System (GrubGo) Reference
- **Theme**: Soft UI
- **Primary Color (Fire-Red)**: `#EF2A39` / HSL `357 86% 57%`
- **Typography**: 
  - Standard text: `Poppins`
  - Corporate logo: `Lobster`
- **Rounded Corners (Cards)**: `rounded-[20px]` or `rounded-xl`
- **Shadows**:
  - Soft UI base: `shadow-soft` (defined as `0 10px 40px rgba(0, 0, 0, 0.06)`)
  - Soft UI float: `shadow-float` (defined as `0 15px 50px rgba(0, 0, 0, 0.08)`)
  - Custom Red HSL shadow: max 12% opacity
  - Custom Black/Gray shadow: max 6% opacity
  - Floating image elements shadow: sutil/diffuse (max 8% black opacity)
- **Deviations to check for**:
  - Heavy or hard black shadows
  - Non-Poppins font for standard texts; non-Lobster font for logos
  - Orange/Red colors other than `#EF2A39` / HSL `357 86% 57%` (especially old FilterFood orange `#E47948`)

## Discovered Deviations

### Client Area (Identified by Explorer 1)
1. **Shadows**:
   - `src/pages/ComboFinderPage.tsx` lines 256, 377 (Custom black shadow with 10% and 8% opacity > 6%).
   - `src/pages/ComboFinderPage.tsx` lines 263, 298 (Tailwind standard shadows `shadow-sm`, `shadow-md`).
   - `src/pages/Home.tsx` lines 93, 149 (Tailwind standard shadows `shadow-sm`).
   - `src/pages/Home.tsx` line 112 (Red shadow with 22% opacity > 12%).
   - `src/pages/LandingPage.tsx` lines 78, 195, 544 (Tailwind standard or orange shadows).
   - `src/pages/Welcome.tsx` line 38 (`drop-shadow-md`), line 67 (Custom black shadow with 15% opacity).
2. **Typography / Branding Text**:
   - `src/pages/Welcome.tsx` lines 38-40, 85 (uses "FilterFood" instead of "GrubGo").
   - `src/pages/Home.tsx` lines 84-86 (uses "FilterFood" instead of "GrubGo").
3. **Rounded Corners**:
   - `src/pages/Profile/ProfilePage.tsx` lines 17, 152 (`rounded-lg` on card containers).
   - `src/pages/FreelancerPortal.tsx` lines 2902, 3296 (`rounded-lg` on cards).
   - `src/pages/ComboFinderPage.tsx` line 403 (`rounded-3xl` on card).
4. **Colors (Orange/Red Gradients)**:
   - `src/pages/Home.tsx` line 112 (`hover:bg-[#D62230]`), line 123 (`from-[#FF7E40] to-[#EF2A39]`), lines 168, 183 (`bg-red-50`).
   - `src/pages/ComboFinderPage.tsx` line 390 (`hover:bg-[#D62230]`).
   - `src/pages/Favorites.tsx` line 169 (`hover:bg-red-50/50`).
   - `src/pages/ClientProfilePage.tsx` lines 136-137 (`bg-red-500/10`, `text-red-500`).
   - `src/pages/FriendsPage.tsx` lines 190, 297, 446 (`from-orange-500 to-amber-500`), lines 222, 277, 350 (`red-500`, `red-50`).
   - `src/pages/HappyHourHub.tsx` line 199 (`from-orange-500 to-amber-500`).
   - `src/pages/HappyHourRoom.tsx` lines 338, 414, 465, 505, 559 (`from-orange-500 to-amber-500`, `ring-orange-500/30`).
   - `src/pages/LandingPage.tsx` lines 78, 138, 162, 174, 195, 251-252, 283, 289, 308, 350, 408, 439, 465, 471, 544 (Tailwind orange/amber gradients and texts).
   - `src/pages/FreelancerPortal.tsx` (multiple instances of `bg-orange-100`, `text-orange-400`, `bg-red-500`, etc.).

### Restaurant & Admin Area and Shared Components (Identified by Grep Scan)
1. **Colors (Orange/Amber)**:
   - `src/components/public/PremiumProfileLayout.tsx` lines 287, 306, 325 (`from-orange-500 to-amber-500` border bottom).
   - `src/components/public/RestaurantMainInfoCard.tsx` line 57 (`from-amber-500 via-orange-500 to-red-500`), line 88 (`from-orange-500 to-amber-500`).
   - `src/components/restaurant/dashboard/ActionCard.tsx` line 29 (`from-orange-500/15 via-orange-500/10 to-amber-500/5`).
   - `src/pages/Upgrade.tsx` line 46 (`from-orange-500 to-amber-500`), line 50 (`fill-orange-500/50`), line 247 (`from-orange-500 to-amber-500`).
   - `src/components/ImageUploadButton.tsx` line 100 (`hover:bg-orange-600`).
   - `src/components/Logo.tsx` line 5 (`bg-orange-100`).
   - `src/components/restaurant/InfoCardItem.tsx` lines 20-21 (`text-amber-500`).
   - `src/components/restaurant/MenuSection.tsx` line 48 (`from-yellow-400 to-amber-500`).
   - `src/components/restaurant/profile/MainProfileCard.tsx` line 32 (`border-amber-500/30 border-l-amber-500 shadow-[0_12px_40px_rgba(245,158,11,0.12)]`), line 47 (`ring-amber-500/40`), line 64 (`from-amber-500 to-yellow-400`), line 77 (`text-amber-400`), line 87 (`from-amber-500 to-yellow-400`).
2. **Rounded Corners (Card Deviations)**:
   - `src/pages/restaurant/RestaurantSettingsPage.tsx` line 17 (`rounded-lg` on settings option Link card container).
   - `src/components/restaurant/GalleryManagement.tsx` lines 247, 297 (`rounded-lg` on card sections).
   - `src/components/restaurant/OrderChannels.tsx` lines 9, 13, 17 (`rounded-lg` on option cards).
   - `src/components/restaurant/PublicMenuItemCard.tsx` line 18 (`rounded-lg` on menu item cards).

