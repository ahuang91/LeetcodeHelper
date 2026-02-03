import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSubmissionHistory as analyzeWithGemini,
  SubmissionForAnalysis,
  ProblemForAnalysis,
} from "@/lib/gemini";
import { analyzeSubmissionHistory as analyzeWithClaude } from "@/lib/claude";
import type { DeploymentMode, AIProvider } from "../config/route";

function getApiKey(
  provider: AIProvider,
  clientProvidedKey?: string
): string | null {
  const deploymentMode: DeploymentMode =
    (process.env.DEPLOYMENT_MODE as DeploymentMode) || "multi-user";

  const envKey =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : process.env.ANTHROPIC_API_KEY;

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
      provider = "gemini",
    } = body as {
      problem: ProblemForAnalysis;
      submissions: SubmissionForAnalysis[];
      geminiApiKey?: string;
      anthropicApiKey?: string;
      provider?: AIProvider;
    };

    if (!problem || !submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: "Problem and submissions are required." },
        { status: 400 }
      );
    }

    const clientKey = provider === "gemini" ? geminiApiKey : anthropicApiKey;
    const apiKey = getApiKey(provider, clientKey);

    if (!apiKey) {
      const providerName = provider === "gemini" ? "Gemini" : "Anthropic";
      return NextResponse.json(
        {
          error: `${providerName} API key not configured. Please add your API key on the homepage.`,
        },
        { status: 400 }
      );
    }

    const analysis =
      provider === "gemini"
        ? await analyzeWithGemini(problem, submissions, apiKey)
        : await analyzeWithClaude(problem, submissions, apiKey);

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
