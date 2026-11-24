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

## Milestone 1C: Playable loop (2026-11-24)

**Built**
- Theme: palette tokens, Oswald + JetBrains Mono bundled locally (`@fontsource`, woff2 inside the build), manila paper and desk textures, press states, `prefers-reduced-motion` honoured.
- `splash.tsx` (inline): date, stamped CONTRABLUFF title, directive badge, "N smugglers busted today", CLOCK IN. CLOCK IN opens expanded mode, or the login prompt if logged out.
- `game.tsx` routes by phase: Logged out → Pack desk → Booth → Report.
- Pack desk: 5 item cards (value, ×2 on Tech Crackdown, LEGAL/CONTRABAND pill), 3-slot suitcase, label wheel (‹ ›), and SEAL. The SEAL button shows how many items are still needed.
- Booth: progress dots, profit, passport (Snoovatar or initials, NPC tag and title, honesty pill, weight on Weight Check days, declared label), suitcase with a CRT strip for X-ray finds, X-RAY button, big PASS/BUST. After each stamp a reveal panel shows the verdict stamp, the money change, the bag's contents, and "Next traveller".
- Report: SHIFT CLEARED / DOCKED PAY stamp, profit, emoji grid, rank, streak, who you busted, Share (share sheet, falling back to clipboard + toast), top officers.
- Server hardening: X-ray and stamp now send the step of the bag on screen. A retried or double-tapped request for a bag that's already stamped gets `stale` and the client resyncs instead of stamping the next bag.
- Visual QA: screenshots of each screen at 360×640 in headless Chromium with mocked API data. The pack desk was compressed so SEAL fits without scrolling.

**UNCONFIRMED**
- `showShareSheet` behaviour on iOS, Android and desktop (the clipboard fallback is there).
- Snoovatar images loading inside the web view (initials fallback on error).
- Emoji rendering is down to each phone's emoji font. These are placeholders until the designer's SVGs arrive.

**Test on your phone** (`npm run dev`, open the playtest subreddit, create a post via the mod menu "Create a new post" for now):
1. The inline splash shows today's directive and CLOCK IN, and it opens the full-screen game.
2. Pick 3 items, cycle the label, SEAL. You should land on Bag 1/5 with an NPC.
3. X-ray once: one item appears in green on the suitcase, and the button shows 0 left (2 on Double Scan days).
4. Stamp all 5 bags: each reveal shows contents and money, and the profit updates.
5. The report shows the grid. Share opens the share sheet or copies the text.
6. Close and reopen the post: you go straight back to the report (one shift per day).
7. Kill the network mid-shift and tap a stamp: a red banner appears. Retry resumes at the same bag.
