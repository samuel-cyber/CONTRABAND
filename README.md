# CONTRABLUFF

A daily asynchronous bluffing game for Reddit, built on Devvit Web.

Every day you are both a **smuggler** and a **customs officer**. Pack 3 of today's 5 items into a suitcase and label it, honestly or not. Then work a 5-bag shift at the checkpoint, inspecting bags packed by other Redditors: one X-ray, then stamp **PASS** or **BUST**. Tomorrow you find out who your bag fooled.

## Commands

- `npm run dev`: playtest on your test subreddit (`devvit playtest`)
- `npm run build`: build client and server into `dist/`
- `npm run test:types` / `npm run lint` / `npm run test:unit`: type check, lint, vitest
- `npm run deploy`: checks + `devvit upload` (private upload; this project is intentionally never published)

## Layout

- `src/shared`: game rules, catalogue, scoring, seeded daily generation (pure, unit-tested)
- `src/server`: Hono routes, Redis state, the server-authoritative shift state machine
- `src/client`: React screens (splash, pack desk, booth, report), Web Audio SFX, animations

See `CLAUDE.md` for the game spec, `NOTES.md` for platform notes and `PROGRESS.md` for the build log and phone test checklist.
