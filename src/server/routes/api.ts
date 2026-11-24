import { Hono, type Context } from 'hono';
import type {
  ErrorResponse,
  LeaderboardResponse,
  StampResponse,
  StateResponse,
  XrayResponse,
} from '../../shared/api';
import { LEADERBOARD_SIZE } from '../../shared/balance';
import { isStampAction } from '../../shared/scoring';
import { getToday } from '../core/day';
import { ApiError } from '../core/errors';
import { myEntry, topEntries } from '../core/leaderboard';
import { getIdentity, type Identity } from '../core/player';
import { buildReport, packBag, stampCurrent, xrayCurrent } from '../core/shift';
import { toShiftView } from '../core/shiftMachine';
import { buildState } from '../core/state';

export const api = new Hono();

type Body = Record<string, unknown>;

const readBody = async (c: Context): Promise<Body> => {
  try {
    const body: unknown = await c.req.json();
    return typeof body === 'object' && body !== null ? { ...body } : {};
  } catch {
    return {};
  }
};

const requireUser = async (): Promise<Identity> => {
  const ident = await getIdentity();
  if (!ident) throw new ApiError('logged-out', 'Log in to clock in.');
  return ident;
};

const requireStep = (body: Body): number => {
  const step = body.step;
  if (typeof step !== 'number' || !Number.isInteger(step)) {
    throw new ApiError('bad-request', 'Missing bag step.');
  }
  return step;
};

const fail = (c: Context, error: unknown) => {
  if (error instanceof ApiError) {
    return c.json<ErrorResponse>(
      { status: 'error', code: error.code, message: error.message },
      error.status
    );
  }
  console.error('Unhandled API error', error);
  return c.json<ErrorResponse>(
    { status: 'error', code: 'server', message: 'Something went wrong.' },
    500
  );
};

api.get('/state', async (c) => {
  try {
    const today = getToday();
    const ident = await getIdentity();
    return c.json<StateResponse>(await buildState(ident, today));
  } catch (error) {
    return fail(c, error);
  }
});

api.post('/pack', async (c) => {
  try {
    const ident = await requireUser();
    const today = getToday();
    const body = await readBody(c);
    await packBag(ident, today, {
      itemIds: body.itemIds,
      labelId: body.labelId,
    });
    return c.json<StateResponse>(await buildState(ident, today));
  } catch (error) {
    return fail(c, error);
  }
});

api.post('/xray', async (c) => {
  try {
    const ident = await requireUser();
    const body = await readBody(c);
    const today = getToday();
    const { state, bag, itemId } = await xrayCurrent(
      ident,
      today,
      requireStep(body)
    );
    return c.json<XrayResponse>({
      type: 'xray',
      itemId,
      shift: toShiftView(state, bag),
    });
  } catch (error) {
    return fail(c, error);
  }
});

api.post('/stamp', async (c) => {
  try {
    const ident = await requireUser();
    const body = await readBody(c);
    const action = body.action;
    if (!isStampAction(action)) {
      throw new ApiError('bad-request', 'Stamp PASS or BUST.');
    }
    const today = getToday();
    const out = await stampCurrent(ident, today, action, requireStep(body));
    return c.json<StampResponse>({
      type: 'stamp',
      reveal: out.reveal,
      shift: toShiftView(out.state, out.nextBag),
      report: out.streak
        ? await buildReport(ident, today, out.state, out.streak)
        : null,
    });
  } catch (error) {
    return fail(c, error);
  }
});

api.get('/leaderboard', async (c) => {
  try {
    const today = getToday();
    const ident = await getIdentity();
    const [officer, smuggler, myOfficer, mySmuggler] = await Promise.all([
      topEntries('officer', today.day, LEADERBOARD_SIZE),
      topEntries('smuggler', today.day, LEADERBOARD_SIZE),
      ident
        ? myEntry('officer', today.day, ident.userId, ident.username)
        : null,
      ident
        ? myEntry('smuggler', today.day, ident.userId, ident.username)
        : null,
    ]);
    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      dayKey: today.day,
      officer,
      smuggler,
      myOfficer,
      mySmuggler,
    });
  } catch (error) {
    return fail(c, error);
  }
});
