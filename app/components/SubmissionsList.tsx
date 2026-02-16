"use client";

import {
  getStatusBgColor,
  getStatusBorderColor,
  getStatusRingColor,
} from "@/lib/status";
import { formatDateShort } from "@/lib/date-utils";
import type { CachedSubmissionWithCode } from "@/lib/cache-context";

interface SubmissionsListProps {
  submissions: CachedSubmissionWithCode[];
  selectedSubmissionIds: Set<number>;
  analyzedSubmissionIds: Set<number>;
  expandedSubmissionId: number | null;
  onToggleSelection: (submissionId: number) => void;
  onSubmissionClick: (submissionId: number) => void;
  submissionRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
}

export function SubmissionsList({
  submissions,
  selectedSubmissionIds,
  analyzedSubmissionIds,
  expandedSubmissionId,
  onToggleSelection,
  onSubmissionClick,
  submissionRefs,
}: SubmissionsListProps) {
  return (
    <>
      {submissions.map((sub, index) => {
        const isSelected = selectedSubmissionIds.has(sub.id);
        const wasAnalyzed = analyzedSubmissionIds.has(sub.id);

        return (
          <div
            key={sub.id}
            ref={(el) => {
              if (el) {
                submissionRefs.current.set(sub.id, el);
              } else {
                submissionRefs.current.delete(sub.id);
              }
            }}
          >
            {/* Submission header - clickable */}
            <div
              className={`flex items-center gap-3 rounded-lg p-3 transition-colors bg-white dark:bg-zinc-800 ${
                expandedSubmissionId === sub.id
                  ? `ring-2 ${getStatusRingColor(sub.status)}`
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelection(sub.id);
                }}
                className="w-4 h-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              {/* Expand/collapse button */}
              <button
                onClick={() => onSubmissionClick(sub.id)}
                className="flex items-center gap-3 flex-1"
              >
                <svg
                  className={`w-4 h-4 text-zinc-500 transition-transform ${
                    expandedSubmissionId === sub.id ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div
                  className={`w-2 h-2 rounded-full ${getStatusBgColor(sub.status)}`}
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  #{index + 1}
                </span>
                <span
                  className={`text-sm ${
                    sub.status === "Accepted"
                      ? "text-green-600 dark:text-green-400"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {sub.status}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  {sub.language}
                </span>
                {wasAnalyzed && (
                  <span className="text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-500 px-1.5 py-0.5 rounded">
                    analyzed
                  </span>
                )}
                <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                  {formatDateShort(sub.timestamp)}
                </span>
              </button>
            </div>

            {/* Expanded submission details */}
            {expandedSubmissionId === sub.id && (
              <div className={`mt-2 p-4 bg-white dark:bg-zinc-800 rounded-lg border-l-4 ${getStatusBorderColor(sub.status)}`}>
                {/* Runtime and Memory stats */}
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Runtime: <strong className="text-zinc-900 dark:text-zinc-100">{sub.runtime}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Memory: <strong className="text-zinc-900 dark:text-zinc-100">{sub.memory}</strong>
                    </span>
                  </div>
                </div>

                {/* Code */}
                <div className="relative">
                  <div className="absolute top-2 right-2 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-700 px-2 py-1 rounded">
                    {sub.language}
                  </div>
                  <pre className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 overflow-x-auto text-sm">
                    <code>{sub.code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
