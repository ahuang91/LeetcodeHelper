"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DIFFICULTY_COLORS } from "@/lib/status";
import { useCache, CachedSubmissionWithCode, SingleAnalysis } from "@/lib/cache-context";
import { mergeSubmissions } from "@/lib/submissions";
import { formatRelativeTime } from "@/lib/date-utils";
import { getCredentials } from "@/lib/credentials-client";
import { useDraggableDivider } from "@/lib/hooks/use-draggable-divider";
import type { AIProvider, AppConfig } from "@/app/api/config/route";
import { SubmissionsList } from "@/app/components/SubmissionsList";
import { AnalysisHistory } from "@/app/components/AnalysisHistory";
import { ProblemDefinition } from "@/app/components/ProblemDefinition";

import type { TopicTag } from "@/app/components/ProblemDefinition";

interface ProblemDetails {
  title: string;
  titleSlug: string;
  difficulty: string;
  content: string;
  topicTags: TopicTag[];
}

type SubmissionWithCode = CachedSubmissionWithCode;


export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const cache = useCache();
  const initializedFromCache = useRef(false);
  const submissionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [refreshingSubmissions, setRefreshingSubmissions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<SingleAnalysis[]>([]);
  const [expandedAnalysisIndex, setExpandedAnalysisIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [problemExpanded, setProblemExpanded] = useState(true);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<number | null>(null);
  const { leftPaneWidth, handleMouseDown } = useDraggableDivider({
    containerId: "split-container",
  });
  const [submissionsLastUpdated, setSubmissionsLastUpdated] = useState<number | null>(null);
  const [analyzedSubmissionIds, setAnalyzedSubmissionIds] = useState<Set<number>>(new Set());
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<number>>(new Set());
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Fetch app configuration
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: AppConfig) => {
        setConfig(data);
        // Default to first available provider
        if (data.availableProviders.length > 0) {
          setSelectedProvider(data.availableProviders[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Hydrate from cache on mount (wait for cache to be hydrated first)
  useEffect(() => {
    if (initializedFromCache.current || !slug || !cache.isHydrated) return;
    initializedFromCache.current = true;

    // Load cached submissions for this problem
    const cachedSubs = cache.getProblemSubmissions(slug);
    if (cachedSubs?.data && cachedSubs.fetchedAt) {
      setSubmissions(cachedSubs.data);
      setSubmissionsLastUpdated(cachedSubs.fetchedAt);
      setLoadingSubmissions(false);
      setRefreshingSubmissions(true); // Will refresh in background
    }

    // Load cached analysis history for this problem
    const cachedHistory = cache.getAnalysisHistory(slug);
    if (cachedHistory) {
      setAnalysisHistory(cachedHistory.analyses);
      setAnalyzedSubmissionIds(new Set(cachedHistory.allAnalyzedSubmissionIds));
      // Expand the most recent analysis by default
      if (cachedHistory.analyses.length > 0) {
        setExpandedAnalysisIndex(cachedHistory.analyses.length - 1);
      }
    }
  }, [slug, cache.isHydrated]);

  const handleSubmissionClick = (submissionId: number, scrollToView = false) => {
    if (expandedSubmissionId === submissionId) {
      // Clicking the same submission collapses it and expands problem
      setExpandedSubmissionId(null);
      setProblemExpanded(true);
    } else {
      // Clicking a different submission expands it and collapses problem
      setExpandedSubmissionId(submissionId);
      setProblemExpanded(false);

      // Scroll the submission into view (centered) if requested
      if (scrollToView) {
        requestAnimationFrame(() => {
          const element = submissionRefs.current.get(submissionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
    }
  };

  const toggleProblem = () => {
    if (!problemExpanded) {
      // Expanding problem collapses any open submission
      setProblemExpanded(true);
      setExpandedSubmissionId(null);
    } else {
      setProblemExpanded(false);
    }
  };

  const refreshSubmissions = async () => {
    const credentials = getCredentials();
    if (!credentials || refreshingSubmissions) return;

    const cachedSubs = cache.getProblemSubmissions(slug);
    const cachedIds = cachedSubs?.data?.map((s) => s.id) ?? [];

    setRefreshingSubmissions(true);
    try {
      const res = await fetch(`/api/submissions/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCookie: credentials.sessionCookie, cachedIds }),
      });

      if (res.status === 401) {
        router.push("/");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const merged = mergeSubmissions(cachedSubs?.data ?? [], data.submissions, data.allIds);
        setSubmissions(merged);
        setSubmissionsLastUpdated(Date.now());
        cache.setProblemSubmissions(slug, merged);
      }
    } catch {
      // Silently fail — user can try again
    } finally {
      setRefreshingSubmissions(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const credentials = getCredentials();
      if (!credentials) {
        router.push("/");
        return;
      }

      // Check if we have cached data to determine if this is a background refresh
      const cachedSubs = cache.getProblemSubmissions(slug);
      const isBackgroundRefresh = !!(cachedSubs?.data);
      const cachedIds = cachedSubs?.data?.map((s) => s.id) ?? [];

      try {
        if (!isBackgroundRefresh) {
          setLoading(true);
          setLoadingSubmissions(true);
        }
        setRefreshingSubmissions(true);

        // Get submission IDs from sessionStorage (set by submissions page)
        const storedIds = sessionStorage.getItem(`analyze-${slug}`);
        const submissionIds = storedIds ? JSON.parse(storedIds) : null;

        // Fetch problem and submissions in parallel
        const [problemRes, submissionsRes] = await Promise.all([
          fetch(`/api/problem/${slug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionCookie: credentials.sessionCookie }),
          }),
          fetch(`/api/submissions/${slug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionCookie: credentials.sessionCookie,
              ids: submissionIds,
              cachedIds,
            }),
          }),
        ]);

        if (problemRes.status === 401 || submissionsRes.status === 401) {
          router.push("/");
          return;
        }

        if (!problemRes.ok) {
          const data = await problemRes.json();
          throw new Error(data.error || "Failed to fetch problem");
        }

        const problemData = await problemRes.json();
        setProblem(problemData);
        setLoading(false);

        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json();
          const merged = mergeSubmissions(
            cachedSubs?.data ?? [],
            submissionsData.submissions,
            submissionsData.allIds
          );
          setSubmissions(merged);
          setSubmissionsLastUpdated(Date.now());

          // Save to cache
          cache.setProblemSubmissions(slug, merged);
        }
        setLoadingSubmissions(false);
        setRefreshingSubmissions(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
        setLoadingSubmissions(false);
        setRefreshingSubmissions(false);
      }
    }

    if (slug) {
      fetchData();
    }
  }, [slug, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize selected submissions when submissions load
  // Default: select submissions that haven't been analyzed yet
  useEffect(() => {
    if (submissions.length === 0) return;

    const unanalyzedIds = submissions
      .filter((s) => !analyzedSubmissionIds.has(s.id))
      .map((s) => s.id);

    // If there are unanalyzed submissions, select those by default
    // Otherwise, select all (for re-analysis)
    if (unanalyzedIds.length > 0) {
      setSelectedSubmissionIds(new Set(unanalyzedIds));
    } else if (selectedSubmissionIds.size === 0) {
      // Only set all selected if nothing is selected yet
      setSelectedSubmissionIds(new Set(submissions.map((s) => s.id)));
    }
  }, [submissions, analyzedSubmissionIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if there are new submissions since last analysis
  const hasNewSubmissions = submissions.some((s) => !analyzedSubmissionIds.has(s.id));

  // Count selected submissions
  const selectedCount = selectedSubmissionIds.size;

  // Check if we have any analyses
  const hasAnalyses = analysisHistory.length > 0;

  const handleAnalyze = async () => {
    if (!problem || selectedSubmissionIds.size === 0) return;

    const credentials = getCredentials();
    if (!credentials) {
      router.push("/");
      return;
    }

    // Get the selected submissions
    const selectedSubmissions = submissions.filter((s) =>
      selectedSubmissionIds.has(s.id)
    );

    setAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: {
            title: problem.title,
            description: problem.content,
          },
          submissions: selectedSubmissions.map((s) => ({
            code: s.code,
            language: s.language,
            status: s.status,
            timestamp: s.timestamp,
            runtime: s.runtime,
            memory: s.memory,
          })),
          geminiApiKey: credentials.geminiApiKey,
          anthropicApiKey: credentials.anthropicApiKey,
          openaiApiKey: credentials.openaiApiKey,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze");
      }

      const data = await response.json();
      const analyzedIds = selectedSubmissions.map((s) => s.id);
      const newAnalysis: SingleAnalysis = {
        analysis: data.analysis,
        submissionIds: analyzedIds,
        fetchedAt: Date.now(),
        provider: selectedProvider,
      };

      // Add to local state
      setAnalysisHistory((prev) => [...prev, newAnalysis]);
      setExpandedAnalysisIndex(analysisHistory.length); // Expand the new one
      setAnalyzedSubmissionIds((prev) => new Set([...prev, ...analyzedIds]));

      // Save to cache
      cache.addAnalysis(slug, data.analysis, analyzedIds, selectedProvider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">Error</h2>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Link
              href="/submissions"
              className="inline-block bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Go Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/submissions"
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {problem.title}
            </h1>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                DIFFICULTY_COLORS[problem.difficulty] || "text-zinc-600 bg-zinc-100"
              }`}
            >
              {problem.difficulty}
            </span>
          </div>
          <a
            href={`https://leetcode.com/problems/${problem.titleSlug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:text-orange-600 text-sm font-medium"
          >
            View on LeetCode →
          </a>
        </div>
      </div>

      {/* Two-pane layout */}
      <div id="split-container" className="flex h-[calc(100vh-73px)]">
        {/* Left pane - Problem description and Submissions */}
        <div
          className="overflow-y-auto"
          style={{ width: `${leftPaneWidth}%` }}
        >
          <div className="p-6">
            {/* Collapsible Problem Definition */}
            <div className="mb-6">
              <ProblemDefinition
                content={problem.content}
                topicTags={problem.topicTags}
                expanded={problemExpanded}
                onToggle={toggleProblem}
              />
            </div>

            {/* Submission History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Submission History ({submissions.length})
                  </h2>
                  {submissionsLastUpdated && (
                    <span className="text-xs text-zinc-400">
                      · {formatRelativeTime(submissionsLastUpdated)}
                    </span>
                  )}
                  {!loadingSubmissions && (
                    <button
                      onClick={refreshSubmissions}
                      disabled={refreshingSubmissions}
                      title="Refresh submissions"
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 transition-colors"
                    >
                      <svg
                        className={`w-4 h-4 ${refreshingSubmissions ? "animate-spin text-orange-500" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>
                {submissions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {selectedCount} selected
                    </span>
                    <button
                      onClick={() => setSelectedSubmissionIds(new Set(submissions.map((s) => s.id)))}
                      className="text-xs text-orange-500 hover:text-orange-600"
                    >
                      All
                    </button>
                    <span className="text-zinc-300">|</span>
                    <button
                      onClick={() => setSelectedSubmissionIds(new Set())}
                      className="text-xs text-orange-500 hover:text-orange-600"
                    >
                      None
                    </button>
                  </div>
                )}
              </div>

              {loadingSubmissions ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                  <span>Loading submissions...</span>
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  No submissions found for this problem.
                </p>
              ) : (
                <div className="space-y-2">
                  <SubmissionsList
                    submissions={submissions}
                    selectedSubmissionIds={selectedSubmissionIds}
                    analyzedSubmissionIds={analyzedSubmissionIds}
                    expandedSubmissionId={expandedSubmissionId}
                    onToggleSelection={(id) => {
                      setSelectedSubmissionIds((prev) => {
                        const next = new Set(prev);
                        if (prev.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      });
                    }}
                    onSubmissionClick={handleSubmissionClick}
                    submissionRefs={submissionRefs}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resizable divider */}
        <div
          className="w-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-orange-400 dark:hover:bg-orange-500 cursor-col-resize transition-colors flex-shrink-0"
          onMouseDown={handleMouseDown}
        />

        {/* Right pane - Analysis */}
        <div
          className="bg-zinc-100 dark:bg-zinc-800/50 overflow-y-auto"
          style={{ width: `${100 - leftPaneWidth}%` }}
        >
          <div className="p-6">
            {/* New Submissions Alert */}
            {hasNewSubmissions && hasAnalyses && !analyzing && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      New submissions available
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {submissions.filter((s) => !analyzedSubmissionIds.has(s.id)).length} un-analyzed submission(s) detected. They are pre-selected for analysis.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analyze Button with Provider Dropdown */}
            {submissions.length > 0 && (
              <div className="flex gap-2 mb-6">
                {/* Provider dropdown */}
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                  disabled={analyzing}
                  className="px-3 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                >
                  {config?.availableProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider === "gemini" ? "Gemini" : provider === "claude" ? "Claude" : "ChatGPT"}
                    </option>
                  ))}
                </select>

                {/* Analyze button */}
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || selectedCount === 0}
                  className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    hasNewSubmissions && hasAnalyses
                      ? "bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white"
                      : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white"
                  }`}
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Analyzing {selectedCount} submission{selectedCount > 1 ? "s" : ""}...
                    </>
                  ) : selectedCount === 0 ? (
                    <>Select submissions to analyze</>
                  ) : hasNewSubmissions && hasAnalyses ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Analyze {selectedCount} submission{selectedCount > 1 ? "s" : ""}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Analyze {selectedCount} submission{selectedCount > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Analysis History */}
            {hasAnalyses && (
              <AnalysisHistory
                analysisHistory={analysisHistory}
                expandedAnalysisIndex={expandedAnalysisIndex}
                onToggleExpanded={setExpandedAnalysisIndex}
                submissions={submissions}
                onSubmissionClick={handleSubmissionClick}
              />
            )}

            {/* Empty state when no analysis yet */}
            {!hasAnalyses && !analyzing && submissions.length > 0 && (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-lg font-medium mb-2">Ready to analyze</p>
                <p className="text-sm">Click the button above to get AI-powered insights on your submission history.</p>
              </div>
            )}

            {/* Error message */}
            {error && problem && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
