# CONTRABLUFF progress log

## Milestone 1B: Server (2026-11-24)

**Built**
- `src/server/core/shiftMachine.ts`: pure shift state machine (create, X-ray, stamp), NPC/player bag resolution, and the sanitizer (`toBagView` / `toShiftView`). It is the only code that turns a bag into something the client sees.
- `core/pool.ts`: bag picking. Today's least-inspected bags first (never your own, never the same traveller twice in a shift), then yesterday's, then the NPC backfill.
- `core/keys.ts`: every Redis key in one place. Day keys expire 9 days after their day starts (`dayTtlSeconds`).
- `core/shift.ts`: pack / X-ray / stamp, each in a `watch → read → multi → exec` transaction. A stamp also credits the packer (passes/busts, Smuggler's Cut, up to 3 buster names, smuggler leaderboard), updates the officer leaderboard and day stats, and, on the last bag, the streak.
- `core/state.ts`, `core/leaderboard.ts`, `core/player.ts`, `core/bags.ts`, `core/day.ts`, `core/errors.ts`
- Routes: `GET /api/state`, `POST /api/pack`, `POST /api/xray`, `POST /api/stamp`, `GET /api/leaderboard`. Errors come back as `{status:'error', code, message}`.
- Bags are assigned to a shift one at a time, as you reach them. A player who clocks in early still gets bags from people who packed later in the day.
- The Snoovatar is resolved once at pack time and stored on the bag. The honesty badge is also frozen at pack time from the history *before* today, so it can't leak today's bag.
- Tests: 12 new (state machine, sanitizer never leaks hidden items, pool order). 67 in total.

**UNCONFIRMED**
- What `exec()` does on a watch conflict. I treat null, empty or a thrown error as a conflict and return `busy` (the client retries).
- `context.snoovatar` vs `reddit.getSnoovatarUrl()` in production.
- A shift started before 00:00 UTC and continued after it starts over on the new day (the shift belongs to the day it was packed). This is deliberate, but untested.

**Test on your phone:** nothing yet (no UI). Covered by 1C.
