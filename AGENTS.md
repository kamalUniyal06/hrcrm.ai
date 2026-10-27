# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) working in this repository.

## Rules that always apply

### Never run the build or dev server yourself — ask first

Do **not** run any of these on your own, not even to "verify" a change:

- `npm run dev`, `npm start`, `vite`, `npx vite`
- `npm run build`, `vite build`, `npx vite build`
- `npm run preview`, `vite preview`
- Any other long-running or watch process (servers, watchers, `--watch` flags)

When a build or a running app is genuinely needed, **stop and ask the user**, say why, and wait for their answer. If they agree, they may prefer to run it themselves.

Why: the user usually already has the dev server running on `localhost:5173`, and a second one conflicts with it. The build script reserves 8 GB of memory (`--max-old-space-size=8192`) and is slow.

To check your work without asking, use the commands under [Checks you can run](#checks-you-can-run).

### Other ground rules

- Do not commit, push, create branches, or open PRs unless the user asks.
- Never read out, log, or commit values from `.env`. Use `.env.example` to see which variables exist.
- Keep changes as small as the task allows. Don't reformat, rename, or "clean up" unrelated code.
- Match the surrounding code: naming, file layout, comment density, and idiom.

## Project overview

HRCRM is an HR platform frontend: recruitment, candidate onboarding, interviews, employees, attendance, leave, salaries, and increments, plus a configurable CRM layer (dynamic entities, table, detail, and create views, sidebar layouts).

Some folder and file names are misspelled (`employement`, `prefrences`). Keep them as they are, because imports depend on them.

## Conventions

### Data fetching

- Put request functions in `src/api/<domain>.api.js`, using `http` / `apiRequest` / `fetchGpc` from `src/services/api.js`.
- Wrap them in hooks in `src/queries/<domain>.queries.js`, with a `<domain>Keys` query-key object.
- Do not create new Axios instances. `crmClient` attaches the CRM bearer token and retries once on a 401.

### Styling and theming

The full visual system is in `DESIGN.md`. In short:

- Use the semantic tokens: `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `border-border`, `bg-accent`, `bg-sidebar-primary`, etc.
- Don't hardcode hex values or Tailwind palette colors (`bg-blue-600`, `text-slate-700`) in new UI, because they ignore the selected theme.
- Feature-specific tokens already exist: `--employee-*` and `--leave-*`.
- Themes are set by `data-theme` on `<html>`. Each one is defined twice:
  1. a `[data-theme="<id>"]` block in `src/index.css`
  2. an entry in `THEMES` in `src/utils/theme.js`

  New themes need both. `DEFAULT_THEME` in `theme.js` is the fallback.
- `--primary` is used as text on light surfaces and behind white text, so it must stay readable both ways.
- Use `cn()` from `@/lib/utils` to merge class names.

### Components

- Use the existing primitives in `src/components/ui/` before adding new ones. Add new shadcn components as JSX (see `components.json`).
- Keep semantic HTML, visible labels, keyboard and focus behavior, and comfortable touch targets. Don't rely on color alone to show state.
- Layouts must work from mobile width up to desktop.
- When you add a new page or a user-visible feature, add a "what's new" entry to `FEATURE_TOURS` in `src/utils/featureTours.js` (and a `data-tour` attribute on anything a step points at). Each user sees a tour once.

### Tests

- Tests sit next to the code as `*.test.js`, use `node:test` + `node:assert/strict`, and cover pure logic modules (no DOM).
- When you change logic that has a test file, update or extend that file.

## Checks you can run

You can run these without asking:

```bash
# Unit tests (all should pass)
npm test

# A single test file
node --test src/utils/pageAccess.test.js

# Lint only the files you changed. The full repo already has lint errors, so `npm run lint` won't be clean.
npx eslint path/to/changed-file.jsx
```

Don't fix unrelated lint errors in files you didn't otherwise touch.

## Further reading

- `PRODUCT.md`: who the users are, product purpose, brand voice, design principles. Read it before any UX or copy change.
- `DESIGN.md`: brand palette, tokens, themes, typography, component patterns. Read it before any UI change.
- `docs/onboarding-backend-fields.md`: field contract for the candidate onboarding flow
- `docs/policies-backend-fields.md`: field contract for the `hrc_policies` module behind Terms & policies
- `docs/quotations-backend-fields.md`: field contract for the `hrc_quotations` module behind Quotation alerts
- `docs/recruitment-integration.md`: how the recruitment API integration works
