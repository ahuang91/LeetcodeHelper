import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSubmissionHistory,
  SubmissionForAnalysis,
  ProblemForAnalysis,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, submissions } = body as {
      problem: ProblemForAnalysis;
      submissions: SubmissionForAnalysis[];
    };

    if (!problem || !submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: "Problem and submissions are required." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const analysis = await analyzeSubmissionHistory(problem, submissions);

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
