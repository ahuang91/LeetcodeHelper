import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock next/server before importing the route
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown) => ({
      json: async () => data,
    }),
  },
}));

describe("GET /api/config", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear env vars
    delete process.env.DEPLOYMENT_MODE;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  async function callGET() {
    const { GET } = await import("../config/route");
    const response = await GET();
    return response.json();
  }

  it("defaults to multi-user mode with all providers available", async () => {
    const config = await callGET();

    expect(config.deploymentMode).toBe("multi-user");
    expect(config.availableProviders).toContain("gemini");
    expect(config.availableProviders).toContain("claude");
    expect(config.availableProviders).toContain("openai");
    expect(config.geminiApiKeyConfigured).toBe(false);
    expect(config.anthropicApiKeyConfigured).toBe(false);
    expect(config.openaiApiKeyConfigured).toBe(false);
  });

  it("in single-user mode only lists providers with configured keys", async () => {
    process.env.DEPLOYMENT_MODE = "single-user";
    process.env.GEMINI_API_KEY = "test-key";
    // No anthropic or openai keys

    const config = await callGET();

    expect(config.deploymentMode).toBe("single-user");
    expect(config.geminiApiKeyConfigured).toBe(true);
    expect(config.anthropicApiKeyConfigured).toBe(false);
    expect(config.availableProviders).toContain("gemini");
    expect(config.availableProviders).not.toContain("claude");
    expect(config.availableProviders).not.toContain("openai");
  });

  it("in single-user mode with all keys configured", async () => {
    process.env.DEPLOYMENT_MODE = "single-user";
    process.env.GEMINI_API_KEY = "key1";
    process.env.ANTHROPIC_API_KEY = "key2";
    process.env.OPENAI_API_KEY = "key3";

    const config = await callGET();

    expect(config.availableProviders).toHaveLength(3);
    expect(config.geminiApiKeyConfigured).toBe(true);
    expect(config.anthropicApiKeyConfigured).toBe(true);
    expect(config.openaiApiKeyConfigured).toBe(true);
  });
});
