# CONTRABLUFF: Devvit platform notes

Research log for the Devvit APIs this game depends on. Verified on **2026-11-24** against:

- the template in this repo (commit `03970a1`)
- installed typings in `node_modules/@devvit/*` (all **v0.15.6**)
- the official docs (`developers.reddit.com/docs/*.md`: scheduler, redis, devvit_web_configuration, realtime/overview, post-data, playtest)

Labels: **CONFIRMED** means I saw it in template code, typings or docs. **UNCONFIRMED** means it is inferred and still has to be checked in a playtest.

---

## 0. Where the sources disagree

| Topic | CLAUDE.md / AGENTS.md says | Reality (template + docs) | Decision |
|---|---|---|---|
| API layer | AGENTS.md: "Hono, **tRPC v11**", `trpc.ts` | No tRPC dependency and no `trpc.ts`. The template uses **plain Hono routes** (`src/server/routes/*.ts`) and `fetch('/api/...')` from the client | Keep plain Hono + `fetch`. Shared request/response types go in `src/shared/api.ts` |
| Test runner | CLAUDE.md: vitest | Template used `node --test` with strip-types | **Decided:** vitest 4.1.0 added; `test:unit` = `vitest run`. `vitest.config.ts` is separate from `vite.config.ts` so tests never load the Devvit plugin |
| Script names | AGENTS.md: `npm run type-check`, `npm run test` | Actual scripts: `test:types` (`tsc --build`), `test:unit`, `lint`, `build` | Use the real names |
| Permissions | n/a | Template calls `redis`/`reddit` but `devvit.json` had **no `permissions` block**. The schema and docs say `permissions.redis` and `permissions.realtime` **default to `false`** | **Done:** `permissions: { redis: true, reddit: { enable: true, scope: "user" } }`. Realtime stays off for now |
| Node version | README: Node 22 | `package.json` engines `>=24`, `.nvmrc` 24.18.0. Local is v24.22.3 | Node 24 |

---

## 1. Client and server structure

**CONFIRMED.** Build: `vite.config.ts` uses `@devvit/start/vite`'s `devvit()` plugin, which builds both:

- `src/client/*.html` → `dist/client/` (`devvit.json` → `post.dir`)
- `src/server/index.ts` → `dist/server/index.cjs` (`devvit.json` → `server.dir` / `server.entry`)

TypeScript project references are in `tools/tsconfig.{client,server,shared,vite}.json`. Client and server both reference `shared`. Note that `tsconfig.shared.json` uses `lib: ["WebWorker","ES2023"]` (no DOM, no Node), so **`src/shared` must stay pure**.

