# CONTRABLUFF — Project Guide for Claude Code

Devvit app ID: `contrabluff`. Display title: CONTRABLUFF.

A daily asynchronous bluffing game for Reddit, built on **Devvit Web**, for Reddit's Game of the Day Hackathon (Devpost).
**Submission deadline:** Dec 9, 2026, 3:00 AM GMT+1. Target: submitted by the afternoon of Dec 8.

---

## 1. The game in one paragraph

Every day, every player is both a **smuggler** and a **customs officer**. First you pack 3 of today's 5 items into a suitcase and label it, maybe honestly, maybe not. Your bag joins a shared queue. Then you work a short shift at the checkpoint, inspecting 5 bags packed by other Redditors (their avatar, username and 7-day honesty rating are on the passport). You get one X-ray, then you stamp each bag PASS or BUST. Tomorrow you find out who your bag fooled and who busted you.

**Inspiration:** Papers, Please + Sheriff of Nottingham, compressed into a ~60-second daily ritual.

## 2. Judging criteria (design every decision against these)

1. **Delightful UX:** fun within 10 seconds, no wall of text.
2. **Polish:** close to launch quality, compliant with Devvit Rules.
3. **Reddit-y:** community-minded, own identity, *not* "a game about Reddit."
4. **Daily Content:** fresh challenge every day.

Tie-breakers favour UX, then polish. The judges explicitly penalise visible "AI slop": generic unstyled components, text overflowing the viewport, no identity.

## 3. Design pillars

- **People are the content.** Other players' bags are the levels. Surface usernames, avatars and reputations everywhere.
- **One decision at a time.** On mobile, the player should only ever be looking at one bag and two stamps.
- **Every tap has weight.** Stamps thunk, the screen shakes, ink splatters, money counts up.
- **Icons over text.** Items are a big icon, a 1–2 word name, a value tag, and a LEGAL/CONTRABAND pill. Labels are at most 8 words.

## 4. Rules (MVP — implement exactly this first)

### 4.1 Daily setup (deterministic)
- Day key: `YYYYMMDD` in UTC. A new day starts at 00:00 UTC.
- Seeded PRNG (e.g. mulberry32) on `dayKey + subredditId`.
- Today's **hand**: 5 items from the catalog, always with **at least 2 contraband and at least 3 legal** (so a clean bag is always possible; `MIN_LEGAL_IN_HAND` in `balance.ts`).
- **All game state is keyed by the current UTC dayKey, not by the post.** Any CONTRABLUFF post plays today's game; `postData.dayKey` is for display only.
- Today's **Directive**: 1 of 3 (see 4.5).

### 4.2 Phase 1: PACK (smuggler)
- Choose **exactly 3** of the 5 items.
- Choose 1 label from a preset list of ~24 funny lines (e.g. "Just laundry, officer", "Grandma's tea, don't ask"). No free text in the MVP (moderation risk).
- Seal the bag, which goes to the server. One bag per user per day.

### 4.3 Phase 2: INSPECT (officer)
- The server assigns 5 bags: today's pool first (excluding your own bag; prefer bags with the fewest inspections so far), then yesterday's pool, then NPC bags as backfill.
- For each bag the player sees: avatar, username, honesty badge, label, and the Directive info if any.
- **1 X-ray per shift**: reveals 1 random item in the current bag (resolved by the server).
- Stamp **PASS** or **BUST**. Once stamped, the bag's full contents are revealed with an animation.

### 4.4 Scoring

