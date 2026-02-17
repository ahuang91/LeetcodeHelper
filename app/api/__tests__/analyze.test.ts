import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI provider modules
vi.mock("@/lib/gemini", () => ({
  analyzeSubmissionHistory: vi.fn(),
}));
vi.mock("@/lib/claude", () => ({
  analyzeSubmissionHistory: vi.fn(),
}));
vi.mock("@/lib/openai", () => ({
  analyzeSubmissionHistory: vi.fn(),
}));

// Mock next/server
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
    delete process.env.DEPLOYMENT_MODE;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  async function callPOST(body: unknown) {
    const { POST } = await import("../analyze/route");
    // Create a mock NextRequest
    const request = { json: async () => body } as any;
    const response = await POST(request);
    return { data: await response.json(), status: response.status };
  }

  it("returns 400 when problem is missing", async () => {
    const { data, status } = await callPOST({
      submissions: validBody.submissions,
    });
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

  it("returns 400 when no API key is available", async () => {
    const { data, status } = await callPOST({
      problem: validBody.problem,
      submissions: validBody.submissions,
      provider: "gemini",
      // No API key provided
    });
    expect(status).toBe(400);
    expect(data.error).toContain("API key");
  });

  it("routes to gemini provider and returns analysis", async () => {
    const { analyzeSubmissionHistory } = await import("@/lib/gemini");
    vi.mocked(analyzeSubmissionHistory).mockResolvedValue(
      "Great job on Two Sum!"
    );

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(200);
    expect(data.analysis).toBe("Great job on Two Sum!");
    expect(analyzeSubmissionHistory).toHaveBeenCalled();
  });

  it("routes to claude provider", async () => {
    const { analyzeSubmissionHistory } = await import("@/lib/claude");
    vi.mocked(analyzeSubmissionHistory).mockResolvedValue("Claude analysis");

    const { data, status } = await callPOST({
      ...validBody,
      provider: "claude",
      anthropicApiKey: "test-key",
    });
    expect(status).toBe(200);
    expect(data.analysis).toBe("Claude analysis");
  });

  it("routes to openai provider", async () => {
    const { analyzeSubmissionHistory } = await import("@/lib/openai");
    vi.mocked(analyzeSubmissionHistory).mockResolvedValue("OpenAI analysis");

    const { data, status } = await callPOST({
      ...validBody,
      provider: "openai",
      openaiApiKey: "test-key",
    });
    expect(status).toBe(200);
    expect(data.analysis).toBe("OpenAI analysis");
  });

  it("returns 500 when provider throws an error", async () => {
    const { analyzeSubmissionHistory } = await import("@/lib/gemini");
    vi.mocked(analyzeSubmissionHistory).mockRejectedValue(
      new Error("API rate limit")
    );

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(500);
    expect(data.error).toContain("API rate limit");
  });
});
