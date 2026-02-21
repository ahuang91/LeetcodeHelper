import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/ai-clients/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geminiApiKey } = body;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    const isValid = await validateApiKey(geminiApiKey.trim());
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Gemini API key. Please check your key and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error validating API key:", error);
    return NextResponse.json(
      { error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}