**Officer profit** (today's leaderboard ranks by this):
| Situation | Officer gets |
|---|---|
| PASS a clean bag | +100 |
| PASS a bag with contraband | −250 |
| BUST a bag with contraband | + total contraband value in the bag |
| BUST a clean bag (false arrest) | −300 |

**Smuggler's Cut** (separate leaderboard; credited to the *packer* every time someone inspects their bag):
| Situation | Packer gets |
|---|---|
| Bag with contraband is PASSED | + 25% of the bag's total contraband value |
| Bag with contraband is BUSTED | −100 |
| Clean bag is BUSTED (you baited them) | +200 |
| Clean bag is PASSED | +25 |

Directive values apply to both tables (Tech Crackdown doubles tech items for officers and smugglers). These make bluffing clean a real strategy. Keep all numbers in `src/shared/balance.ts` so tuning is one file.

- Contraband values: 300–900. Legal values: 20–80 (flavour only).
- End of shift: "SHIFT CLEARED" if officer profit > 0, otherwise "DOCKED PAY" (comedic, still recorded).

### 4.5 Directives (MVP: 3)
- **Weight Check:** every bag shows its total weight in grams. Items have weights, and contraband tends to be heavy.
- **Tech Crackdown:** items tagged `tech` are worth ×2 today, for both officers and smugglers.
- **Double Scan:** officers get 2 X-rays today.

Stretch: **Internal Affairs** (bribe envelopes plus an undercover audit), and **Ink Smudge** (labels redacted, plus one extra scan).

### 4.6 Reputation
- **Honesty rating** = the share of a user's bags in the last 7 days that were clean. Show it as a badge ("38% Honest"). With fewer than 2 bags, show "New Traveler".

### 4.7 Yesterday's Verdict
When a player opens the game, if they packed a bag yesterday, show a card first: "Your bag was passed by 14, busted by 3. Smuggler's Cut: +$4,200. Busted by u/x, u/y." Then the CLOCK IN button.

### 4.8 NPCs (cold start)
- 12 NPC travellers with distinct names and personalities (e.g. "Aunty Bisi, Frequent Flyer", "Dr. Vex, Suspiciously Calm"), each with an SVG portrait (`src/client/assets/npcs/npc-<id>.svg`) and an **NPC** tag.
- **Never** fake a Reddit username or Snoovatar for an NPC.
- NPC bags are generated deterministically from the day's hand and each NPC's personality (e.g. Aunty Bisi is honest 80% of the time).

## 5. Reddit integration
- Use the player's avatar (Snoovatar) and username on passports.
- **Streak:** consecutive UTC days with a completed shift. Only a shift completed on *today's* UTC dayKey counts.
- **User flair** at milestones (e.g. "Iron Stamp", "Master Smuggler", "7-Day Shift Streak"), if the API allows it for the installing subreddit.
- **Share card:** at the end of a shift, a one-tap "Copy result" producing a short emoji summary with callouts, for pasting into comments, e.g.
  `CONTRABLUFF 21/11 🛃 $1,750 | 🟥🟩🟥🟩🟩 | busted u/pixelwizard 📦`
- **Daily post:** a scheduler job (cron `5 0 * * *`) creates a new post every day at 00:05 UTC with today's dayKey and Directive in the post data.
- **Live ticker** (stretch): realtime "u/x just busted u/y" feed on the inline preview.

## 6. Technical stack and architecture

- **Devvit Web** (client + server + `devvit.json`). Start from the **official React template** on the Devvit quickstart (developers.reddit.com/docs/quickstart). Don't hand-roll the scaffold.
- Client: React + TypeScript + Tailwind, Web Audio for SFX (synthesised, no audio files needed), SVG art supplied by our designer in `src/client/assets/{items,npcs,stamps,ui}/` (`item-<id>.svg`, `npc-<id>.svg`); emoji/plain-shape placeholders until the files arrive.
- Server: whatever the official template uses (Express or Hono). Redis for all state.
- **No external HTTP, no AI calls at runtime.**

### IMPORTANT: verify Devvit APIs
Devvit changes often. Before using any Devvit API (Redis commands, scheduler, realtime, `reddit.*` methods, flair, post creation, entrypoints/expanded mode, `devvit.json` fields), **check the current docs at developers.reddit.com/docs** or the template's own code. Don't trust memory or this file for exact API names. If something in this guide conflicts with the docs, the docs win; note the deviation in `NOTES.md`.

### Server authority (anti-cheat)
- The client never receives the contents of a bag before it is stamped or X-rayed.
- All scoring is computed on the server. The client only sends intents: `pack`, `xray`, `stamp`.
- A shift is a server-side state machine (`step 0..4`). Steps can't be replayed or skipped.

### Redis keys (suggested; adapt to the commands Devvit supports)
```
day:{d}:meta            hash   seed, directiveId, handJson
day:{d}:bag:{userId}    hash   items, labelId, createdAt, inspections, passes, busts
day:{d}:pool            zset   userId -> inspection count (pick the least-inspected)
day:{d}:shift:{userId}  hash   bagRefs[5], step, xraysLeft, profit, revealedJson
day:{d}:lb:officer      zset
day:{d}:lb:smuggler     zset
user:{userId}:stats     hash   lifetime totals, lastPlayedDay, streak, bestStreak
user:{userId}:history   hash   dayKey -> clean|dirty  (prune beyond 7 days)
user:{userId}:verdict:{d} hash  passedBy, bustedBy, cut, bustedByNames(json, max 3)
```
Set TTLs (~8–10 days) on day-scoped keys so storage stays small while the app is unpublished.

### API (client → server)
```
GET  /api/state         today's directive, hand, my phase, sanitized current bag, verdict, leaderboard top 5
POST /api/pack          { itemIds[3], labelId }  -> validates, stores bag, creates shift
POST /api/xray          { }                      -> reveals 1 item of the current bag
POST /api/stamp         { action: PASS|BUST }    -> resolves, credits packer, returns reveal + next bag
GET  /api/leaderboard   officer + smuggler top 10, my ranks
```
Scheduler: daily post creation at 00:05 UTC (`5 0 * * *`).

## 7. Screens (mobile-first; test at 360×640 inside the Reddit app)

1. **Inline post preview:** title stamp "CONTRABLUFF", today's date, the Directive badge, "N smugglers busted today", a big **CLOCK IN** button that opens expanded mode.
2. **Verdict card** (only if they packed a bag yesterday).
3. **Pack desk:** 5 item cards in a tray, an open suitcase with 3 slots, a label picker (swipe/cycle), and SEAL BAG.
4. **Inspection booth:**
   - top 15%: shift progress (bag 2/5), profit counter
   - middle 55%: passport (avatar, username, honesty badge, label) plus a closed suitcase; X-ray sweeps across it with a phosphor-green beam
   - bottom 30%: X-RAY button (small), then big **PASS** (green) and **BUST** (red) stamps within thumb reach
5. **Shift report:** result stamp, profit, rank, a 5-cell result grid, who you busted, streak, "Copy result", and "Come back tomorrow for your verdict".

No secondary actions during active play. First-time hints are contextual (e.g. pulse the X-ray button on bag 1), not a tutorial screen.

## 8. Visual identity

- Mid-century customs desk: manila paper, rubber stamps, a CRT X-ray.
- Palette: Desk Charcoal `#1E1C1A`, Manila `#F2E8D5`, Stamp Crimson `#D93829`, Clearance Green `#2D8A56`, X-ray Phosphor `#4AF626`.
- Type: a condensed display face for headers (e.g. Oswald) and monospace for numbers and ledgers. Bundle fonts locally.
- **Juice checklist:** stamp drops with a rotation plus 60 ms screen shake plus an ink splatter; money counts up; bag contents spill out on reveal; X-ray beam sweep; synthesised SFX (stamp thunk, scanner hum, cash register, buzzer) with a mute toggle; respect `prefers-reduced-motion`.

## 9. Content catalogue (`src/shared/catalog.ts`)

- ~30 items: 15 legal, 15 contraband. Each has `{ id, name, icon, contraband, value, grams, tags[] }`.
- Keep it cartoonish and global: GPUs, gold watches, "suspiciously heavy socks", rare sneakers, counterfeit designer bags, a live parrot, vintage wine. **No drugs, weapons or anything that conflicts with Devvit Rules.**
- 24 preset labels.
- 12 NPCs.

## 10. Milestones

| Dates | Milestone | Done when |
|---|---|---|
| Nov 22–23 | Scaffold + vertical slice | Official template running in a playtest subreddit; pack → inspect 5 NPC bags → report works end to end on the server with placeholder UI |
| Nov 24–25 | Real multiplayer + demo subreddit | Real players' bags enter each other's shifts; daily post scheduler; **start recruiting 30–50 playtesters** |
| Nov 26–29 | Full rules | Smuggler's Cut, verdict card, honesty badge, 3 directives, streaks, leaderboards, share card |
| Nov 30–Dec 3 | Polish | Final visuals, stamp juice, SFX, X-ray effect, mobile layout pass, flair |
| Dec 4–6 | Balance + QA | Tune `balance.ts` from real playtest data; test on iOS, Android and desktop; empty/edge states |
| Dec 7–8 | Submit | Demo post live, screenshots, 60-second video, Devpost page, developer survey |

## 11. Working rules for Claude Code

- Make small, testable commits. **Commit messages and PRs must not include any `Co-Authored-By` trailer or other Claude/AI attribution.**
- Keep game rules in `src/shared/` (pure functions, unit-tested with vitest) so that server and tests share them.
- Run the type check and tests before every commit.
- **Never publish the app.** Uploading and playtesting are fine; the hackathon wants it unpublished.
- When unsure about a Devvit capability, check the docs, then write what you found in `NOTES.md`.
- Prefer finishing and polishing the MVP over adding stretch features.
