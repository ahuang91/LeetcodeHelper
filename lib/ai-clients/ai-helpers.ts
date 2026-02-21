import { formatDate } from "../date-utils";

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

export interface ProblemWithSubmissions {
  problem: ProblemForAnalysis;
  submissions: SubmissionForAnalysis[];
  solved: boolean;
}

export function buildCategoryAnalysisPrompt(
  topicName: string,
  problems: ProblemWithSubmissions[]
): string {
  const problemSections = problems
    .map((entry, i) => {
      const solvedTag = entry.solved ? "[SOLVED]" : "[UNSOLVED]";
      const sorted = [...entry.submissions].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      const submissionHistory =
        sorted.length === 0
          ? "No submissions recorded for this problem."
          : sorted
              .map((sub, j) => {
                const runtimeInfo = sub.runtime ? `Runtime: ${sub.runtime}` : "";
                const memoryInfo = sub.memory ? `Memory: ${sub.memory}` : "";
                const perfInfo = [runtimeInfo, memoryInfo].filter(Boolean).join(" | ");

                return `### Attempt ${j + 1} - ${formatDate(sub.timestamp)} - ${sub.status}
Language: ${sub.language}${perfInfo ? `\n${perfInfo}` : ""}
\`\`\`${sub.language.toLowerCase()}
${sub.code}
\`\`\``;
              })
              .join("\n\n");

      const attemptCount = sorted.length;
      const attemptLabel =
        attemptCount === 0
          ? ""
          : ` (${attemptCount} attempt${attemptCount !== 1 ? "s" : ""}, chronological)`;

      return `## Problem ${i + 1}: ${entry.problem.title} ${solvedTag}

**Description:**
${stripHtml(entry.problem.description)}

**Submission History${attemptLabel}:**

${submissionHistory}`;
    })
    .join("\n\n---\n\n");

  return `You are an expert coding mentor analyzing a student's LeetCode performance across an entire problem category.

**Category:** ${topicName}
**Problems Analyzed:** ${problems.length}

---

${problemSections}

---

**Your Task:**
Analyze this student's overall performance across all ${problems.length} problem${problems.length !== 1 ? "s" : ""} in the **${topicName}** category.

Structure your response with these sections:

## Category Summary
Briefly describe the overall picture: how many problems attempted, solved vs unsolved, and general performance pattern.

## Patterns of Incorrect Reasoning
Identify recurring mistake types across problems. Look for systematic errors like off-by-one errors, incorrect base cases, forgetting edge cases, misunderstanding problem constraints, or choosing the wrong algorithmic approach.

## Core Weaknesses in This Category
Based on the mistake patterns, what fundamental concepts or techniques does this student not yet have a firm grasp on? Be specific to the ${topicName} category.

## What They Are Doing Well
Identify consistent strengths: correct approach selection, good code structure, effective debugging shown by successive improvements, etc.

## Recommended Focus Areas
Provide 2–4 specific, actionable study recommendations tailored to the identified weaknesses.

Please format your entire response in markdown.`;
}

export function buildSingleProblemAnalysisPrompt(
  problem: ProblemForAnalysis,
  submissions: SubmissionForAnalysis[]
): string {
  const sortedSubmissions = [...submissions].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const hasAccepted = sortedSubmissions.some((s) => s.status === "Accepted");

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

  return `You are an expert coding mentor analyzing a student's LeetCode submission history.

**Problem:** ${problem.title}

**Description:**
${stripHtml(problem.description)}

**Submission History (${sortedSubmissions.length} attempts, chronological order):**

${submissionHistory}

**Your Task:**
Analyze how this person's approach to the problem evolved over their ${sortedSubmissions.length} attempt${sortedSubmissions.length > 1 ? "s" : ""}.

${taskInstructions}

Please format your response in markdown with clear sections.`;
}
