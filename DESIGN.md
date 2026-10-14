# Design

The visual system for the HRCRM web app. For who we design for and why, see `PRODUCT.md`. For the code rules, see `AGENTS.md`.

All of this is implemented with CSS variables in `src/index.css` and consumed through Tailwind v4 semantic utilities. **Always use tokens, never raw colors.** That is what lets every screen follow the selected theme.

## Brand palette

Taken from hrcrm.ai's stylesheet. The **HRCRM** theme (`data-theme="hrcrm"`, the default) is built from these colors.

| Name | Hex | Role |
|---|---|---|
| Lime | `#D4FA3C` | Signature accent: highlights, active nav icon, first chart color. Use dark text on it, never white. |
| Olive lime | `#8FA61B` | Lime that holds up on light surfaces: focus ring, search button |
| Emerald | `#09533D` | `--primary`: buttons, links, emphasized text |
| Deep emerald | `#064030` | Sidebar gradient end, accent text |
| Forest black | `#0B1310` | Sidebar, foreground text |
| Panel black | `#161D1A` | Sidebar hover and accent surfaces |
| Off-white | `#F7F8F6` | Page background |
| Mint green | `#10B981` | Success, second chart color |
| Teal | `#3DA9A5` | Fifth chart color |
| Slate grey | `#6A7074` | Muted text |

The signature look is **dark forest-green surfaces with lime highlights** (the sidebar and page headers). Content areas stay light.

## Color tokens

Use the Tailwind utility on the right. Don't reference hex values or palette classes (`bg-blue-600`, `text-slate-700`) in new UI.

| Token | Utility | Use for |
|---|---|---|
| `--background` / `--foreground` | `bg-background`, `text-foreground` | Page canvas and body text |
| `--card` / `--card-foreground` | `bg-card`, `text-card-foreground` | Cards, panels, inputs |
| `--popover` | `bg-popover` | Menus, popovers, dropdowns |
| `--primary` / `--primary-foreground` | `bg-primary`, `text-primary`, `text-primary-foreground` | Primary buttons, links, eyebrows, selected states |
| `--secondary` | `bg-secondary`, `text-secondary-foreground` | Secondary buttons, soft chips |
| `--accent` | `bg-accent`, `text-accent-foreground` | Hover rows, icon tiles, soft highlights |
| `--muted` | `bg-muted`, `text-muted-foreground` | Read-only fields, helper and meta text |
| `--destructive` | `bg-destructive`, `text-destructive` | Delete, reject, errors |
| `--border` / `--ring` | `border-border`, `ring-ring` | Dividers and outlines, focus rings |
| `--sidebar-*` | `bg-sidebar-primary`, `to-sidebar-secondary` | App shell, sidebar, dark page headers (gradient `from-sidebar-primary to-sidebar-secondary`) |
| `--topbtn-*` | `from-search-primary to-search-secondary` | Global search button and avatar gradients |
| `--highlight` / `--highlight-foreground` | `bg-highlight`, `text-highlight-foreground`, `bg-highlight/50` | Brand accent moments: AI badges, text markers, glows (lime in HRCRM, falls back to `--topbtn-primary` in other themes) |
| `--chart-1…5` | `fill-chart-1`, `text-chart-2` | Data series, in order |

Feature tokens (keep using them in their areas):
- `--employee-*`: blue, green, yellow, orange, red and soft variants, used for employee and status visuals
- `--leave-*`: leave and attendance surfaces, statuses, tracks

Rules:
- `--primary` appears both as text on white and behind white text, so it must pass contrast both ways. That's why lime isn't the primary color.
- Use opacity modifiers for tints (`bg-primary/10`, `border-primary/25`) instead of new colors.
- Status must never depend on color alone. Pair it with an icon or a label.

## Themes

Users pick a theme in the sidebar profile menu. The choice is stored in `localStorage` (`app-theme`) and applied as `data-theme` on `<html>` at startup (`src/main.jsx`).

| id | Name | Character |
|---|---|---|
| `hrcrm` | HRCRM | Brand: forest green + lime (**default**) |
| `default` | Default | Original navy and blue |
| `blue` | Blue | Clean blue |
| `purple` | Purple | Violet |
| `green` | Green | Fresh green |
| `red` | Red | Bold red |

Adding a theme takes two steps: add a `[data-theme="<id>"]` block in `src/index.css` and an entry in `THEMES` in `src/utils/theme.js`. Override at least background, foreground, card, primary, secondary, muted, accent, border, sidebar, and topbtn tokens.

**Dark mode:** a `.dark` token set exists in `index.css`, but nothing in the app switches it on yet. Don't build features that depend on it.

## Typography

- **Font:** Geist Variable (`@fontsource-variable/geist`), set as `--font-sans` for both body and headings. The marketing site uses Bricolage Grotesque and Plus Jakarta Sans. The app uses Geist only, so don't add those fonts.
- **Base size:** 16px (`--font-size`). Weights: 400 normal, 500 medium, 600 semibold for headings and buttons.

