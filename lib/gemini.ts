import { GoogleGenerativeAI } from "@google/generative-ai";

export interface SubmissionForAnalysis {
  code: string;
  language: string;
  status: string;
  timestamp: number;
  runtime?: string;
  memory?: string;
}

export interface ProblemForAnalysis {
  title: string;
  description: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

export async function analyzeSubmissionHistory(
  problem: ProblemForAnalysis,
  submissions: SubmissionForAnalysis[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  // Sort submissions chronologically (oldest first)
  const sortedSubmissions = [...submissions].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const hasAccepted = sortedSubmissions.some((s) => s.status === "Accepted");

  // Build submission history text
  const submissionHistory = sortedSubmissions
    .map((sub, index) => {
      const runtimeInfo = sub.runtime ? `Runtime: ${sub.runtime}` : "";
      const memoryInfo = sub.memory ? `Memory: ${sub.memory}` : "";
      const perfInfo = [runtimeInfo, memoryInfo].filter(Boolean).join(" | ");

      return `### Attempt ${index + 1} - ${formatDate(sub.timestamp)} - ${sub.status}
Language: ${sub.language}${perfInfo ? `\n${perfInfo}` : ""}
\`\`\`${sub.language.toLowerCase()}
${sub.code}
\`\`\``;
    })
    .join("\n\n");

  const taskInstructions = hasAccepted
    ? `The user has solved this problem. Please:
1. Describe how their thinking evolved from first attempt to solution
2. Highlight what they learned along the way
3. Suggest any remaining improvements for code quality, efficiency, or edge cases`
    : `The user has not yet solved this problem successfully. Please:
1. Identify the pattern of mistakes or misconceptions across attempts
2. Explain where they seem to be stuck
3. Provide a helpful hint (without giving away the full solution) to guide them forward`;

  const prompt = `You are an expert coding mentor analyzing a student's LeetCode submission history.

**Problem:** ${problem.title}

**Description:**
${stripHtml(problem.description)}

**Submission History (${sortedSubmissions.length} attempts, chronological order):**

${submissionHistory}

**Your Task:**
Analyze how this person's approach to the problem evolved over their ${sortedSubmissions.length} attempt${sortedSubmissions.length > 1 ? "s" : ""}.

${taskInstructions}

Please format your response in markdown with clear sections.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
