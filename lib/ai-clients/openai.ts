import OpenAI from "openai";
import {
  SubmissionForAnalysis,
  ProblemForAnalysis,
  buildSingleProblemAnalysisPrompt,
} from "./ai-helpers";

export type { SubmissionForAnalysis, ProblemForAnalysis };

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAI({ apiKey });
    await client.chat.completions.create({
      model: "gpt-5-mini",
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
  const client = new OpenAI({ apiKey });

  const prompt = buildSingleProblemAnalysisPrompt(problem, submissions);
  const response = await client.chat.completions.create({
    model: "gpt-5-mini",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0]?.message?.content || "Unable to generate analysis.";
}
