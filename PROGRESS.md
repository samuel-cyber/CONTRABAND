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

## Milestone 2: Daily post + multiplayer (2026-11-24)

**Built**
- `core/post.ts` `ensureDailyPost`: creates **one** post per UTC day, titled `Checkpoint #N: <Directive>`, with `postData {dayKey, directiveId, checkpoint}` and an old-Reddit text fallback. A per-day claim (`hSetNX`) makes it idempotent across the scheduler, the install trigger and the mod menu. A claim older than 2 minutes without a post is treated as crashed and taken over.
- `devvit.json`: scheduler task `daily-post` → `/internal/scheduler/daily-post`, cron `5 0 * * *`. Validated against the local schema.
- Mod menu item renamed **"Create today's checkpoint post"**. If today's post already exists it takes you there instead of making a duplicate.
- `onAppInstall` creates today's post.
- Multiplayer: since 1B, real players' bags enter other players' shifts (today's least-inspected first, then yesterday's, then NPCs).
- Logged out: the splash says "Log in to clock in" and opens Reddit's login prompt. The game screen does the same.

**UNCONFIRMED**
- Cron timezone. The handler logs `[daily-post] ran at <ISO time>`, so check `devvit logs` after 00:05 UTC to confirm it ran in UTC.
- That `reddit.submitCustomPost` works from a scheduler context (no user). It runs as the app account, which should be fine.

**Test on your phone**
1. As a mod, use the subreddit menu "Create today's checkpoint post". The post appears as `Checkpoint #1: <Directive>`. Use it again: you get a toast and land on the same post, with no duplicate.
2. With a second account (or a friend): pack a bag. Then on your main account play a shift. One of your 5 bags should be the second account's bag (real username, not NPC-tagged).
3. Log out and open the post: the splash shows "Log in to clock in", and tapping it opens the login prompt.
4. Next morning (after 00:05 UTC) a new `Checkpoint #2` post should appear on its own.

## Milestone 3: Full rules (2026-11-24)

**Built**
- **Verdict card**: shown before the pack desk when you packed a bag yesterday. It shows your 3 items, your label, passed/busted counts, Smuggler's Cut, and up to 3 busters. Variants: "You got away with it", "Caught red-handed", "You baited them" (a clean bag that got busted; busters are listed as "Fell for it"), "Clean and waved through", and "Still in the queue" (nobody inspected it yet). Your report also has a one-line summary of yesterday's bag.
- **Honesty badge**: the 7-day window counts today plus the 6 days before. It shows "New Traveler" under 2 bags, is frozen at pack time, and NPCs show their personality rating.
- **Directives**: Weight Check (grams on the passport), Tech Crackdown (×2 on tech items in cards, officer payouts and the smuggler cut), Double Scan (2 X-rays). All are driven by `shared/directives.ts`.
- **Streaks**: consecutive UTC days with a completed shift. A second completion on the same day doesn't count.
- **Leaderboards**: a new "Full leaderboards" screen from the report with Officer/Smuggler tabs, the top 10, and your own row pinned if you're outside the top 10.
- **Share**: share sheet, with clipboard + toast as the fallback (since 1C).
- **Flair**: `shared/flair.ts` picks the highest milestone earned (Master Smuggler ≥ $5,000 lifetime cut, 7-Day Shift Streak, Iron Stamp at 10 shifts, 3-Day Shift Streak). It is set at the end of a shift inside try/catch and only when it changes. The thresholds are in `balance.ts`.
- Lifetime Smuggler's Cut is now tracked per user (`user:{id}:stats.cut`).

**UNCONFIRMED**
- Whether `reddit.setUserFlair` is allowed for the app account in your subreddit. If it fails it's logged as `Flair not set for …` and the game carries on.

**Test on your phone**
1. Day 2: open the post. The verdict card shows first, then CLOCK IN takes you to the pack desk.
2. On a Double Scan day the booth shows "2 left". On Weight Check, passports show grams. On Tech Crackdown, tech cards show a red ×2 and the values are doubled.
3. Report → "Full leaderboards" → switch tabs → Back.
4. After 3 days in a row, check your user flair in the subreddit ("3-Day Shift Streak").

## Milestone 4: Edge states (2026-11-24)

**Built**
- **Already played today**: reopening goes straight to the report, which now has a live "Next checkpoint opens in HH:MM:SS" countdown. At 00:00 UTC it refreshes into the new day.
- **Old posts**: when a post's `postData.dayKey` is older than today *and* today's checkpoint post exists, the game shows a read-only "Checkpoint closed" screen: your shift profit and bag result for that day, top officers and smugglers that day, and a "Today's checkpoint →" button. The splash on old posts says "Checkpoint closed", with "See results" and a link to today. If today's post doesn't exist (for example the cron didn't run), old posts still play today's game so nobody is stranded. New endpoint: `GET /api/day?d=YYYYMMDD`.
- **Network retry**: every X-ray and stamp carries the on-screen step. After a failed request the red banner's Retry refetches state and resumes at whatever bag the server says is current. A stamp is never applied twice. `busy` (transaction conflict) retries automatically, up to 2 times.
- **Friendly errors**: radio/X-ray-jam style copy for network, busy, server and bad-request errors. Server-knows-better errors (`stale`, `not-packed`, `shift-finished`, `already-packed`) resync silently.
- **First-shift hints** (only until your first shift is done): the first item card pulses on the pack desk, the X-ray button pulses on bag 1 with a one-line tip under the suitcase, and each reveal shows a one-line explanation of the payout.
- Layout fix: the compact directive badge in the booth header no longer overflows at 360px.

**UNCONFIRMED**
- `context.postData` being available on the client for posts created by the scheduler. If it's missing, the post just behaves as today's checkpoint.

**Test on your phone**
1. Finish a shift, close the post and reopen it: you land on the report with a ticking countdown.
2. Tomorrow, open *yesterday's* post: you see "Checkpoint closed" with that day's results and a button to today's post.
3. Mid-shift, turn on airplane mode and tap PASS: the red banner appears. Turn the network back on and tap Retry: you're on the correct bag, with no double stamp.
4. New account: the first item pulses, X-ray pulses on bag 1, and the reveals explain the payouts. On a second shift (next day) these hints are gone.
