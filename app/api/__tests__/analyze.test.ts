import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai-clients/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai-clients/router")>();
  return { ...actual, analyzeSubmissions: vi.fn() };
});

vi.mock("next/server", () => ({
  NextRequest: class {
    private body: unknown;
    constructor(body: unknown) {
      this.body = body;
    }
    async json() {
      return this.body;
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
    }),
  },
}));

const validBody = {
  problem: { title: "Two Sum", description: "Given an array..." },
  submissions: [
    {
      code: "def solve(): pass",
      language: "Python",
      status: "Accepted",
      timestamp: 1700000000000,
    },
  ],
  geminiApiKey: "test-gemini-key",
  provider: "gemini",
};

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function callPOST(body: unknown) {
    const { POST } = await import("../analyze/route");
    const request = { json: async () => body } as any;
    const response = await POST(request);
    return { data: await response.json(), status: response.status };
  }

  it("returns 400 when problem is missing", async () => {
    const { data, status } = await callPOST({ submissions: validBody.submissions });
    expect(status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("returns 400 when submissions is empty", async () => {
    const { data, status } = await callPOST({
      problem: validBody.problem,
      submissions: [],
    });
    expect(status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("returns 400 when router throws ApiKeyError", async () => {
    const { analyzeSubmissions, ApiKeyError } = await import("@/lib/ai-clients/router");
    vi.mocked(analyzeSubmissions).mockRejectedValue(new ApiKeyError("gemini"));

    const { data, status } = await callPOST({
      problem: validBody.problem,
      submissions: validBody.submissions,
      provider: "gemini",
    });
    expect(status).toBe(400);
    expect(data.error).toContain("API key");
  });

  it("returns analysis on success", async () => {
    const { analyzeSubmissions } = await import("@/lib/ai-clients/router");
    vi.mocked(analyzeSubmissions).mockResolvedValue("Great job on Two Sum!");

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(200);
    expect(data.analysis).toBe("Great job on Two Sum!");
    expect(analyzeSubmissions).toHaveBeenCalledWith(
      "gemini",
      { geminiApiKey: "test-gemini-key", anthropicApiKey: undefined, openaiApiKey: undefined },
      validBody.problem,
      validBody.submissions
    );
  });

  it("returns 500 when router throws a generic error", async () => {
    const { analyzeSubmissions } = await import("@/lib/ai-clients/router");
    vi.mocked(analyzeSubmissions).mockRejectedValue(new Error("API rate limit"));

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(500);
    expect(data.error).toContain("API rate limit");
  });
});
