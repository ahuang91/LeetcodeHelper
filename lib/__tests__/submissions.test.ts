import { describe, it, expect } from "vitest";
import { mergeSubmissions } from "../submissions";
import type { CachedSubmissionWithCode } from "../cache-context";

function sub(id: number, status = "Accepted", timestamp?: number): CachedSubmissionWithCode {
  return {
    id,
    status,
    language: "Python3",
    timestamp: timestamp ?? id * 1000,
    runtime: "10ms",
    memory: "14MB",
    code: `# code ${id}`,
  };
}

describe("mergeSubmissions", () => {
  it("returns all fresh submissions when cache is empty", () => {
    const fresh = [sub(1), sub(2), sub(3)];
    const result = mergeSubmissions([], fresh, [1, 2, 3]);
    expect(result.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it("returns all cached submissions when there are no new ones", () => {
    const cached = [sub(1), sub(2)];
    const result = mergeSubmissions(cached, [], [1, 2]);
    expect(result.map((s) => s.id)).toEqual([1, 2]);
  });

  it("merges fresh and cached without duplicates", () => {
    const cached = [sub(1), sub(2)];
    const fresh = [sub(3)];
    const result = mergeSubmissions(cached, fresh, [1, 2, 3]);
    expect(result.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it("fresh entry takes precedence over cached entry for the same id", () => {
    const cached = [sub(1, "Wrong Answer")];
    const fresh = [sub(1, "Accepted")];
    const result = mergeSubmissions(cached, fresh, [1]);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("Accepted");
  });

  it("drops cached entries whose id is not in allIds (stale)", () => {
    const cached = [sub(1), sub(2), sub(99)]; // 99 no longer in allIds
    const result = mergeSubmissions(cached, [], [1, 2]);
    expect(result.map((s) => s.id)).toEqual([1, 2]);
    expect(result.find((s) => s.id === 99)).toBeUndefined();
  });

  it("returns empty array when allIds is empty", () => {
    const result = mergeSubmissions([sub(1)], [], []);
    expect(result).toHaveLength(0);
  });

  it("sorts result by timestamp ascending", () => {
    const cached = [sub(3, "Accepted", 3000), sub(1, "Accepted", 1000)];
    const fresh = [sub(2, "Accepted", 2000)];
    const result = mergeSubmissions(cached, fresh, [1, 2, 3]);
    expect(result.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it("handles fresh-only and cached-only subsets in same call", () => {
    const cached = [sub(1), sub(2)];
    const fresh = [sub(3), sub(4)];
    const result = mergeSubmissions(cached, fresh, [1, 2, 3, 4]);
    expect(result.map((s) => s.id)).toEqual([1, 2, 3, 4]);
  });
});
