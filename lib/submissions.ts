import { CachedSubmissionWithCode } from "./cache-context";

/**
 * Merges freshly-fetched submissions with already-cached ones.
 * `allIds` is the server's full list of IDs for this problem/request —
 * cached entries not in that set are dropped (stale), fresh entries
 * take precedence over cached ones for the same ID.
 */
export function mergeSubmissions(
  cached: CachedSubmissionWithCode[],
  fresh: CachedSubmissionWithCode[],
  allIds: number[]
): CachedSubmissionWithCode[] {
  const allIdSet = new Set(allIds);
  const result = new Map<number, CachedSubmissionWithCode>();
  for (const s of cached) {
    if (allIdSet.has(s.id)) result.set(s.id, s);
  }
  for (const s of fresh) {
    result.set(s.id, s);
  }
  return Array.from(result.values()).sort((a, b) => a.timestamp - b.timestamp);
}
