import { NextRequest, NextResponse } from "next/server";
import { ProblemWithSubmissions } from "@/lib/ai-clients/ai-helpers";
import {
  analyzeCategorySubmissions,
  ApiKeyError,
  type AIProvider,
  type Credentials,
} from "@/lib/ai-clients/router";

export async function POST(request: NextRequest) {
  try {
    const {
      topicName,
      problems,
      geminiApiKey,
      anthropicApiKey,
      openaiApiKey,
      provider = "gemini",
    } = (await request.json()) as {
      topicName: string;
      problems: ProblemWithSubmissions[];
      provider?: AIProvider;
    } & Credentials;

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

    const analysis = await analyzeCategorySubmissions(
      provider,
      { geminiApiKey, anthropicApiKey, openaiApiKey },
      topicName,
      problems
    );
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof ApiKeyError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Error analyzing category submissions:", error);
    return NextResponse.json(
      { error: `Failed to analyze category: ${message}` },
      { status: 500 }
    );
  }
}
