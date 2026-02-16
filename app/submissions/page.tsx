"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStatusBadgeColor, DIFFICULTY_EMOJI } from "@/lib/status";
import {
  useCache,
  CachedSubmission,
  TimeWindow as CacheTimeWindow,
} from "@/lib/cache-context";
import { formatRelativeTime } from "@/lib/cache-utils";
import { getCredentials } from "@/lib/credentials-client";

type Submission = CachedSubmission;

interface SubmissionsResponse {
  submissions: Submission[];
  username: string;
}

interface TopicTag {
  name: string;
  slug: string;
}

interface GroupedProblem {
  title: string;
  titleSlug: string;
  submissions: Submission[];
  lastSubmissionDate: number;
  solved: boolean;
  difficulty: string;
  topicTags: TopicTag[];
}

interface TopicGroup {
  tag: TopicTag;
  problems: GroupedProblem[];
  lastSubmissionDate: number;
}

type TimeWindow = CacheTimeWindow;

const TIME_WINDOWS: Record<TimeWindow, { label: string; ms: number }> = {
  week: { label: "Last Week", ms: 7 * 24 * 60 * 60 * 1000 },
  month: { label: "Last Month", ms: 30 * 24 * 60 * 60 * 1000 },
  year: { label: "Last Year", ms: 365 * 24 * 60 * 60 * 1000 },
};

