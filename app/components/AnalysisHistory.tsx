"use client";

import { formatMarkdown } from "@/lib/markdown";
import { formatRelativeTime } from "@/lib/date-utils";
import { getStatusBadgeColor } from "@/lib/status";
import type { SingleAnalysis, CachedSubmissionWithCode } from "@/lib/cache-context";

interface AnalysisHistoryProps {
  analysisHistory: SingleAnalysis[];
  expandedAnalysisIndex: number | null;
  onToggleExpanded: (index: number | null) => void;
  submissions: CachedSubmissionWithCode[];
  onSubmissionClick: (submissionId: number, scrollToView: boolean) => void;
}

export function AnalysisHistory({
  analysisHistory,
  expandedAnalysisIndex,
  onToggleExpanded,
  submissions,
  onSubmissionClick,
}: AnalysisHistoryProps) {
  const getSubmissionIndex = (submissionId: number): number => {
    return submissions.findIndex((s) => s.id === submissionId) + 1;
  };

  return (
    <div className="space-y-4">
      {/* Show analyses in reverse order (most recent first) */}
      {[...analysisHistory].reverse().map((entry, reverseIndex) => {
        const originalIndex = analysisHistory.length - 1 - reverseIndex;
        const isExpanded = expandedAnalysisIndex === originalIndex;
        const isLatest = originalIndex === analysisHistory.length - 1;

        return (
          <div key={entry.fetchedAt} className="bg-white dark:bg-zinc-800 rounded-lg overflow-hidden">
            {/* Collapsible header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onToggleExpanded(isExpanded ? null : originalIndex)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleExpanded(isExpanded ? null : originalIndex); } }}
              className="w-full flex items-center gap-2 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
            >
              <svg
                className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Analysis {originalIndex + 1}
              </span>
              {isLatest && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded">
                  Latest
                </span>
              )}
              {entry.provider && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  entry.provider === "gemini"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : entry.provider === "claude"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                }`}>
                  {entry.provider === "gemini" ? "Gemini" : entry.provider === "claude" ? "Claude" : "ChatGPT"}
                </span>
              )}
              {/* Submission tags */}
              <div className="flex items-center gap-1 ml-2">
                {entry.submissionIds.map((subId) => {
                  const subIndex = getSubmissionIndex(subId);
                  const sub = submissions.find((s) => s.id === subId);
                  return (
                    <button
                      key={subId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSubmissionClick(subId, true);
                      }}
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${getStatusBadgeColor(sub?.status || "")} hover:bg-zinc-200 dark:hover:bg-zinc-600`}
                    >
                      #{subIndex}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-zinc-400 ml-auto">
                {formatRelativeTime(entry.fetchedAt)}
              </span>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
                  <span>Submissions analyzed:</span>
                  {entry.submissionIds.map((subId) => {
                    const subIndex = getSubmissionIndex(subId);
                    const sub = submissions.find((s) => s.id === subId);
                    return (
                      <button
                        key={subId}
                        onClick={() => onSubmissionClick(subId, true)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${getStatusBadgeColor(sub?.status || "")} hover:bg-zinc-200 dark:hover:bg-zinc-600`}
                      >
                        #{subIndex} {sub?.status}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="prose prose-zinc dark:prose-invert prose-sm max-w-none
                    prose-pre:bg-zinc-100 prose-pre:dark:bg-zinc-900
                    prose-code:text-orange-600 prose-code:dark:text-orange-400"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(entry.analysis) }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
