import { NextRequest, NextResponse } from "next/server";
import { ProblemWithSubmissions } from "@/lib/ai-clients/ai-helpers";
import { analyzeCategorySubmissions as analyzeWithGemini } from "@/lib/ai-clients/gemini";
import { analyzeCategorySubmissions as analyzeWithClaude } from "@/lib/ai-clients/claude";
import { analyzeCategorySubmissions as analyzeWithOpenAI } from "@/lib/ai-clients/openai";
import type { DeploymentMode, AIProvider } from "../../config/route";

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
    return envKey || clientProvidedKey || null;
  } else {
    return clientProvidedKey || envKey || null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topicName,
      problems,
      geminiApiKey,
      anthropicApiKey,
      openaiApiKey,
      provider = "gemini",
    } = body as {
      topicName: string;
      problems: ProblemWithSubmissions[];
      geminiApiKey?: string;
      anthropicApiKey?: string;
      openaiApiKey?: string;
      provider?: AIProvider;
    };

    if (!topicName || typeof topicName !== "string" || topicName.trim() === "") {
      return NextResponse.json(
        { error: "topicName is required." },
        { status: 400 }
      );
    }

    if (!problems || !Array.isArray(problems) || problems.length === 0) {
      return NextResponse.json(
        { error: "problems array is required and must not be empty." },
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
        analysis = await analyzeWithGemini(topicName, problems, apiKey);
        break;
      case "claude":
        analysis = await analyzeWithClaude(topicName, problems, apiKey);
        break;
      case "openai":
        analysis = await analyzeWithOpenAI(topicName, problems, apiKey);
        break;
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing category submissions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to analyze category: ${message}` },
      { status: 500 }
    );
  }
}
