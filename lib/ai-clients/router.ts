import {
  SubmissionForAnalysis,
  ProblemForAnalysis,
  ProblemWithSubmissions,
} from "./ai-helpers";
import {
  analyzeSubmissionHistory as geminiAnalyze,
  analyzeCategorySubmissions as geminiAnalyzeCategory,
} from "./gemini";
import {
  analyzeSubmissionHistory as claudeAnalyze,
  analyzeCategorySubmissions as claudeAnalyzeCategory,
} from "./claude";
import {
  analyzeSubmissionHistory as openaiAnalyze,
  analyzeCategorySubmissions as openaiAnalyzeCategory,
} from "./openai";

export type AIProvider = "gemini" | "claude" | "openai";
export type DeploymentMode = "single-user" | "multi-user";

export interface Credentials {
  geminiApiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

export const providerNames: Record<AIProvider, string> = {
  gemini: "Gemini",
  claude: "Anthropic",
  openai: "OpenAI",
};

export class ApiKeyError extends Error {
  constructor(provider: AIProvider) {
    super(
      `${providerNames[provider]} API key not configured. Please add your API key on the homepage.`
    );
    this.name = "ApiKeyError";
  }
}

function getEnvKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "claude":
      return process.env.ANTHROPIC_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
  }
}

function getClientKey(
  provider: AIProvider,
  credentials: Credentials
): string | undefined {
  const map: Record<AIProvider, string | undefined> = {
    gemini: credentials.geminiApiKey,
    claude: credentials.anthropicApiKey,
    openai: credentials.openaiApiKey,
  };
  return map[provider];
}

export function resolveApiKey(
  provider: AIProvider,
  credentials: Credentials
): string | null {
  const deploymentMode: DeploymentMode =
    (process.env.DEPLOYMENT_MODE as DeploymentMode) || "multi-user";

  const envKey = getEnvKey(provider);
  const clientKey = getClientKey(provider, credentials);

  if (deploymentMode === "single-user") {
    return envKey || clientKey || null;
  } else {
    return clientKey || envKey || null;
  }
}

export async function analyzeSubmissions(
  provider: AIProvider,
  credentials: Credentials,
  problem: ProblemForAnalysis,
  submissions: SubmissionForAnalysis[]
): Promise<string> {
  const apiKey = resolveApiKey(provider, credentials);
  if (!apiKey) throw new ApiKeyError(provider);

  switch (provider) {
    case "gemini":
      return geminiAnalyze(problem, submissions, apiKey);
    case "claude":
      return claudeAnalyze(problem, submissions, apiKey);
    case "openai":
      return openaiAnalyze(problem, submissions, apiKey);
  }
}

export async function analyzeCategorySubmissions(
  provider: AIProvider,
  credentials: Credentials,
  topicName: string,
  problems: ProblemWithSubmissions[]
): Promise<string> {
  const apiKey = resolveApiKey(provider, credentials);
  if (!apiKey) throw new ApiKeyError(provider);

  switch (provider) {
    case "gemini":
      return geminiAnalyzeCategory(topicName, problems, apiKey);
    case "claude":
      return claudeAnalyzeCategory(topicName, problems, apiKey);
    case "openai":
      return openaiAnalyzeCategory(topicName, problems, apiKey);
  }
}
