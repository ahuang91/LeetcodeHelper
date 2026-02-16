import Anthropic from "@anthropic-ai/sdk";
import {
  SubmissionForAnalysis,
  ProblemForAnalysis,
  buildAnalysisPrompt,
} from "./ai-shared";

export type { SubmissionForAnalysis, ProblemForAnalysis };

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 10,
      messages: [{ role: "user", content: "test" }],
    });
    return true;
  } catch {
    return false;
  }
}

export async function analyzeSubmissionHistory(
  problem: ProblemForAnalysis,
  submissions: SubmissionForAnalysis[],
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const prompt = buildAnalysisPrompt(problem, submissions);
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "Unable to generate analysis.";
}
