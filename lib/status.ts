/**
 * LeetCode submission status constants and color mappings.
 * Centralizes status-related styling across the application.
 */

// Valid submission status strings
export type SubmissionStatus =
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Runtime Error"
  | "Compile Error"
  | "Output Limit Exceeded"
  | "Internal Error";

// Track unknown statuses to avoid duplicate warnings
const warnedStatuses = new Set<string>();

function warnUnknownStatus(status: string, context: string): void {
  if (process.env.NODE_ENV === "development" && !warnedStatuses.has(status)) {
    warnedStatuses.add(status);
    console.warn(
      `[status.ts] Unknown submission status: "${status}" in ${context}. ` +
      `LeetCode API may have added a new status type.`
    );
  }
}

// Background colors for status indicators (dots, simple backgrounds)
const STATUS_BG_COLORS: Record<string, string> = {
  "Accepted": "bg-green-500",
  "Wrong Answer": "bg-red-500",
  "Time Limit Exceeded": "bg-yellow-500",
  "Memory Limit Exceeded": "bg-yellow-500",
  "Runtime Error": "bg-orange-500",
  "Compile Error": "bg-orange-500",
  "Output Limit Exceeded": "bg-yellow-500",
  "Internal Error": "bg-zinc-500",
};

// Border colors for expanded sections
const STATUS_BORDER_COLORS: Record<string, string> = {
  "Accepted": "border-green-500",
  "Wrong Answer": "border-red-500",
  "Time Limit Exceeded": "border-yellow-500",
  "Memory Limit Exceeded": "border-yellow-500",
  "Runtime Error": "border-orange-500",
  "Compile Error": "border-orange-500",
  "Output Limit Exceeded": "border-yellow-500",
  "Internal Error": "border-zinc-500",
};

// Ring colors for focused/selected states
const STATUS_RING_COLORS: Record<string, string> = {
  "Accepted": "ring-green-500",
  "Wrong Answer": "ring-red-500",
  "Time Limit Exceeded": "ring-yellow-500",
  "Memory Limit Exceeded": "ring-yellow-500",
  "Runtime Error": "ring-orange-500",
  "Compile Error": "ring-orange-500",
  "Output Limit Exceeded": "ring-yellow-500",
  "Internal Error": "ring-zinc-500",
};

// Full badge styles (text + background) for submission status badges
const STATUS_BADGE_COLORS: Record<string, string> = {
  "Accepted": "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  "Wrong Answer": "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  "Time Limit Exceeded": "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  "Memory Limit Exceeded": "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  "Runtime Error": "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
  "Compile Error": "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
  "Output Limit Exceeded": "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  "Internal Error": "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/20",
};

// Difficulty colors
export const DIFFICULTY_COLORS: Record<string, string> = {
  "Easy": "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  "Medium": "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  "Hard": "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
};

export const DIFFICULTY_EMOJI: Record<string, string> = {
  "Easy": "😊",
  "Medium": "😐",
  "Hard": "😭",
  "Unknown": "❓",
};

// Default fallback colors
const DEFAULT_BG = "bg-zinc-400";
const DEFAULT_BORDER = "border-zinc-400";
const DEFAULT_RING = "ring-zinc-400";
const DEFAULT_BADGE = "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700";

/**
 * Get background color class for a submission status.
 * Used for status indicator dots.
 */
export function getStatusBgColor(status: string): string {
  const color = STATUS_BG_COLORS[status];
  if (!color) {
    warnUnknownStatus(status, "getStatusBgColor");
    return DEFAULT_BG;
  }
  return color;
}

/**
 * Get border color class for a submission status.
 * Used for expanded submission sections.
 */
export function getStatusBorderColor(status: string): string {
  const color = STATUS_BORDER_COLORS[status];
  if (!color) {
    warnUnknownStatus(status, "getStatusBorderColor");
    return DEFAULT_BORDER;
  }
  return color;
}

/**
 * Get ring color class for a submission status.
 * Used for focus/selection states.
 */
export function getStatusRingColor(status: string): string {
  const color = STATUS_RING_COLORS[status];
  if (!color) {
    warnUnknownStatus(status, "getStatusRingColor");
    return DEFAULT_RING;
  }
  return color;
}

/**
 * Get badge color classes for a submission status.
 * Includes both text and background colors for badge styling.
 */
export function getStatusBadgeColor(status: string): string {
  const color = STATUS_BADGE_COLORS[status];
  if (!color) {
    warnUnknownStatus(status, "getStatusBadgeColor");
    return DEFAULT_BADGE;
  }
  return color;
}
