"use client";

import { formatDate } from "@/lib/date-utils";

interface TopicCardProps {
  name: string;
  problemCount: number;
  solvedCount: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  lastSubmissionDate: number;
  onClick: () => void;
}

export function TopicCard({
  name,
  problemCount,
  solvedCount,
  totalSubmissions,
  acceptedSubmissions,
  lastSubmissionDate,
  onClick,
}: TopicCardProps) {
  const acceptanceRate =
    totalSubmissions > 0
      ? `${Math.round((acceptedSubmissions / totalSubmissions) * 100)}%`
      : "N/A";

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-zinc-800 rounded-lg shadow hover:shadow-md hover:ring-2 hover:ring-orange-500/50 cursor-pointer transition-all p-5"
    >
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
        {name}
      </h3>
      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center justify-between">
          <span>Problems Solved</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {solvedCount} / {problemCount}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Solution Acceptance Rate</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {acceptanceRate}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Last Submission</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {formatDate(lastSubmissionDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
