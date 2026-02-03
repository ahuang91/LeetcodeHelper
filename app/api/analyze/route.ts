import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSubmissionHistory,
  SubmissionForAnalysis,
  ProblemForAnalysis,
} from "@/lib/gemini";

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

    // Use provided API key or fall back to environment variable
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
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
