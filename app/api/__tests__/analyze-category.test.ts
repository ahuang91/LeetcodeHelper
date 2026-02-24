import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai-clients/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai-clients/router")>();
  return { ...actual, analyzeCategorySubmissions: vi.fn() };
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

const validProblem = {
  problem: { title: "Two Sum", description: "Given an array..." },
  submissions: [
    {
      code: "def solve(): pass",
      language: "Python",
      status: "Accepted",
      timestamp: 1700000000000,
    },
  ],
  solved: true,
};

const validBody = {
  topicName: "Dynamic Programming",
  problems: [validProblem],
  geminiApiKey: "test-gemini-key",
  provider: "gemini",
};

describe("POST /api/analyze/category", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function callPOST(body: unknown) {
    const { POST } = await import("../analyze/category/route");
    const request = { json: async () => body } as any;
    const response = await POST(request);
    return { data: await response.json(), status: response.status };
  }

  it("returns 400 when topicName is missing", async () => {
    const { data, status } = await callPOST({
      problems: validBody.problems,
      geminiApiKey: "key",
    });
    expect(status).toBe(400);
    expect(data.error).toContain("topicName");
  });

  it("returns 400 when topicName is empty string", async () => {
    const { data, status } = await callPOST({ ...validBody, topicName: "   " });
    expect(status).toBe(400);
    expect(data.error).toContain("topicName");
  });

  it("returns 400 when problems is missing", async () => {
    const { data, status } = await callPOST({ topicName: "DP", geminiApiKey: "key" });
    expect(status).toBe(400);
    expect(data.error).toContain("problems");
  });

  it("returns 400 when problems is empty array", async () => {
    const { data, status } = await callPOST({ ...validBody, problems: [] });
    expect(status).toBe(400);
    expect(data.error).toContain("problems");
  });

  it("returns 400 when router throws ApiKeyError", async () => {
    const { analyzeCategorySubmissions, ApiKeyError } = await import("@/lib/ai-clients/router");
    vi.mocked(analyzeCategorySubmissions).mockRejectedValue(new ApiKeyError("gemini"));

    const { data, status } = await callPOST({
      topicName: "DP",
      problems: validBody.problems,
      provider: "gemini",
    });
    expect(status).toBe(400);
    expect(data.error).toContain("API key");
  });

  it("returns analysis on success", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/router");
    vi.mocked(analyzeCategorySubmissions).mockResolvedValue("Category analysis result");

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(200);
    expect(data.analysis).toBe("Category analysis result");
    expect(analyzeCategorySubmissions).toHaveBeenCalledWith(
      "gemini",
      { geminiApiKey: "test-gemini-key", anthropicApiKey: undefined, openaiApiKey: undefined },
      validBody.topicName,
      validBody.problems
    );
  });

  it("returns 500 when router throws a generic error", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/router");
    vi.mocked(analyzeCategorySubmissions).mockRejectedValue(new Error("API rate limit"));

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(500);
    expect(data.error).toContain("API rate limit");
  });
});
