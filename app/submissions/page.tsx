"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Submission {
  id: string;
  title: string;
  titleSlug: string;
  status: string;
  statusDisplay: string;
  lang: string;
  langName: string;
  timestamp: string;
  runtime: string;
  memory: string;
  difficulty: string;
  runtimePercentile?: number;
  memoryPercentile?: number;
}

interface SubmissionsResponse {
  submissions: Submission[];
  username: string;
}

interface GroupedProblem {
  title: string;
  titleSlug: string;
  submissions: Submission[];
  lastSubmissionDate: number;
  solved: boolean;
  difficulty: string;
}

const STATUS_COLORS: Record<string, string> = {
  Accepted: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  "Wrong Answer": "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  "Time Limit Exceeded": "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  "Memory Limit Exceeded": "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  "Runtime Error": "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
  "Compile Error": "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
};

const DIFFICULTY_EMOJI: Record<string, string> = {
  Easy: "😊",
  Medium: "😐",
  Hard: "😭",
  Unknown: "❓",
};

type TimeWindow = "week" | "month" | "year";

const TIME_WINDOWS: Record<TimeWindow, { label: string; ms: number }> = {
  week: { label: "Last Week", ms: 7 * 24 * 60 * 60 * 1000 },
  month: { label: "Last Month", ms: 30 * 24 * 60 * 60 * 1000 },
  year: { label: "Last Year", ms: 365 * 24 * 60 * 60 * 1000 },
};

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("week");
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());

  const BATCH_SIZE = 5;
  const LIMIT = 20;

  const fetchAllSubmissions = useCallback(async (window: TimeWindow) => {
    const cutoffTime = Date.now() - TIME_WINDOWS[window].ms;
    const allSubmissions: Submission[] = [];
    let currentOffset = 0;

    try {
      setLoading(true);
      setError("");

      while (true) {
        const promises = Array.from({ length: BATCH_SIZE }, (_, i) =>
          fetch(`/api/submissions?limit=${LIMIT}&offset=${currentOffset + i * LIMIT}`)
        );

        const responses = await Promise.all(promises);

        // Check for auth error
        if (responses.some((r) => r.status === 401)) {
          router.push("/");
          return;
        }

        // Check for other errors
        const failedResponse = responses.find((r) => !r.ok);
        if (failedResponse) {
          const data = await failedResponse.json();
          throw new Error(data.error || "Failed to fetch submissions");
        }

        const results: SubmissionsResponse[] = await Promise.all(
          responses.map((r) => r.json())
        );

        // Set username from first response
        if (results[0]?.username) {
          setUsername(results[0].username);
        }

        const batchSubmissions = results.flatMap((r) => r.submissions);
        allSubmissions.push(...batchSubmissions);

        // Stop conditions
        if (batchSubmissions.length < BATCH_SIZE * LIMIT) {
          break;
        }

        const oldestInBatch = Math.min(
          ...batchSubmissions.map((s) => parseInt(s.timestamp))
        );
        if (oldestInBatch < cutoffTime) {
          break;
        }

        currentOffset += BATCH_SIZE * LIMIT;
      }

      // Filter to only submissions within time window
      const filtered = allSubmissions.filter(
        (s) => parseInt(s.timestamp) >= cutoffTime
      );
      setSubmissions(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAllSubmissions(timeWindow);
  }, [fetchAllSubmissions, timeWindow]);

  const handleTimeWindowChange = (newWindow: TimeWindow) => {
    setSubmissions([]);
    setExpandedProblems(new Set());
    setTimeWindow(newWindow);
  };

  const groupedProblems = useMemo((): GroupedProblem[] => {
    const groups = new Map<string, GroupedProblem>();

    for (const submission of submissions) {
      const existing = groups.get(submission.titleSlug);
      if (existing) {
        existing.submissions.push(submission);
        const ts = parseInt(submission.timestamp);
        if (ts > existing.lastSubmissionDate) {
          existing.lastSubmissionDate = ts;
        }
        if (submission.statusDisplay === "Accepted") {
          existing.solved = true;
        }
      } else {
        groups.set(submission.titleSlug, {
          title: submission.title,
          titleSlug: submission.titleSlug,
          submissions: [submission],
          lastSubmissionDate: parseInt(submission.timestamp),
          solved: submission.statusDisplay === "Accepted",
          difficulty: submission.difficulty,
        });
      }
    }

    // Sort by last submission date (most recent first)
    return Array.from(groups.values()).sort(
      (a, b) => b.lastSubmissionDate - a.lastSubmissionDate
    );
  }, [submissions]);

  const toggleProblem = (titleSlug: string) => {
    setExpandedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(titleSlug)) {
        next.delete(titleSlug);
      } else {
        next.add(titleSlug);
      }
      return next;
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">Error</h2>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Link
              href="/"
              className="inline-block bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Go Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Submissions
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Showing submissions for <strong>{username}</strong>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeWindow}
              onChange={(e) => handleTimeWindowChange(e.target.value as TimeWindow)}
              className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {Object.entries(TIME_WINDOWS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Link
              href="/"
              className="text-orange-500 hover:text-orange-600 font-medium"
            >
              Change User
            </Link>
          </div>
        </div>

        {groupedProblems.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No submissions found. Please select a different time window.</p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-8"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Problem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        Difficulty
                        <span className="relative group cursor-help">
                          <span className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">(❓)</span>
                          <span className="absolute left-0 top-6 hidden group-hover:block bg-zinc-800 dark:bg-zinc-700 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                            😊 Easy · 😐 Medium · 😭 Hard
                          </span>
                        </span>
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Last Submission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Solved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
                  {groupedProblems.map((problem) => {
                    const isExpanded = expandedProblems.has(problem.titleSlug);
                    return (
                      <Fragment key={problem.titleSlug}>
                        <tr
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer"
                          onClick={() => toggleProblem(problem.titleSlug)}
                        >
                          <td className="px-6 py-4 text-zinc-500">
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={`https://leetcode.com/problems/${problem.titleSlug}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-900 dark:text-zinc-100 hover:text-orange-500 font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {problem.title}
                            </a>
                          </td>
                          <td className="px-6 py-4 text-lg">
                            {DIFFICULTY_EMOJI[problem.difficulty] || DIFFICULTY_EMOJI.Unknown}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {problem.submissions.length}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatDate(problem.lastSubmissionDate.toString())}
                          </td>
                          <td className="px-6 py-4">
                            {problem.solved ? (
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Store submission IDs for this problem in sessionStorage
                                const submissionIds = problem.submissions.map((s) => s.id);
                                sessionStorage.setItem(
                                  `analyze-${problem.titleSlug}`,
                                  JSON.stringify(submissionIds)
                                );
                                router.push(`/analyze/${problem.titleSlug}`);
                              }}
                            >
                              Analyze Submissions
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="px-0 py-0">
                              <div className="bg-zinc-50 dark:bg-zinc-900/50 px-8 py-4">
                                <table className="min-w-full">
                                  <thead>
                                    <tr className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">
                                      <th className="px-4 py-2 text-left">Status</th>
                                      <th className="px-4 py-2 text-left">Language</th>
                                      <th className="px-4 py-2 text-left">Runtime</th>
                                      <th className="px-4 py-2 text-left">Memory</th>
                                      <th className="px-4 py-2 text-left">Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {problem.submissions
                                      .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
                                      .map((submission, idx) => (
                                        <tr key={`${submission.id}-${idx}`} className="border-t border-zinc-200 dark:border-zinc-700">
                                          <td className="px-4 py-2">
                                            <span
                                              className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                                STATUS_COLORS[submission.statusDisplay] ||
                                                "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700"
                                              }`}
                                            >
                                              {submission.statusDisplay}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            {submission.langName || submission.lang}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            {submission.runtime || "N/A"}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            {submission.memory || "N/A"}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                                            {formatDate(submission.timestamp)}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {loading && (
              <div className="mt-6 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">Loading more submissions...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
