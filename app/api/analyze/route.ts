import { NextRequest, NextResponse } from "next/server";
import {
  SubmissionForAnalysis,
  ProblemForAnalysis,
} from "@/lib/ai-clients/ai-helpers";
import {
  analyzeSubmissions,
  ApiKeyError,
  type AIProvider,
  type Credentials,
} from "@/lib/ai-clients/router";

export async function POST(request: NextRequest) {
  try {
    const {
      problem,
      submissions,
      geminiApiKey,
      anthropicApiKey,
      openaiApiKey,
      provider = "gemini",
    } = (await request.json()) as {
      problem: ProblemForAnalysis;
      submissions: SubmissionForAnalysis[];
      provider?: AIProvider;
    } & Credentials;

    if (!problem || !submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: "Problem and submissions are required." },
        { status: 400 }
      );
    }

    const analysis = await analyzeSubmissions(
      provider,
      { geminiApiKey, anthropicApiKey, openaiApiKey },
      problem,
      submissions
    );
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof ApiKeyError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Error analyzing submissions:", error);
    return NextResponse.json(
      { error: `Failed to analyze submissions: ${message}` },
      { status: 500 }
    );
  }
}