export default function SubmissionsPage() {
  const router = useRouter();
  const cache = useCache();

  // Initialize from cache or defaults
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("week");
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<TopicGroup | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Hydrate from cache on mount (wait for cache to be hydrated from sessionStorage)
  useEffect(() => {
    if (!cache.isHydrated || initialized) return;

    // Restore last selected time window
    const savedTimeWindow = cache.getLastSelectedTimeWindow();

    // Load cached data for that time window
    const cached = cache.getSubmissionsList(savedTimeWindow);
    if (cached) {
      setSubmissions(cached.data || []);
      setUsername(cached.username || "");
      setLastUpdated(cached.fetchedAt);
      setLoading(false);
      // Start background refresh
      setRefreshing(true);
    }

    // Set time window and mark as initialized in one batch
    setTimeWindow(savedTimeWindow);
    setInitialized(true);
  }, [cache.isHydrated, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  const BATCH_SIZE = 5;
  const LIMIT = 20;

  const fetchAllSubmissions = useCallback(async (window: TimeWindow, isBackgroundRefresh = false) => {
    const credentials = getCredentials();
    if (!credentials) {
      router.push("/");
      return;
    }

    const cutoffTime = Date.now() - TIME_WINDOWS[window].ms;
    const allSubmissions: Submission[] = [];
    let currentOffset = 0;
    let fetchedUsername = credentials.username;

    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setRefreshing(true);
      setError("");

      while (true) {
        const promises = Array.from({ length: BATCH_SIZE }, (_, i) =>
          fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionCookie: credentials.sessionCookie,
              username: credentials.username,
              limit: LIMIT,
              offset: currentOffset + i * LIMIT,
            }),
          })
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
          fetchedUsername = results[0].username;
          setUsername(fetchedUsername);
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
      setLastUpdated(Date.now());

      // Save to cache
      cache.setSubmissionsList(filtered, fetchedUsername, window);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, cache]);

  // Fetch on mount or when time window changes (wait for initialization to complete)
  useEffect(() => {
    // Wait for initialization to complete (which includes cache hydration)
    if (!initialized) return;

    // If we have cached data for this time window, do a background refresh
    const cached = cache.getSubmissionsList(timeWindow);
    const hasCachedDataForWindow = !!cached;
    fetchAllSubmissions(timeWindow, hasCachedDataForWindow);
  }, [initialized, timeWindow]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeWindowChange = (newWindow: TimeWindow) => {
    // Save selection to cache
    cache.setLastSelectedTimeWindow(newWindow);

    // Check if we have cached data for the new time window
    const cached = cache.getSubmissionsList(newWindow);
    if (cached) {
      // Use cached data immediately
      setSubmissions(cached.data || []);
      setUsername(cached.username || "");
      setLastUpdated(cached.fetchedAt);
      setExpandedProblems(new Set());
      setSelectedTopic(null);
    } else {
      // Clear and show loading
      setSubmissions([]);
      setExpandedProblems(new Set());
      setSelectedTopic(null);
    }
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
          topicTags: (submission.topicTags || []).map((t) => ({ name: t.name, slug: t.slug })),
        });
      }
    }

    // Sort by last submission date (most recent first)
    return Array.from(groups.values()).sort(
      (a, b) => b.lastSubmissionDate - a.lastSubmissionDate
    );
  }, [submissions]);

  const topicGroups = useMemo((): TopicGroup[] => {
    const tagMap = new Map<string, TopicGroup>();

    for (const problem of groupedProblems) {
      const tags = problem.topicTags.length > 0
        ? problem.topicTags
        : [{ name: "Uncategorized", slug: "uncategorized" }];

      for (const tag of tags) {
        const existing = tagMap.get(tag.slug);
        if (existing) {
          existing.problems.push(problem);
          if (problem.lastSubmissionDate > existing.lastSubmissionDate) {
            existing.lastSubmissionDate = problem.lastSubmissionDate;
          }
        } else {
          tagMap.set(tag.slug, {
            tag,
            problems: [problem],
            lastSubmissionDate: problem.lastSubmissionDate,
          });
        }
      }
    }

    const groups = Array.from(tagMap.values()).sort(
      (a, b) => b.lastSubmissionDate - a.lastSubmissionDate
    );
    for (const group of groups) {
      group.problems.sort(
        (a, b) => b.lastSubmissionDate - a.lastSubmissionDate
      );
    }
    return groups;
  }, [groupedProblems]);

  const closeModal = () => {
    setSelectedTopic(null);
    setExpandedProblems(new Set());
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedTopic) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedTopic) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedTopic]);

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
              Showing {groupedProblems.length} {groupedProblems.length === 1 ? "problem" : "problems"} across {topicGroups.length} {topicGroups.length === 1 ? "topic" : "topics"} for <strong>{username}</strong>
              {lastUpdated && (
                <span className="ml-2 text-sm text-zinc-400">
                  · Updated {formatRelativeTime(lastUpdated)}
                  {refreshing && (
                    <span className="ml-1 inline-flex items-center gap-1">
                      <span className="animate-spin h-3 w-3 border-b border-orange-500 rounded-full inline-block"></span>
                      <span className="text-orange-500">refreshing</span>
                    </span>
                  )}
                </span>
              )}
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

        {topicGroups.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No submissions found. Please select a different time window.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicGroups.map((topicGroup) => (
                <div
                  key={topicGroup.tag.slug}
                  onClick={() => setSelectedTopic(topicGroup)}
                  className="bg-white dark:bg-zinc-800 rounded-lg shadow hover:shadow-md hover:ring-2 hover:ring-orange-500/50 cursor-pointer transition-all p-5"
                >
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                    {topicGroup.tag.name}
                  </h3>
                  <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>Problems Solved</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {topicGroup.problems.filter((p) => p.solved).length} / {topicGroup.problems.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Solution Acceptance Rate</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {(() => {
                          const total = topicGroup.problems.reduce((sum, p) => sum + p.submissions.length, 0);
                          const accepted = topicGroup.problems.reduce((sum, p) => sum + p.submissions.filter((s) => s.statusDisplay === "Accepted").length, 0);
                          return total > 0 ? `${Math.round((accepted / total) * 100)}%` : "N/A";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Submission</span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {formatDate(topicGroup.lastSubmissionDate.toString())}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Topic modal */}
            {selectedTopic && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={closeModal}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedTopic.tag.name}
                      <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                        ({selectedTopic.problems.length} {selectedTopic.problems.length === 1 ? "problem" : "problems"})
                      </span>
                    </h2>
                    <button
                      onClick={closeModal}
                      aria-label="Close"
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal body */}
                  <div className="overflow-y-auto flex-1">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Problem
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Difficulty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Submissions
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Last Submission
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Solved
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        {selectedTopic.problems.map((problem) => {
                          const isProblemExpanded = expandedProblems.has(problem.titleSlug);
                          return (
                            <Fragment key={problem.titleSlug}>
                              <tr
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer"
                                onClick={() => toggleProblem(problem.titleSlug)}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <svg
                                      className={`w-4 h-4 text-zinc-400 transition-transform flex-shrink-0 ${isProblemExpanded ? "rotate-90" : ""}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <a
                                      href={`https://leetcode.com/problems/${problem.titleSlug}/`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-zinc-900 dark:text-zinc-100 hover:text-orange-500 font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {problem.title}
                                    </a>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-lg">
                                  {DIFFICULTY_EMOJI[problem.difficulty] || DIFFICULTY_EMOJI.Unknown}
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                  {problem.submissions.length}
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                  {formatDate(problem.lastSubmissionDate.toString())}
                                </td>
                                <td className="px-4 py-3">
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
                                <td className="px-4 py-3">
                                  <button
                                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors whitespace-nowrap"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const submissionIds = problem.submissions.map((s) => s.id);
                                      sessionStorage.setItem(
                                        `analyze-${problem.titleSlug}`,
                                        JSON.stringify(submissionIds)
                                      );
                                      router.push(`/analyze/${problem.titleSlug}`);
                                    }}
                                  >
                                    Analyze
                                  </button>
                                </td>
                              </tr>
                              {isProblemExpanded && (
                                <tr>
                                  <td colSpan={6} className="px-0 py-0">
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
                                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(submission.statusDisplay)}`}
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
                </div>
              </div>
            )}

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
