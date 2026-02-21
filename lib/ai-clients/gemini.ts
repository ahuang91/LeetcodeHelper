import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SubmissionForAnalysis,
  ProblemForAnalysis,
  buildSingleProblemAnalysisPrompt,
} from "./ai-helpers";

export type { SubmissionForAnalysis, ProblemForAnalysis };

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    await model.generateContent("test");
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
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = buildSingleProblemAnalysisPrompt(problem, submissions);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
