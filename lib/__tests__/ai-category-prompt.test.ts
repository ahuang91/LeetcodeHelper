import { describe, it, expect } from "vitest";
import {
  buildCategoryAnalysisPrompt,
} from "../ai-clients/ai-helpers";
import type {
  ProblemWithSubmissions,
  SubmissionForAnalysis,
  ProblemForAnalysis,
} from "../ai-clients/ai-helpers";

const makeProblem = (overrides?: Partial<ProblemForAnalysis>): ProblemForAnalysis => ({
  title: "Two Sum",
  description: "<p>Given an array of integers...</p>",
  ...overrides,
});

const makeSubmission = (overrides?: Partial<SubmissionForAnalysis>): SubmissionForAnalysis => ({
  code: "def twoSum(nums, target): pass",
  language: "Python",
  status: "Wrong Answer",
  timestamp: 1700000000000,
  ...overrides,
});

const makeProblemEntry = (
  overrides?: Partial<ProblemWithSubmissions>
): ProblemWithSubmissions => ({
  problem: makeProblem(),
  submissions: [makeSubmission()],
  solved: false,
  ...overrides,
});

describe("buildCategoryAnalysisPrompt", () => {
  it("includes the topic name in the prompt", () => {
    const result = buildCategoryAnalysisPrompt("Dynamic Programming", [makeProblemEntry()]);
    expect(result).toContain("Dynamic Programming");
  });

  it("includes the problem count", () => {
    const problems = [makeProblemEntry(), makeProblemEntry()];
    const result = buildCategoryAnalysisPrompt("Arrays", problems);
    expect(result).toContain("2");
  });

  it("includes each problem title", () => {
    const problems = [
      makeProblemEntry({ problem: makeProblem({ title: "Two Sum" }) }),
      makeProblemEntry({ problem: makeProblem({ title: "Coin Change" }) }),
    ];
    const result = buildCategoryAnalysisPrompt("Dynamic Programming", problems);
    expect(result).toContain("Two Sum");
    expect(result).toContain("Coin Change");
  });

  it("marks solved problems as [SOLVED]", () => {
    const problem = makeProblemEntry({
      solved: true,
      submissions: [makeSubmission({ status: "Accepted" })],
    });
    const result = buildCategoryAnalysisPrompt("Arrays", [problem]);
    expect(result).toContain("[SOLVED]");
    expect(result).not.toContain("[UNSOLVED]");
  });

  it("marks unsolved problems as [UNSOLVED]", () => {
    const problem = makeProblemEntry({
      solved: false,
      submissions: [makeSubmission({ status: "Wrong Answer" })],
    });
    const result = buildCategoryAnalysisPrompt("Arrays", [problem]);
    expect(result).toContain("[UNSOLVED]");
    expect(result).not.toContain("[SOLVED]");
  });

  it("strips HTML from problem descriptions", () => {
    const problem = makeProblemEntry({
      problem: makeProblem({ description: "<p>Hello &amp; <strong>world</strong></p>" }),
    });
    const result = buildCategoryAnalysisPrompt("Arrays", [problem]);
    expect(result).toContain("Hello & world");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<strong>");
  });

  it("sorts submissions within each problem chronologically", () => {
    const problem = makeProblemEntry({
      submissions: [
        makeSubmission({ timestamp: 1700000003000, code: "attempt_3" }),
        makeSubmission({ timestamp: 1700000001000, code: "attempt_1" }),
        makeSubmission({ timestamp: 1700000002000, code: "attempt_2" }),
      ],
    });
    const result = buildCategoryAnalysisPrompt("Arrays", [problem]);
    const idx1 = result.indexOf("attempt_1");
    const idx2 = result.indexOf("attempt_2");
    const idx3 = result.indexOf("attempt_3");
    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
  });

  it("handles a problem with zero submissions gracefully", () => {
    const problem = makeProblemEntry({ submissions: [] });
    expect(() => buildCategoryAnalysisPrompt("Arrays", [problem])).not.toThrow();
    const result = buildCategoryAnalysisPrompt("Arrays", [problem]);
    expect(result).toContain("No submissions recorded");
  });

  it("restarts attempt numbering at 1 for each problem", () => {
    const problems = [
      makeProblemEntry({
        problem: makeProblem({ title: "Two Sum" }),
        submissions: [
          makeSubmission({ timestamp: 1700000001000 }),
          makeSubmission({ timestamp: 1700000002000 }),
        ],
      }),
      makeProblemEntry({
        problem: makeProblem({ title: "Coin Change" }),
        submissions: [makeSubmission({ timestamp: 1700000003000 })],
      }),
    ];
    const result = buildCategoryAnalysisPrompt("DP", problems);
    // "Attempt 1" should appear at least twice (once per problem)
    const matches = result.match(/### Attempt 1/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("includes all five task section headers", () => {
    const result = buildCategoryAnalysisPrompt("Arrays", [makeProblemEntry()]);
    expect(result).toContain("## Category Summary");
    expect(result).toContain("## Patterns of Incorrect Reasoning");
    expect(result).toContain("## Core Weaknesses in This Category");
    expect(result).toContain("## What They Are Doing Well");
    expect(result).toContain("## Recommended Focus Areas");
  });

  it("includes runtime and memory when provided", () => {
    const problem = makeProblemEntry({
      submissions: [makeSubmission({ runtime: "45 ms", memory: "16.2 MB" })],
    });
    const result = buildCategoryAnalysisPrompt("Arrays", [problem]);
    expect(result).toContain("Runtime: 45 ms");
    expect(result).toContain("Memory: 16.2 MB");
  });

  it("omits runtime/memory lines when not provided", () => {
    const problem = makeProblemEntry({
      submissions: [makeSubmission({ runtime: undefined, memory: undefined })],
    });
    const result = buildCategoryAnalysisPrompt("Arrays", [problem]);
    expect(result).not.toContain("Runtime:");
    expect(result).not.toContain("Memory:");
  });

  it("numbers problems sequentially (Problem 1, Problem 2, ...)", () => {
    const problems = [
      makeProblemEntry({ problem: makeProblem({ title: "Two Sum" }) }),
      makeProblemEntry({ problem: makeProblem({ title: "Coin Change" }) }),
      makeProblemEntry({ problem: makeProblem({ title: "Climbing Stairs" }) }),
    ];
    const result = buildCategoryAnalysisPrompt("DP", problems);
    expect(result).toContain("## Problem 1:");
    expect(result).toContain("## Problem 2:");
    expect(result).toContain("## Problem 3:");
  });
});
