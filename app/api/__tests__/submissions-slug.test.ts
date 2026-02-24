import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLeetCodeClient,
  fetchSubmissionsForProblem,
  fetchSubmissionDetail,
} from "@/lib/leetcode";
import { POST } from "../submissions/[slug]/route";

vi.mock("@/lib/leetcode", () => ({
  createLeetCodeClient: vi.fn(),
  fetchSubmissionsForProblem: vi.fn(),
  fetchSubmissionDetail: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
    }),
  },
}));

const mockClient = {};
const mockParams = Promise.resolve({ slug: "two-sum" });

function makeDetail(id: number) {
  return {
    statusCode: 10,
    lang: { verboseName: "Python3" },
    timestamp: 1700000 + id,
    runtimeDisplay: "10ms",
    memoryDisplay: "14MB",
    code: `# code for ${id}`,
  };
}

async function callPOST(body: unknown) {
  const request = { json: async () => body } as any;
  const response = await POST(request, { params: mockParams });
  return { data: await response.json(), status: response.status };
}

describe("POST /api/submissions/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createLeetCodeClient).mockResolvedValue(mockClient as any);
    vi.mocked(fetchSubmissionsForProblem).mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ] as any);
    vi.mocked(fetchSubmissionDetail).mockImplementation(async (_, id) =>
      makeDetail(id as number)
    );
  });

  it("returns 401 when sessionCookie is missing", async () => {
    const { data, status } = await callPOST({});
    expect(status).toBe(401);
    expect(data.error).toMatch(/session cookie/i);
  });

  it("fetches details for all submissions when no cachedIds provided", async () => {
    const { data, status } = await callPOST({ sessionCookie: "abc" });
    expect(status).toBe(200);
    expect(data.submissions).toHaveLength(3);
    expect(data.allIds).toEqual([1, 2, 3]);
    expect(vi.mocked(fetchSubmissionDetail)).toHaveBeenCalledTimes(3);
  });

  it("skips detail fetches for IDs already in cachedIds", async () => {
    const { data, status } = await callPOST({
      sessionCookie: "abc",
      cachedIds: [1, 2],
    });
    expect(status).toBe(200);
    // Only submission 3 needed a detail fetch
    expect(vi.mocked(fetchSubmissionDetail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchSubmissionDetail)).toHaveBeenCalledWith(mockClient, 3);
    // Only the newly fetched submission is returned
    expect(data.submissions).toHaveLength(1);
    expect(data.submissions[0].id).toBe(3);
    // allIds still contains every ID found for the problem
    expect(data.allIds).toEqual([1, 2, 3]);
  });

  it("skips all detail fetches when all IDs are cached", async () => {
    const { data, status } = await callPOST({
      sessionCookie: "abc",
      cachedIds: [1, 2, 3],
    });
    expect(status).toBe(200);
    expect(vi.mocked(fetchSubmissionDetail)).not.toHaveBeenCalled();
    expect(data.submissions).toHaveLength(0);
    expect(data.allIds).toEqual([1, 2, 3]);
  });

  it("uses provided ids instead of fetching all for problem", async () => {
    const { data, status } = await callPOST({
      sessionCookie: "abc",
      ids: ["2", "3"],
    });
    expect(status).toBe(200);
    expect(vi.mocked(fetchSubmissionsForProblem)).not.toHaveBeenCalled();
    expect(vi.mocked(fetchSubmissionDetail)).toHaveBeenCalledTimes(2);
    expect(data.allIds).toEqual([2, 3]);
  });

  it("combines provided ids with cachedIds to skip already-known submissions", async () => {
    const { data, status } = await callPOST({
      sessionCookie: "abc",
      ids: ["2", "3"],
      cachedIds: [2],
    });
    expect(status).toBe(200);
    expect(vi.mocked(fetchSubmissionDetail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchSubmissionDetail)).toHaveBeenCalledWith(mockClient, 3);
    expect(data.submissions[0].id).toBe(3);
    expect(data.allIds).toEqual([2, 3]);
  });
});
