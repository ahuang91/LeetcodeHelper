import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt } from "../ai-shared";
import type { SubmissionForAnalysis, ProblemForAnalysis } from "../ai-shared";

const makeProblem = (
  overrides?: Partial<ProblemForAnalysis>
): ProblemForAnalysis => ({
  title: "Two Sum",
  description: "<p>Given an array of integers...</p>",
  ...overrides,
});

const makeSubmission = (
  overrides?: Partial<SubmissionForAnalysis>
): SubmissionForAnalysis => ({
  code: "def twoSum(nums, target): pass",
  language: "Python",
  status: "Wrong Answer",
  timestamp: 1700000000000,
  ...overrides,
});

describe("buildAnalysisPrompt", () => {
  it("includes the problem title", () => {
    const result = buildAnalysisPrompt(makeProblem(), [makeSubmission()]);
    expect(result).toContain("Two Sum");
  });

  it("strips HTML from the problem description", () => {
    const result = buildAnalysisPrompt(
      makeProblem({ description: "<p>Hello &amp; <strong>world</strong></p>" }),
      [makeSubmission()]
    );
    expect(result).toContain("Hello & world");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<strong>");
  });

  it("sorts submissions chronologically (oldest first)", () => {
    const submissions = [
      makeSubmission({ timestamp: 1700000002000, code: "attempt_2" }),
      makeSubmission({ timestamp: 1700000001000, code: "attempt_1" }),
      makeSubmission({ timestamp: 1700000003000, code: "attempt_3" }),
    ];
    const result = buildAnalysisPrompt(makeProblem(), submissions);

    const idx1 = result.indexOf("attempt_1");
    const idx2 = result.indexOf("attempt_2");
    const idx3 = result.indexOf("attempt_3");
    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
  });

  it("uses accepted instructions when a submission was accepted", () => {
    const submissions = [
      makeSubmission({ status: "Wrong Answer" }),
      makeSubmission({ status: "Accepted", timestamp: 1700000001000 }),
    ];
    const result = buildAnalysisPrompt(makeProblem(), submissions);
    expect(result).toContain("solved this problem");
    expect(result).toContain("improvements");
  });

  it("uses not-solved instructions when no submission was accepted", () => {
    const submissions = [
      makeSubmission({ status: "Wrong Answer" }),
      makeSubmission({ status: "Time Limit Exceeded", timestamp: 1700000001000 }),
    ];
    const result = buildAnalysisPrompt(makeProblem(), submissions);
    expect(result).toContain("not yet solved");
    expect(result).toContain("hint");
  });

  it("includes runtime and memory when provided", () => {
    const submission = makeSubmission({
      runtime: "45 ms",
      memory: "16.2 MB",
    });
    const result = buildAnalysisPrompt(makeProblem(), [submission]);
    expect(result).toContain("Runtime: 45 ms");
    expect(result).toContain("Memory: 16.2 MB");
  });

  it("omits runtime/memory lines when not provided", () => {
    const submission = makeSubmission({ runtime: undefined, memory: undefined });
    const result = buildAnalysisPrompt(makeProblem(), [submission]);
    expect(result).not.toContain("Runtime:");
    expect(result).not.toContain("Memory:");
  });

  it("labels attempts sequentially", () => {
    const submissions = [
      makeSubmission({ timestamp: 1700000001000 }),
      makeSubmission({ timestamp: 1700000002000 }),
    ];
    const result = buildAnalysisPrompt(makeProblem(), submissions);
    expect(result).toContain("Attempt 1");
    expect(result).toContain("Attempt 2");
  });

  it("uses singular 'attempt' in task section for single submission", () => {
    const result = buildAnalysisPrompt(makeProblem(), [makeSubmission()]);
    expect(result).toContain("their 1 attempt.");
  });

  it("uses plural 'attempts' in task section for multiple submissions", () => {
    const submissions = [
      makeSubmission({ timestamp: 1700000001000 }),
      makeSubmission({ timestamp: 1700000002000 }),
    ];
    const result = buildAnalysisPrompt(makeProblem(), submissions);
    expect(result).toContain("their 2 attempts.");
  });
});
