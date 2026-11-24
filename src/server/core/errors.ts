import type { ApiErrorCode } from '../../shared/api';

export type ErrorStatus = 400 | 401 | 409 | 500;

const STATUS: Record<ApiErrorCode, ErrorStatus> = {
  'logged-out': 401,
  'bad-request': 400,
  'already-packed': 409,
  'not-packed': 409,
  'shift-finished': 409,
  'no-xrays': 409,
  'nothing-left': 409,
  busy: 409,
  server: 500,
};

/** Thrown by core code; routes turn it into an ErrorResponse. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: ErrorStatus;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
  }
}

export const int = (raw: string | null | undefined): number => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? n : 0;
};
