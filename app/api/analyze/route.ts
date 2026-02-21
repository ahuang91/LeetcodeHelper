import { NextRequest, NextResponse } from "next/server";
import {
  SubmissionForAnalysis,
  ProblemForAnalysis,
} from "@/lib/ai-clients/ai-helpers";
import { analyzeSubmissionHistory as analyzeWithGemini } from "@/lib/ai-clients/gemini";
import { analyzeSubmissionHistory as analyzeWithClaude } from "@/lib/ai-clients/claude";
import { analyzeSubmissionHistory as analyzeWithOpenAI } from "@/lib/ai-clients/openai";
import type { DeploymentMode, AIProvider } from "../config/route";

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

function getApiKey(
  provider: AIProvider,
  clientProvidedKey?: string
): string | null {
  const deploymentMode: DeploymentMode =
    (process.env.DEPLOYMENT_MODE as DeploymentMode) || "multi-user";

  const envKey = getEnvKey(provider);

  if (deploymentMode === "single-user") {
    // In single-user mode, prefer env var (set by deployer)
    return envKey || clientProvidedKey || null;
  } else {
    // In multi-user mode, prefer client-provided key
    return clientProvidedKey || envKey || null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      problem,
      submissions,
      geminiApiKey,
      anthropicApiKey,
      openaiApiKey,
      provider = "gemini",
    } = body as {
      problem: ProblemForAnalysis;
      submissions: SubmissionForAnalysis[];
      geminiApiKey?: string;
      anthropicApiKey?: string;
      openaiApiKey?: string;
      provider?: AIProvider;
    };

    if (!problem || !submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: "Problem and submissions are required." },
        { status: 400 }
      );
    }

    const clientKeyMap: Record<AIProvider, string | undefined> = {
      gemini: geminiApiKey,
      claude: anthropicApiKey,
      openai: openaiApiKey,
    };
    const clientKey = clientKeyMap[provider];
    const apiKey = getApiKey(provider, clientKey);

    if (!apiKey) {
      const providerNames: Record<AIProvider, string> = {
        gemini: "Gemini",
        claude: "Anthropic",
        openai: "OpenAI",
      };
      return NextResponse.json(
        {
          error: `${providerNames[provider]} API key not configured. Please add your API key on the homepage.`,
        },
        { status: 400 }
      );
    }

    let analysis: string;
    switch (provider) {
      case "gemini":
        analysis = await analyzeWithGemini(problem, submissions, apiKey);
        break;
      case "claude":
        analysis = await analyzeWithClaude(problem, submissions, apiKey);
        break;
      case "openai":
        analysis = await analyzeWithOpenAI(problem, submissions, apiKey);
        break;
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing submissions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to analyze submissions: ${message}` },
      { status: 500 }
    );
  }
}
