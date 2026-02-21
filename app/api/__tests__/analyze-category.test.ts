import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai-clients/gemini", () => ({
  analyzeCategorySubmissions: vi.fn(),
}));
vi.mock("@/lib/ai-clients/claude", () => ({
  analyzeCategorySubmissions: vi.fn(),
}));
vi.mock("@/lib/ai-clients/openai", () => ({
  analyzeCategorySubmissions: vi.fn(),
}));

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
    delete process.env.DEPLOYMENT_MODE;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
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
    const { data, status } = await callPOST({
      ...validBody,
      topicName: "   ",
    });
    expect(status).toBe(400);
    expect(data.error).toContain("topicName");
  });

  it("returns 400 when problems is missing", async () => {
    const { data, status } = await callPOST({
      topicName: "DP",
      geminiApiKey: "key",
    });
    expect(status).toBe(400);
    expect(data.error).toContain("problems");
  });

  it("returns 400 when problems is empty array", async () => {
    const { data, status } = await callPOST({
      ...validBody,
      problems: [],
    });
    expect(status).toBe(400);
    expect(data.error).toContain("problems");
  });

  it("returns 400 when no API key is available", async () => {
    const { data, status } = await callPOST({
      topicName: "DP",
      problems: validBody.problems,
      provider: "gemini",
    });
    expect(status).toBe(400);
    expect(data.error).toContain("API key");
  });

  it("routes to gemini provider and returns analysis", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/gemini");
    vi.mocked(analyzeCategorySubmissions).mockResolvedValue("Category analysis result");

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(200);
    expect(data.analysis).toBe("Category analysis result");
    expect(analyzeCategorySubmissions).toHaveBeenCalledWith(
      validBody.topicName,
      validBody.problems,
      "test-gemini-key"
    );
  });

  it("routes to claude provider", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/claude");
    vi.mocked(analyzeCategorySubmissions).mockResolvedValue("Claude category analysis");

    const { data, status } = await callPOST({
      ...validBody,
      provider: "claude",
      anthropicApiKey: "test-claude-key",
    });
    expect(status).toBe(200);
    expect(data.analysis).toBe("Claude category analysis");
  });

  it("routes to openai provider", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/openai");
    vi.mocked(analyzeCategorySubmissions).mockResolvedValue("OpenAI category analysis");

    const { data, status } = await callPOST({
      ...validBody,
      provider: "openai",
      openaiApiKey: "test-openai-key",
    });
    expect(status).toBe(200);
    expect(data.analysis).toBe("OpenAI category analysis");
  });

  it("returns 500 when provider throws an error", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/gemini");
    vi.mocked(analyzeCategorySubmissions).mockRejectedValue(new Error("API rate limit"));

    const { data, status } = await callPOST(validBody);
    expect(status).toBe(500);
    expect(data.error).toContain("API rate limit");
  });

  it("prefers env API key in single-user mode", async () => {
    process.env.DEPLOYMENT_MODE = "single-user";
    process.env.GEMINI_API_KEY = "env-gemini-key";

    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/gemini");
    vi.mocked(analyzeCategorySubmissions).mockResolvedValue("analysis");

    await callPOST({
      topicName: "DP",
      problems: validBody.problems,
      provider: "gemini",
      // No client key
    });
    expect(analyzeCategorySubmissions).toHaveBeenCalledWith(
      "DP",
      validBody.problems,
      "env-gemini-key"
    );
  });

  it("prefers client key in multi-user mode", async () => {
    process.env.GEMINI_API_KEY = "env-key";

    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/gemini");
    vi.mocked(analyzeCategorySubmissions).mockResolvedValue("analysis");

    await callPOST({
      ...validBody,
      geminiApiKey: "client-key",
    });
    expect(analyzeCategorySubmissions).toHaveBeenCalledWith(
      validBody.topicName,
      validBody.problems,
      "client-key"
    );
  });
});
