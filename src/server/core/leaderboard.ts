import { redis } from '@devvit/web/server';
import type { LeaderboardEntry } from '../../shared/api';
import { keys } from './keys';

type Board = 'officer' | 'smuggler';

const boardKey = (board: Board, day: string) =>
  board === 'officer' ? keys.lbOfficer(day) : keys.lbSmuggler(day);

export const topEntries = async (
  board: Board,
  day: string,
  count: number
): Promise<LeaderboardEntry[]> => {
  const rows = await redis.zRange(boardKey(board, day), 0, count - 1, {
    by: 'rank',
    reverse: true,
  });
  if (rows.length === 0) return [];
  const names = await redis.hMGet(
    keys.names(day),
    rows.map((r) => r.member)
  );
  return rows.map((r, i) => ({
    rank: i + 1,
    username: names[i] ?? 'unknown',
    score: r.score,
  }));
};

export const myEntry = async (
  board: Board,
  day: string,
  userId: string,
  username: string
): Promise<LeaderboardEntry | null> => {
  const key = boardKey(board, day);
  const [score, ascRank, size] = await Promise.all([
    redis.zScore(key, userId),
    redis.zRank(key, userId),
    redis.zCard(key),
  ]);
  if (score === undefined || ascRank === undefined) return null;
  return { rank: size - ascRank, username, score };
};
