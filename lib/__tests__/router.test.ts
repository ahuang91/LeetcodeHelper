import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/ai-clients/gemini", () => ({
  analyzeSubmissionHistory: vi.fn(),
  analyzeCategorySubmissions: vi.fn(),
}));
vi.mock("@/lib/ai-clients/claude", () => ({
  analyzeSubmissionHistory: vi.fn(),
  analyzeCategorySubmissions: vi.fn(),
}));
vi.mock("@/lib/ai-clients/openai", () => ({
  analyzeSubmissionHistory: vi.fn(),
  analyzeCategorySubmissions: vi.fn(),
}));

const problem = { title: "Two Sum", description: "Given an array..." };
const submissions = [
  { code: "def solve(): pass", language: "Python", status: "Accepted", timestamp: 1700000000000 },
];
const problems = [{ problem, submissions, solved: true }];

describe("resolveApiKey", () => {
  afterEach(() => {
    delete process.env.DEPLOYMENT_MODE;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("prefers client key in multi-user mode (default)", async () => {
    process.env.GEMINI_API_KEY = "env-key";
    const { resolveApiKey } = await import("@/lib/ai-clients/router");
    expect(resolveApiKey("gemini", { geminiApiKey: "client-key" })).toBe("client-key");
  });

  it("falls back to env key in multi-user mode when no client key", async () => {
    process.env.GEMINI_API_KEY = "env-key";
    const { resolveApiKey } = await import("@/lib/ai-clients/router");
    expect(resolveApiKey("gemini", {})).toBe("env-key");
  });

  it("prefers env key in single-user mode", async () => {
    process.env.DEPLOYMENT_MODE = "single-user";
    process.env.GEMINI_API_KEY = "env-key";
    const { resolveApiKey } = await import("@/lib/ai-clients/router");
    expect(resolveApiKey("gemini", { geminiApiKey: "client-key" })).toBe("env-key");
  });

  it("falls back to client key in single-user mode when no env key", async () => {
    process.env.DEPLOYMENT_MODE = "single-user";
    const { resolveApiKey } = await import("@/lib/ai-clients/router");
    expect(resolveApiKey("gemini", { geminiApiKey: "client-key" })).toBe("client-key");
  });

  it("returns null when no key is available", async () => {
    const { resolveApiKey } = await import("@/lib/ai-clients/router");
    expect(resolveApiKey("gemini", {})).toBeNull();
  });

  it("maps credentials to the correct provider key", async () => {
    const { resolveApiKey } = await import("@/lib/ai-clients/router");
    const credentials = {
      geminiApiKey: "g-key",
      anthropicApiKey: "a-key",
      openaiApiKey: "o-key",
    };
    expect(resolveApiKey("gemini", credentials)).toBe("g-key");
    expect(resolveApiKey("claude", credentials)).toBe("a-key");
    expect(resolveApiKey("openai", credentials)).toBe("o-key");
  });
});

describe("analyzeSubmissions", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEPLOYMENT_MODE;
  });

  it("throws ApiKeyError when no API key is available", async () => {
    const { analyzeSubmissions, ApiKeyError } = await import("@/lib/ai-clients/router");
    await expect(
      analyzeSubmissions("gemini", {}, problem, submissions)
    ).rejects.toThrow(ApiKeyError);
  });

  it("dispatches to gemini client", async () => {
    const { analyzeSubmissions } = await import("@/lib/ai-clients/router");
    const { analyzeSubmissionHistory } = await import("@/lib/ai-clients/gemini");
    vi.mocked(analyzeSubmissionHistory).mockResolvedValue("gemini result");

    const result = await analyzeSubmissions(
      "gemini",
      { geminiApiKey: "g-key" },
      problem,
      submissions
    );
    expect(result).toBe("gemini result");
    expect(analyzeSubmissionHistory).toHaveBeenCalledWith(problem, submissions, "g-key");
  });

  it("dispatches to claude client", async () => {
    const { analyzeSubmissions } = await import("@/lib/ai-clients/router");
    const { analyzeSubmissionHistory } = await import("@/lib/ai-clients/claude");
    vi.mocked(analyzeSubmissionHistory).mockResolvedValue("claude result");

    const result = await analyzeSubmissions(
      "claude",
      { anthropicApiKey: "a-key" },
      problem,
      submissions
    );
    expect(result).toBe("claude result");
    expect(analyzeSubmissionHistory).toHaveBeenCalledWith(problem, submissions, "a-key");
  });

  it("dispatches to openai client", async () => {
    const { analyzeSubmissions } = await import("@/lib/ai-clients/router");
    const { analyzeSubmissionHistory } = await import("@/lib/ai-clients/openai");
    vi.mocked(analyzeSubmissionHistory).mockResolvedValue("openai result");

    const result = await analyzeSubmissions(
      "openai",
      { openaiApiKey: "o-key" },
      problem,
      submissions
    );
    expect(result).toBe("openai result");
    expect(analyzeSubmissionHistory).toHaveBeenCalledWith(problem, submissions, "o-key");
  });
});

describe("analyzeCategorySubmissions", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEPLOYMENT_MODE;
  });

  it("throws ApiKeyError when no API key is available", async () => {
    const { analyzeCategorySubmissions, ApiKeyError } = await import("@/lib/ai-clients/router");
    await expect(
      analyzeCategorySubmissions("gemini", {}, "Dynamic Programming", problems)
    ).rejects.toThrow(ApiKeyError);
  });

  it("dispatches to gemini client", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/router");
    const { analyzeCategorySubmissions: geminiFn } = await import("@/lib/ai-clients/gemini");
    vi.mocked(geminiFn).mockResolvedValue("gemini category result");

    const result = await analyzeCategorySubmissions(
      "gemini",
      { geminiApiKey: "g-key" },
      "DP",
      problems
    );
    expect(result).toBe("gemini category result");
    expect(geminiFn).toHaveBeenCalledWith("DP", problems, "g-key");
  });

  it("dispatches to claude client", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/router");
    const { analyzeCategorySubmissions: claudeFn } = await import("@/lib/ai-clients/claude");
    vi.mocked(claudeFn).mockResolvedValue("claude category result");

    const result = await analyzeCategorySubmissions(
      "claude",
      { anthropicApiKey: "a-key" },
      "DP",
      problems
    );
    expect(result).toBe("claude category result");
    expect(claudeFn).toHaveBeenCalledWith("DP", problems, "a-key");
  });

  it("dispatches to openai client", async () => {
    const { analyzeCategorySubmissions } = await import("@/lib/ai-clients/router");
    const { analyzeCategorySubmissions: openaiFn } = await import("@/lib/ai-clients/openai");
    vi.mocked(openaiFn).mockResolvedValue("openai category result");

    const result = await analyzeCategorySubmissions(
      "openai",
      { openaiApiKey: "o-key" },
      "DP",
      problems
    );
    expect(result).toBe("openai category result");
    expect(openaiFn).toHaveBeenCalledWith("DP", problems, "o-key");
  });
});
