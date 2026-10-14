# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- `.claude/settings.json` (shared) makes Claude Code ask for permission before it runs the dev server, build, or preview. Don't try to get around that by calling `vite` or `node ./node_modules/vite/...` directly.
- To check that a UI change works, run `npm test` and `npx eslint <changed files>`, then ask the user to check it in their running app on `localhost:5173`.
- Personal permission tweaks go in `.claude/settings.local.json` (git-ignored), not `settings.json`.
