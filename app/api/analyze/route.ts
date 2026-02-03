import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSubmissionHistory,
  SubmissionForAnalysis,
  ProblemForAnalysis,
} from "@/lib/gemini";
import type { DeploymentMode } from "../config/route";

function getApiKey(clientProvidedKey?: string): string | null {
  const deploymentMode: DeploymentMode =
    (process.env.DEPLOYMENT_MODE as DeploymentMode) || "multi-user";

  if (deploymentMode === "single-user") {
    // In single-user mode, prefer env var (set by deployer)
    return process.env.GEMINI_API_KEY || clientProvidedKey || null;
  } else {
    // In multi-user mode, prefer client-provided key
    return clientProvidedKey || process.env.GEMINI_API_KEY || null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, submissions, geminiApiKey } = body as {
      problem: ProblemForAnalysis;
      submissions: SubmissionForAnalysis[];
      geminiApiKey?: string;
    };

    if (!problem || !submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: "Problem and submissions are required." },
        { status: 400 }
      );
    }

    const apiKey = getApiKey(geminiApiKey);
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key not configured. Please add your API key on the homepage.",
        },
        { status: 400 }
      );
    }

    const analysis = await analyzeSubmissionHistory(problem, submissions, apiKey);

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
