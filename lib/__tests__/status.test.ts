import { describe, it, expect } from "vitest";
import {
  getStatusBgColor,
  getStatusBorderColor,
  getStatusRingColor,
  getStatusBadgeColor,
  DIFFICULTY_COLORS,
  DIFFICULTY_EMOJI,
} from "../status";

const ALL_STATUSES = [
  "Accepted",
  "Wrong Answer",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Runtime Error",
  "Compile Error",
  "Output Limit Exceeded",
  "Internal Error",
];

describe("getStatusBgColor", () => {
  it.each(ALL_STATUSES)('returns a bg- class for "%s"', (status) => {
    expect(getStatusBgColor(status)).toMatch(/^bg-/);
  });

  it("returns Accepted as green", () => {
    expect(getStatusBgColor("Accepted")).toBe("bg-green-500");
  });

  it("returns Wrong Answer as red", () => {
    expect(getStatusBgColor("Wrong Answer")).toBe("bg-red-500");
  });

  it("returns default for unknown status", () => {
    expect(getStatusBgColor("SomeNewStatus")).toBe("bg-zinc-400");
  });
});

describe("getStatusBorderColor", () => {
  it.each(ALL_STATUSES)('returns a border- class for "%s"', (status) => {
    expect(getStatusBorderColor(status)).toMatch(/^border-/);
  });

  it("returns default for unknown status", () => {
    expect(getStatusBorderColor("Unknown")).toBe("border-zinc-400");
  });
});

describe("getStatusRingColor", () => {
  it.each(ALL_STATUSES)('returns a ring- class for "%s"', (status) => {
    expect(getStatusRingColor(status)).toMatch(/^ring-/);
  });

  it("returns default for unknown status", () => {
    expect(getStatusRingColor("Unknown")).toBe("ring-zinc-400");
  });
});

describe("getStatusBadgeColor", () => {
  it.each(ALL_STATUSES)('returns badge classes for "%s"', (status) => {
    const result = getStatusBadgeColor(status);
    expect(result).toContain("text-");
    expect(result).toContain("bg-");
  });

  it("returns default badge for unknown status", () => {
    expect(getStatusBadgeColor("Unknown")).toContain("text-zinc-600");
  });
});

describe("DIFFICULTY_COLORS", () => {
  it("has entries for Easy, Medium, Hard", () => {
    expect(DIFFICULTY_COLORS).toHaveProperty("Easy");
    expect(DIFFICULTY_COLORS).toHaveProperty("Medium");
    expect(DIFFICULTY_COLORS).toHaveProperty("Hard");
  });
});

describe("DIFFICULTY_EMOJI", () => {
  it("has entries for Easy, Medium, Hard, Unknown", () => {
    expect(DIFFICULTY_EMOJI).toHaveProperty("Easy");
    expect(DIFFICULTY_EMOJI).toHaveProperty("Medium");
    expect(DIFFICULTY_EMOJI).toHaveProperty("Hard");
    expect(DIFFICULTY_EMOJI).toHaveProperty("Unknown");
  });
});