| Role | Classes |
|---|---|
| Display (onboarding hero) | `text-[32px] sm:text-[44px] lg:text-[52px] font-semibold leading-[1.12] tracking-[-0.045em]`, with the key phrase in `text-primary` |
| Page title | `text-2xl lg:text-3xl font-semibold tracking-tight` |
| Section title | `text-base`–`text-lg font-semibold` |
| Eyebrow | `text-[13px] font-semibold text-primary`, often with a lucide icon |
| Body | `text-sm leading-6 text-muted-foreground` for descriptions |
| Meta / chip | `text-[11px]`–`text-xs font-medium` |

## Shape, spacing, elevation

- **Radius:** base `--radius` is 0.625rem.
  - Controls (buttons, inputs): `rounded-lg`
  - Cards: `rounded-xl` / `rounded-2xl` / `rounded-[20px]`
  - Hero cards: `rounded-3xl`
  - Pills, chips, avatars: `rounded-full`
- **Spacing:** Tailwind scale. Card padding is `p-4` to `p-6` (`md:p-[30px]` for hero cards). Grid gaps are `gap-3` to `gap-7`.
- **Elevation:** keep it light. Use `shadow-sm` for cards and `shadow-lg` / `shadow-xl` only for floating layers (menus, drag previews, modals). Separate surfaces with borders (`border-border`) before reaching for shadows.
- **Gradients:** use subtle `bg-linear-to-br from-card to-accent` on feature cards, and the sidebar gradient on dark headers. No rainbow or neon gradients.

## Components

Check what already exists before writing new markup:

- **shadcn primitives** in `src/components/ui/`: `button`, `select`, `dropdown-menu`, `popover`, `calendar`, `tabs`.
  - `Button` variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
  - `Button` sizes: `xs`, `sm`, `default`, `lg`, plus `icon-*` sizes.
- **Fields** in `src/components/ui/fields/`: typed field renderers (text, email, phone, number, currency, date, select, badge, checkbox) resolved through `fieldRegistry.js`. Use them for CRM records.
- **Table** in `src/components/ui/table/`: the data table with search, filters, sorting, status donut and rows. Reuse it for record lists.
- **Onboarding style kit** in `src/components/pages/profile/onboardingStyles.js`: token-based class sets (`surface`, `input`, `primary`, `secondary`, `back`, `icon`, `status`, `display`, `eyebrow`, `progressStep`). Use it for candidate-facing forms and flows.
- **Icons:** `lucide-react`, 16–18px inline and 23–27px in icon tiles, with `aria-hidden="true"` when decorative.

Patterns:
- **Primary action:** one per view, `bg-primary text-primary-foreground`, `min-h-11`, with a trailing `ArrowRight` for forward steps.
- **Icon tile:** `size-12 rounded-[14px] border bg-accent text-primary`.
- **Status chip:** `rounded-full border px-2.5 py-1 text-[11px]`, tinted with the matching feature token and paired with an icon.
- **Dark header band:** `bg-gradient-to-r from-sidebar-primary to-sidebar-secondary text-white rounded-3xl`.

## Feedback and loading

- **Toasts:** `react-hot-toast` is the standard (react-toastify is legacy; don't add new uses).
- **Loading:** use skeletons (`react-loading-skeleton` or matching skeleton components) that mirror the final layout, not blank screens.
- **Empty states:** a short explanation plus the next action, never just "No data".
- **Errors:** inline next to the field (`aria-invalid`, with a `border-destructive` style) plus a toast for request failures.

## Motion

- Use `framer-motion` for UI transitions. GSAP appears only in a few existing spots; don't spread it.
- Keep motion short (150–350ms) and purposeful: entering panels, toasts, drag feedback.
- Always add `motion-reduce:transition-none` or check `prefers-reduced-motion`. Wrap animated screens in `<MotionConfig reducedMotion="user">`.
- The onboarding welcome screen (`src/components/pages/profile/OnboardingWelcome.jsx`) is the reference for expressive, candidate-facing screens:
  - `OnboardingBackdrop`: dot grid, drifting color glows, and a cursor spotlight
  - `OnboardingJourneyPreview`: floating parallax cards
  - staggered entrances, card spotlight on hover, and a shine on the call-to-action button

  Keep admin screens calmer than this. Use it as a pattern for first-run or marketing-like moments only.

## Responsive

- Work mobile-first from 360px to wide desktop. Common breakpoints in use are `min-[400px]`, `sm`, `md`, and `lg`.
- Stack columns on mobile and switch to grids at `md` (for example `md:grid-cols-[1.05fr_1fr]`).
- Touch targets are at least 44px (`min-h-11`). Primary actions go full-width on mobile.
- Tables must stay usable on small screens, through horizontal scroll inside the table viewport. The page itself never scrolls sideways.

## Accessibility checklist

- Semantic elements (`button`, `nav`, `section` with `aria-labelledby`, `ul`/`li`).
- Visible labels on every input. Helper text uses `text-muted-foreground`.
- Visible focus: `focus-visible:outline-2 outline-offset-2 outline-primary` or the `ring` token.
- Text contrast of at least 4.5:1 on its surface. Check this whenever you add or change a theme.
- Don't use color alone for state. Mark the current step with `aria-current="step"`.