Server entry, `src/server/index.ts`:

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
const app = new Hono();
const internal = new Hono();
internal.route('/menu', menu);
internal.route('/form', forms);
internal.route('/triggers', triggers);
app.route('/api', api);          // called by the web view
app.route('/internal', internal); // called by Reddit (menu, triggers, scheduler, forms)
serve({ fetch: app.fetch, createServer, port: getServerPort() });
```

How the client calls the server (`src/client/hooks/useCounter.ts`): plain relative `fetch`. Docs: web views can only fetch `/api/` endpoints.

```ts
const res = await fetch('/api/init');
const data: InitResponse = await res.json();
await fetch(`/api/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
```

Server-side request context: `import { context, redis, reddit } from '@devvit/web/server'`. `context` is request-scoped (AsyncLocalStorage-style). Its fields (`@devvit/shared-types/shared/baseContext.d.ts`) are:
`subredditId (T5)`, `subredditName`, `userId (T2 | undefined)`, `username`, `snoovatar` (experimental), `postId (T3 | undefined)`, `postData`, `appSlug`, `appVersion`, `loid`.

Client-side exports (`@devvit/web/client`): `context` (same fields, plus `client` and `postAuthorId`), `navigateTo`, `showToast`, `showForm`, `showShareSheet`, `requestExpandedMode`, `exitExpandedMode`, `getWebViewMode`, `connectRealtime`, and login-prompt helpers.

Client rules from AGENTS.md:

- no `window.location`; use `navigateTo`
- no `alert`; use `showToast` / `showForm`
- no inline `<script>` in HTML
- no downloads; use the clipboard + `showToast`

Importing `@devvit/web/server` in client code panics by design.

## 2. Redis

**CONFIRMED** (`node_modules/@devvit/redis/types/redis.d.ts` + docs). Import: `import { redis } from '@devvit/web/server'`.

Available commands (each one returns a Promise):

- **Strings/numbers:** `get`, `set(key, val, { expiration?, nx?, xx? })`, `del(...keys)`, `exists(...keys)`, `incrBy`, `mGet`, `mSet`, `getRange`, `setRange`, `strLen`, `rename`, `type`
- **Hash:** `hGet`, `hMGet`, `hSet(key, {field: value})`, `hSetNX`, `hGetAll` (returns `Record<string,string>`), `hDel(key, fields[])`, `hIncrBy`, `hKeys`, `hLen`, `hScan`
- **Sorted set:** `zAdd(key, {member, score}...)`, `zIncrBy(key, member, by)`, `zScore`, `zRank`, `zCard`, `zRem(key, members[])`, `zRemRangeByRank/Score/Lex`, `zScan`, and `zRange(key, start, stop, { by: 'rank'|'score'|'lex', reverse?, limit?: {offset,count} })`, which returns `{member, score}[]`
- **Expiry:** `expire(key, seconds)`, `expireTime(key)`
- **Transactions:** `const tx = await redis.watch(k...); await tx.multi(); await tx.hSet(...); await tx.exec();` plus `discard()` and `unwatch()`
- `bitfield`

Limits and design rules (docs):

- **No plain sets or lists.** Use a zset with score 0 for a set, and a zset or JSON string for a list.
- **No key listing or global SCAN.** Every key must be derivable (for example from dayKey + userId).
- **No pipelining.** Keep round trips low: hashes, compact JSON, `mGet`.
- Data is **namespaced per installation (subreddit)**. No cross-subreddit leaderboards.
- Storage limit is **100 MB for unpublished apps**, so TTLs matter. Request size is 5 MB.
- Transactions: 20 concurrent per installation (one passage says 30), with a 5 s timeout. Always `exec`/`discard`/`unwatch`.
- Single commands (`hIncrBy`, `zIncrBy`, `incrBy`) are atomic without a transaction.
- TTL is per key via `expire` (also `set(..., { expiration: Date })` for strings). There is no per-field TTL on hashes.

Permission: `devvit.json` → `"permissions": { "redis": true }` (default `false`). The template omits it and its build/type-check still pass. **UNCONFIRMED** whether upload/playtest actually rejects it or the CLI infers it. Either way, we declare it explicitly.

## 3. Current user: username, ID, Snoovatar

**CONFIRMED** (typings).

- Server: `context.userId` (`t2_...`, undefined when logged out) and `context.username`. Alternatively `await reddit.getCurrentUsername()` (what the template uses) or `await reddit.getCurrentUser()`.
- Snoovatar: `await reddit.getSnoovatarUrl(username)` returns `string | undefined` and **throws** if the account is unavailable. `context.snoovatar` is marked `@experimental`. `User#getSnoovatarUrl()` also exists.
- Client: `context.username` / `context.userId` / `context.snoovatar` from `@devvit/web/client`. The splash screen uses `context.username`.
- Plan: resolve the snoovatar **once at pack time** on the server and store `{username, snoovatarUrl}` on the bag, so inspectors never trigger per-bag Reddit API calls.
- **UNCONFIRMED:** whether `i.redd.it` / `styles.redditmedia.com` Snoovatar URLs load inside the web view (CSP). Fall back to an initials badge if the `<img>` fails.
- Logged-out users have `userId` undefined. The client has login-prompt helpers (`effects/login-prompt.d.ts`); exact usage is **UNCONFIRMED**.

## 4. Creating posts and per-post data

**CONFIRMED.** `src/server/core/post.ts`:

```ts
import { reddit } from '@devvit/web/server';
export const createPost = async () => reddit.submitCustomPost({ title: 'contrabluff' });
```

`SubmitCustomPostOptions` also accepts:

- `entry` (entrypoint key, default `'default'`)
- `postData` (JsonObject, **max 2 KB**)
- `textFallback` (old.reddit)
- `subredditName`

Post data:

- read with `context.postData` (client and server)
- `reddit.getPostData(postId)`
- `reddit.setPostData(postId, data)` **replaces** the whole object
- `reddit.mergePostData(postId, data)` merges

Plan: `postData = { dayKey, directiveId }`. Everything else lives in Redis.

Existing post-creation paths:

- mod menu item `/internal/menu/post-create` (`src/server/routes/menu.ts`), which returns `{ navigateTo: post URL }`
- `onAppInstall` trigger (`src/server/routes/triggers.ts`)

## 5. Scheduled jobs (daily post)

**CONFIRMED** (schema + docs `capabilities/server/scheduler.md`). Declare the task in `devvit.json`; the endpoint must match `/internal/.+`:

```json
"scheduler": {
  "tasks": {
    "daily-post": { "endpoint": "/internal/scheduler/daily-post", "cron": "5 0 * * *" }
  }
}
```

Handler:

```ts
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
internal.post('/scheduler/daily-post', async (c) => {
  const _input = await c.req.json<TaskRequest>();
  // create post
  return c.json<TaskResponse>({ status: 'ok' }, 200);
});
```

- Jobs configured with `cron` in `devvit.json` are re-registered on every install/upgrade (≥0.14.6).
- Runtime jobs use `scheduler.runJob({ name, cron | runAt, data })`, `cancelJob`, and `listJobs([ScheduledActionManager.USER])`.
- Limits per installation: 10 live recurring jobs, and `runJob` is limited to 60 calls/min.
- **UNCONFIRMED:** the cron timezone. UTC is almost certain but the docs don't say. Verify in playtest by logging `new Date().toISOString()` in the handler.
- The handler should be idempotent. Guard with `set('day:{d}:post', postId, { nx: true })` so a retry or a manual menu post doesn't create duplicates.

## 6. Inline vs expanded view

**CONFIRMED.** `devvit.json`:

```json
"post": { "dir": "dist/client", "entrypoints": {
  "default": { "inline": true, "entry": "splash.html" },
  "game":    { "entry": "game.html" } } }
```

`src/client/splash.tsx` opens the game:

```ts
import { requestExpandedMode } from '@devvit/web/client';
<button onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>Tap to Start</button>
```

- Needs a trusted user gesture. `exitExpandedMode(event)` and `getWebViewMode()` also exist.
- Entry options: `height: "regular" | "tall"` (default tall).
- Docs: keep the inline page light (no heavy deps) and avoid scroll traps.
- Reserved entrypoint keys `_gameplay` / `_direct_launch` exist for discovery surfaces (out of scope).

## 7. Realtime

**CONFIRMED** (typings + docs). Enable with `"permissions": { "realtime": true }` (default false).

- Server: `import { realtime } from '@devvit/web/server'; await realtime.send(channel, jsonMsg)`
- Client: `connectRealtime({ channel, onConnect?, onDisconnect?, onMessage })`, `disconnectRealtime(channel)`, `isRealtimeConnected(channel)`
- Channel names **cannot contain `:`**. Use something like `ticker_20261124`.
- Only needed for the stretch "live ticker".

## 8. User flair

**CONFIRMED API exists** (`node_modules/@devvit/reddit/RedditClient.d.ts`):

```ts
await reddit.setUserFlair({ subredditName, username, text, textColor?: 'dark'|'light', backgroundColor?: '#hex', flairTemplateId?, cssClass? });
await reddit.removeUserFlair(subredditName, username);
reddit.getUserFlairTemplates(subredditName); reddit.createUserFlairTemplate({...});
```

**UNCONFIRMED:**

- whether the app account has flair permission in an arbitrary installing subreddit (probably needs mod permissions, and the app account is normally a mod on install)
- whether user flair must be enabled in the subreddit

Treat flair as best-effort: wrap it in try/catch and never block gameplay on it.

## 9. Sharing results

**CONFIRMED** (typings): `showShareSheet({ text?, title?, data? (≤1024 chars), post? })` "shows the native share sheet or copies to clipboard depending on device". AGENTS.md recommends `navigator.clipboard` + `showToast`.

**UNCONFIRMED:** whether `navigator.clipboard.writeText` works inside the Reddit app's web view. Plan: try `showShareSheet` first, with a clipboard + toast fallback.

## 10. Build, playtest, upload

**CONFIRMED** (`package.json`, `devvit --help`, docs `guides/tools/playtest.md`).

| Command | What it does |
|---|---|
| `npm run build` | `vite build` → `dist/` (passes on the template) |
| `npm run test:types` | `tsc --build` (passes) |
| `npm run lint` | eslint (passes) |
| `npm run test:unit` | `vitest run` over `src/**/*.test.ts` |
| `npm run dev` | `devvit playtest`: installs to the playtest subreddit, hot-reloads, streams logs. Add `?playtest=contrabluff` to the subreddit URL for client logs |
| `npm run login` | `devvit login` |
| `npm run deploy` | types + lint + `devvit upload` (private; installable to subreddits with fewer than 200 members) |
| ~~`npm run launch`~~ | **Removed** (it ran `devvit publish`). Never run `devvit publish` |

- The default playtest subreddit can be set via `"dev": { "subreddit": "..." }` in `devvit.json` or `DEVVIT_SUBREDDIT`.
- The CLI validates `devvit.json` against the schema before playtest/upload/publish.
- Local schema: `node_modules/@devvit/shared-types/schemas/config-file.v1.json`.

---

## 11. Proposed file structure

```
devvit.json                      + permissions {redis, realtime, reddit}, scheduler.tasks.daily-post, menu "Create today's post"
NOTES.md                         this file

src/shared/                      pure TS, no DOM/Node, unit-tested
  balance.ts                     every tunable number: payouts, value ranges, TTLs, shift size, x-ray counts
  catalog.ts                     30 items {id,name,icon,contraband,value,grams,tags}, 24 labels, 12 NPCs {id,name,title,honesty,portraitId}
  directives.ts                  Weight Check / Tech Crackdown / Double Scan definitions + effect helpers (xraysFor, valueOf, showWeight)
  day.ts                         dayKey(date) in UTC, prevDayKey, formatting (21/11)
  rng.ts                         mulberry32 + string hash seed, pick/shuffle helpers
  daily.ts                       generateDay(dayKey, subredditId) → {hand[5] (3 legal + 2 contraband), directiveId}
  npc.ts                         npcBag(npc, day) → deterministic 3 items + label from personality
  scoring.ts                     officerDelta(bag, action, directive), smugglerDelta(...), shiftResult(profit)
  reputation.ts                  honestyBadge(history) → "38% Honest" | "New Traveler"
  share.ts                       buildShareText(report) → emoji summary line
  api.ts                         request/response types for every /api route (replaces template counter types)
  *.test.ts                      tests next to each module (rng, daily, scoring, npc, reputation, share)

src/server/
  index.ts                       Hono app wiring (template, extended with the scheduler route)
  routes/api.ts                  GET /state, POST /pack, POST /xray, POST /stamp, GET /leaderboard (thin: validate → call core)
  routes/menu.ts                 mod menu: create today's post (keep template pattern)
  routes/triggers.ts             onAppInstall: create today's post
  routes/scheduler.ts            /internal/scheduler/daily-post (idempotent)
  core/keys.ts                   every Redis key builder + TTL constants in one place
  core/day.ts                    ensureDay(d): load or create day:{d}:meta from shared/daily
  core/post.ts                   createDailyPost(d): submitCustomPost with postData {dayKey, directiveId}
  core/player.ts                 identity (userId, username, snoovatar cached), stats, streak, history
  core/bags.ts                   storeBag, getBag, pool selection (today → yesterday → NPC backfill)
  core/shift.ts                  shift state machine: create, xray, stamp (watch/multi so steps can't replay)
  core/verdict.ts                credit packer on each stamp, read yesterday's verdict
  core/leaderboard.ts            officer + smuggler zsets, top N + my rank
  core/flair.ts                  best-effort milestone flair
  core/sanitize.ts               strip hidden bag contents before anything leaves the server

src/client/
  splash.html / splash.tsx       inline preview: stamp title, date, directive badge, busted count, CLOCK IN
  game.html / game.tsx           expanded app root: fetch /api/state, route by phase
  api.ts                         typed fetch wrappers for /api/*
  state/useGame.ts               phase state machine on the client (verdict → pack → inspect → report)
  screens/Verdict.tsx            yesterday's verdict card
  screens/PackDesk.tsx           tray, suitcase with 3 slots, label cycler, SEAL BAG
  screens/Booth.tsx              inspection booth layout (progress, passport, suitcase, buttons)
  screens/Report.tsx             shift report, grid, copy result
  components/Passport.tsx        avatar/NPC portrait, username, honesty badge, label
  components/ItemCard.tsx        icon, name, value tag, LEGAL/CONTRABAND pill
  components/Suitcase.tsx        closed/open/spill animation
  components/XRay.tsx            phosphor beam sweep
  components/Stamp.tsx           PASS/BUST stamps with drop, shake, ink
  components/MoneyCounter.tsx    count-up number
  components/MuteToggle.tsx
  assets/items/                  designer SVGs: item-<id>.svg (ids from shared/catalog.ts)
  assets/npcs/                   designer SVGs: npc-<id>.svg
  assets/stamps/                 PASS/BUST stamp art
  assets/ui/                     desk, passport, suitcase, misc UI art
                                 (until files arrive: emoji from catalog `icon` / plain shapes)
  fx/audio.ts                    Web Audio synth: thunk, hum, register, buzzer, mute persisted
  fx/motion.ts                   prefers-reduced-motion helpers
  index.css                      Tailwind + theme tokens (palette, fonts)
  fonts/                         Oswald + a mono face, bundled locally (woff2)
```

Template files kept for now: `hooks/useCounter.ts`, `routes/forms.ts` and the example form menu item. Delete them once the slice works, with your go-ahead.

---

## 12. Decisions (2026-11-24)

1. **Game state is keyed by the current UTC dayKey, not by the post.** The daily post cron is `5 0 * * *` (00:05 UTC). The `scheduler` block goes into `devvit.json` together with its handler in the server milestone, so the cron never calls a missing endpoint.
2. vitest added; `test:unit` → `vitest run`.
3. `launch` script removed; README line removed.
4. `permissions` block added (redis + reddit; realtime off).
5. Snoovatar/flair: best-effort with fallbacks. Stamps use `watch/multi`. Logged-out viewers get a login prompt.
6. Art comes from the designer as SVG files in `src/client/assets/{items,npcs,stamps,ui}/`.
7. Scoring correction: contraband PASSED → packer gets **25%** of the bag's contraband value (was 100%). Directive values apply to both officer and smuggler.

## 13. Milestone 1A rules (confirmed 2026-11-24)

- **Hand = always 3 legal + 2 contraband** (`MIN_LEGAL_IN_HAND = 3` in `balance.ts`). With only 2 legal items nobody could pack a clean 3-item bag, which would break bluffing, the +200 bait payout and the honesty badge.
- **Scheduler:** the `daily-post` entry is added to `devvit.json` in the same change as its handler (milestone 1B).
- **Share grid:** 🟩 = correct PASS, 🟥 = correct BUST, ⬛ = wrong call. Busted callouts are real usernames only (NPCs are never called out), max 2 plus "+N".
- **Honesty window:** "last 7 days" = today plus the 6 previous UTC days.
- **25% cut rounding:** `Math.round` (650 → 163).
