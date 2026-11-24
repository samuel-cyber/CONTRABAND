import type {
  ApiErrorCode,
  LeaderboardResponse,
  PackRequest,
  StampRequest,
  StampResponse,
  StateResponse,
  XrayRequest,
  XrayResponse,
} from '../shared/api';

export type FailureCode = ApiErrorCode | 'network';

export class ApiFailure extends Error {
  readonly code: FailureCode;

  constructor(code: FailureCode, message: string) {
    super(message);
    this.code = code;
  }
}

const FRIENDLY: Partial<Record<FailureCode, string>> = {
  network: 'Lost the radio signal. Check your connection.',
  busy: 'The checkpoint is swamped. Try that again.',
  server: 'The X-ray machine jammed. Try again in a moment.',
  'logged-out': 'Log in to clock in.',
};

export const friendlyMessage = (error: unknown): string => {
  if (error instanceof ApiFailure) return FRIENDLY[error.code] ?? error.message;
  return FRIENDLY.server ?? 'Something went wrong.';
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls the server. Only `busy` (a transaction that applied nothing) is
 * retried automatically; anything else is surfaced so the caller can refetch.
 */
const request = async <T>(path: string, body?: unknown): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(
        `/api/${path}`,
        body === undefined
          ? undefined
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
      );
    } catch {
      throw new ApiFailure('network', 'Network error');
    }
    const data = await res.json().catch(() => null);
    if (res.ok && data) return data;
    const code: FailureCode = data?.code ?? (res.ok ? 'server' : 'network');
    if (code === 'busy' && attempt < 2) {
      await sleep(250 * (attempt + 1));
      continue;
    }
    throw new ApiFailure(code, data?.message ?? `HTTP ${res.status}`);
  }
};

export const api = {
  state: () => request<StateResponse>('state'),
  pack: (req: PackRequest) => request<StateResponse>('pack', req),
  xray: (req: XrayRequest) => request<XrayResponse>('xray', req),
  stamp: (req: StampRequest) => request<StampResponse>('stamp', req),
  leaderboard: () => request<LeaderboardResponse>('leaderboard'),
};
