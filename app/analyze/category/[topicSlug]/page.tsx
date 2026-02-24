"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DIFFICULTY_EMOJI } from "@/lib/status";
import { useCache } from "@/lib/cache-context";
import { mergeSubmissions } from "@/lib/submissions";
import { formatRelativeTime } from "@/lib/date-utils";
import { getCredentials } from "@/lib/credentials-client";
import { useDraggableDivider } from "@/lib/hooks/use-draggable-divider";
import { formatMarkdown } from "@/lib/markdown";
import type { AIProvider, AppConfig } from "@/app/api/config/route";
import type { ProblemWithSubmissions } from "@/lib/ai-clients/ai-helpers";
import { ProblemDefinition } from "@/app/components/ProblemDefinition";
import { SubmissionsList } from "@/app/components/SubmissionsList";
import type { TopicTag } from "@/app/components/ProblemDefinition";

interface CategoryProblemEntry {
  title: string;
  titleSlug: string;
  difficulty: string;
  solved: boolean;
  hasFailed: boolean;
  submissionCount: number;
  submissionIds: string[];
}

interface CategoryStoredData {
  topicName: string;
  problems: CategoryProblemEntry[];
}

interface LoadedProblemDetail {
  content: string;
  topicTags: TopicTag[];
}

type FilterMode = "all" | "failed";

export default function CategoryAnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const topicSlug = params.topicSlug as string;
  const cache = useCache();
  const initializedFromCache = useRef(false);

  const [topicName, setTopicName] = useState("");
  const [problems, setProblems] = useState<CategoryProblemEntry[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{
    fetched: number;
    total: number;
  } | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisProvider, setAnalysisProvider] = useState<AIProvider | null>(null);
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Per-problem expansion state
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [expandedDefinitions, setExpandedDefinitions] = useState<Set<string>>(new Set());
  const [expandedSubmissionSections, setExpandedSubmissionSections] = useState<Set<string>>(new Set());
  const [expandedSubmissionIds, setExpandedSubmissionIds] = useState<Map<string, number | null>>(new Map());
  const [problemDetails, setProblemDetails] = useState<Map<string, LoadedProblemDetail>>(new Map());
  const [loadingProblemSlugs, setLoadingProblemSlugs] = useState<Set<string>>(new Set());

  const { leftPaneWidth, handleMouseDown } = useDraggableDivider({
    containerId: "split-container",
  });

  // Load stored category data from sessionStorage on mount
  useEffect(() => {
    if (!topicSlug) return;
    const stored = sessionStorage.getItem(`category-analyze-${topicSlug}`);
    if (!stored) {
      router.push("/submissions");
      return;
    }
    try {
      const data: CategoryStoredData = JSON.parse(stored);
      setTopicName(data.topicName);
      setProblems(data.problems);
    } catch {
      router.push("/submissions");
    }
  }, [topicSlug, router]);

  // Fetch app config
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: AppConfig) => {
        setConfig(data);
        if (data.availableProviders.length > 0) {
          setSelectedProvider(data.availableProviders[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Hydrate from cache
  useEffect(() => {
    if (initializedFromCache.current || !topicSlug || !cache.isHydrated) return;
    initializedFromCache.current = true;
    const cached = cache.getCategoryAnalysis(topicSlug);
    if (cached) {
      setAnalysis(cached.analysis);
      setAnalysisProvider(cached.provider ?? null);
      if (cached.filteredMode) setFilterMode(cached.filteredMode);
    }
  }, [topicSlug, cache.isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProblems =
    filterMode === "all" ? problems : problems.filter((p) => p.hasFailed);

  const refreshProblems = async () => {
    const credentials = getCredentials();
    if (!credentials || refreshing) return;

    setRefreshing(true);
    try {
      const updatedProblems = await Promise.all(
        problems.map(async (p) => {
          const cachedSubs = cache.getProblemSubmissions(p.titleSlug);
          const cachedIds = cachedSubs?.data?.map((s) => s.id) ?? [];
          try {
            const res = await fetch(`/api/submissions/${p.titleSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionCookie: credentials.sessionCookie, cachedIds }),
            });
            if (res.status === 401) {
              router.push("/");
              return p;
            }
            if (!res.ok) return p;
            const data = await res.json();
            const merged = mergeSubmissions(cachedSubs?.data ?? [], data.submissions, data.allIds);
            cache.setProblemSubmissions(p.titleSlug, merged);
            return {
              ...p,
              submissionIds: (data.allIds as number[]).map(String),
              submissionCount: data.allIds.length,
              solved: merged.some((s) => s.status === "Accepted"),
              hasFailed: merged.some((s) => s.status !== "Accepted"),
            };
          } catch {
            return p;
          }
        })
      );
      setProblems(updatedProblems);
      setLastRefreshed(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  const fetchProblemData = async (titleSlug: string) => {
    const credentials = getCredentials();
    if (!credentials) return;

    setLoadingProblemSlugs((prev) => new Set([...prev, titleSlug]));
    try {
      const problem = problems.find((p) => p.titleSlug === titleSlug);
      const cachedSubs = cache.getProblemSubmissions(titleSlug);
      const cachedIds = cachedSubs?.data?.map((s) => s.id) ?? [];

      const fetchSubs = !cachedSubs
        ? fetch(`/api/submissions/${titleSlug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionCookie: credentials.sessionCookie,
              ids: problem?.submissionIds,
              cachedIds,
            }),
          })
        : null;

      const [problemRes, subsRes] = await Promise.all([
        fetch(`/api/problem/${titleSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionCookie: credentials.sessionCookie }),
        }),
        fetchSubs,
      ]);

      if (problemRes.ok) {
        const details = await problemRes.json();
        setProblemDetails((prev) =>
          new Map(prev).set(titleSlug, {
            content: details.content,
            topicTags: details.topicTags ?? [],
          })
        );
      }

      if (subsRes?.ok) {
        const data = await subsRes.json();
        const merged = mergeSubmissions([], data.submissions, data.allIds);
        cache.setProblemSubmissions(titleSlug, merged);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingProblemSlugs((prev) => {
        const next = new Set(prev);
        next.delete(titleSlug);
        return next;
      });
    }
  };

  const handleToggleProblem = (titleSlug: string) => {
    setExpandedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(titleSlug)) {
        next.delete(titleSlug);
      } else {
        next.add(titleSlug);
        // Auto-expand submissions section, fetch data if needed
        setExpandedSubmissionSections((s) => new Set([...s, titleSlug]));
        if (!problemDetails.has(titleSlug)) {
          fetchProblemData(titleSlug);
        }
      }
      return next;
    });
  };

  const handleToggleDefinition = (titleSlug: string) => {
    setExpandedDefinitions((prev) => {
      const next = new Set(prev);
      if (next.has(titleSlug)) next.delete(titleSlug);
      else next.add(titleSlug);
      return next;
    });
  };

  const handleToggleSubmissionSection = (titleSlug: string) => {
    setExpandedSubmissionSections((prev) => {
      const next = new Set(prev);
      if (next.has(titleSlug)) next.delete(titleSlug);
      else next.add(titleSlug);
      return next;
    });
  };

  const handleSubmissionClick = (titleSlug: string, submissionId: number) => {
    setExpandedSubmissionIds((prev) => {
      const next = new Map(prev);
      next.set(titleSlug, prev.get(titleSlug) === submissionId ? null : submissionId);
      return next;
    });
  };

  const handleAnalyze = async () => {
    const credentials = getCredentials();
    if (!credentials) {
      router.push("/");
      return;
    }

    setAnalyzing(true);
    setFetchProgress({ fetched: 0, total: filteredProblems.length });
    setError("");

    try {
      // Phase 1: Fetch problem details + submissions in parallel
      let fetched = 0;
      const problemData = await Promise.all(
        filteredProblems.map(async (p) => {
          const cachedSubs = cache.getProblemSubmissions(p.titleSlug);
          const cachedIds = cachedSubs?.data?.map((s) => s.id) ?? [];

          const [problemRes, submissionsRes] = await Promise.all([
            fetch(`/api/problem/${p.titleSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionCookie: credentials.sessionCookie,
              }),
            }),
            fetch(`/api/submissions/${p.titleSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionCookie: credentials.sessionCookie,
                ids: p.submissionIds,
                cachedIds,
              }),
            }),
          ]);

          const problemDetail = problemRes.ok ? await problemRes.json() : null;
          const subsDetail = submissionsRes.ok
            ? await submissionsRes.json()
            : { submissions: [], allIds: [] };

          const merged = mergeSubmissions(
            cachedSubs?.data ?? [],
            subsDetail.submissions,
            subsDetail.allIds
          );
          cache.setProblemSubmissions(p.titleSlug, merged);

          // Store problem details for the UI
          if (problemDetail) {
            setProblemDetails((prev) =>
              new Map(prev).set(p.titleSlug, {
                content: problemDetail.content ?? "",
                topicTags: problemDetail.topicTags ?? [],
              })
            );
          }

          fetched += 1;
          setFetchProgress({ fetched, total: filteredProblems.length });

          return {
            problem: {
              title: p.title,
              description: problemDetail?.content ?? "",
            },
            submissions: merged.map((s) => ({
              code: s.code,
              language: s.language,
              status: s.status,
              timestamp: s.timestamp,
              runtime: s.runtime,
              memory: s.memory,
            })),
            solved: p.solved,
          } satisfies ProblemWithSubmissions;
        })
      );

      // Phase 2: Run AI analysis
      setFetchProgress(null);

      const response = await fetch("/api/analyze/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName,
          problems: problemData,
          provider: selectedProvider,
          geminiApiKey: credentials.geminiApiKey,
          anthropicApiKey: credentials.anthropicApiKey,
          openaiApiKey: credentials.openaiApiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setAnalysisProvider(selectedProvider);

      cache.setCategoryAnalysis(topicSlug, {
        analysis: data.analysis,
        fetchedAt: Date.now(),
        provider: selectedProvider,
        problemCount: filteredProblems.length,
        filteredMode: filterMode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
      setFetchProgress(null);
    }
  };

  const providerLabel = (p: AIProvider) =>
    p === "gemini" ? "Gemini" : p === "claude" ? "Claude" : "ChatGPT";

  const providerBadgeColor = (p: AIProvider) =>
    p === "gemini"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : p === "claude"
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/submissions"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {topicName || "Category Analysis"}
          </h1>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Category Analysis
          </span>
        </div>
      </div>

      {/* Two-pane layout */}
      <div id="split-container" className="flex h-[calc(100vh-73px)]">
        {/* Left pane — Problem list */}
        <div
          className="overflow-y-auto"
          style={{ width: `${leftPaneWidth}%` }}
        >
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Problems
                </h2>
                {lastRefreshed && (
                  <span className="text-xs text-zinc-400">
                    · {formatRelativeTime(lastRefreshed)}
                  </span>
                )}
                <button
                  onClick={refreshProblems}
                  disabled={refreshing || analyzing}
                  title="Refresh submissions"
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 transition-colors"
                >
                  <svg
                    className={`w-4 h-4 ${refreshing ? "animate-spin text-orange-500" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Filter toggle */}
              <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 w-fit mb-4">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filterMode === "all"
                      ? "bg-orange-500 text-white"
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                  }`}
                >
                  All problems
                </button>
                <button
                  onClick={() => setFilterMode("failed")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filterMode === "failed"
                      ? "bg-orange-500 text-white"
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                  }`}
                >
                  Failed only
                </button>
              </div>

              {/* Problem list */}
              {filteredProblems.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No problems match the current filter.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredProblems.map((p) => {
                    const isExpanded = expandedProblems.has(p.titleSlug);
                    const isLoading = loadingProblemSlugs.has(p.titleSlug);
                    const details = problemDetails.get(p.titleSlug);
                    const submissions = cache.getProblemSubmissions(p.titleSlug)?.data ?? [];
                    const isDefinitionExpanded = expandedDefinitions.has(p.titleSlug);
                    const isSubmissionSectionExpanded = expandedSubmissionSections.has(p.titleSlug);
                    const expandedSubId = expandedSubmissionIds.get(p.titleSlug) ?? null;

                    return (
                      <div
                        key={p.titleSlug}
                        className="rounded-lg bg-white dark:bg-zinc-800 overflow-hidden"
                      >
                        {/* Problem header row */}
                        <button
                          onClick={() => handleToggleProblem(p.titleSlug)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                        >
                          <svg
                            className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-base leading-none flex-shrink-0">
                            {DIFFICULTY_EMOJI[p.difficulty] ?? "❓"}
                          </span>
                          <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {p.title}
                          </span>
                          <span className="text-xs text-zinc-400 flex-shrink-0">
                            {p.submissionCount} sub{p.submissionCount !== 1 ? "s" : ""}
                          </span>
                          {p.solved ? (
                            <svg
                              className="w-4 h-4 text-green-500 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-red-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>

                        {/* Expandable content */}
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-700 space-y-2 pt-2">
                            {isLoading ? (
                              <div className="flex items-center gap-2 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 flex-shrink-0" />
                                Loading problem data...
                              </div>
                            ) : (
                              <>
                                {/* Problem Definition */}
                                {details ? (
                                  <ProblemDefinition
                                    content={details.content}
                                    topicTags={details.topicTags}
                                    expanded={isDefinitionExpanded}
                                    onToggle={() => handleToggleDefinition(p.titleSlug)}
                                  />
                                ) : (
                                  <p className="text-xs text-zinc-400 py-1 px-3">
                                    Problem definition unavailable — run analysis to load it.
                                  </p>
                                )}

                                {/* Submissions section */}
                                <div>
                                  <button
                                    onClick={() => handleToggleSubmissionSection(p.titleSlug)}
                                    className="w-full flex items-center gap-2 p-3 bg-white dark:bg-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                    <svg
                                      className={`w-4 h-4 text-zinc-500 transition-transform ${isSubmissionSectionExpanded ? "rotate-90" : ""}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                      Submissions
                                    </span>
                                    <span className="text-xs text-zinc-400">
                                      ({submissions.length})
                                    </span>
                                  </button>

                                  {isSubmissionSectionExpanded && (
                                    <div className="mt-2 space-y-2">
                                      {submissions.length === 0 ? (
                                        <p className="text-xs text-zinc-400 px-3 py-1">
                                          No submissions loaded — run analysis to load them.
                                        </p>
                                      ) : (
                                        <SubmissionsList
                                          submissions={submissions}
                                          expandedSubmissionId={expandedSubId}
                                          onSubmissionClick={(id) =>
                                            handleSubmissionClick(p.titleSlug, id)
                                          }
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                {filteredProblems.length} problem
                {filteredProblems.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
        </div>

        {/* Resizable divider */}
        <div
          className="w-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-orange-400 dark:hover:bg-orange-500 cursor-col-resize transition-colors flex-shrink-0"
          onMouseDown={handleMouseDown}
        />

        {/* Right pane — Analysis */}
        <div
          className="bg-zinc-100 dark:bg-zinc-800/50 overflow-y-auto"
          style={{ width: `${100 - leftPaneWidth}%` }}
        >
          <div className="p-6">
            {/* Provider selector + Analyze button */}
            <div className="flex gap-2 mb-6">
              <select
                value={selectedProvider}
                onChange={(e) =>
                  setSelectedProvider(e.target.value as AIProvider)
                }
                disabled={analyzing}
                className="px-3 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
              >
                {config?.availableProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {providerLabel(provider)}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || filteredProblems.length === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {fetchProgress
                      ? `Fetching ${fetchProgress.fetched} / ${fetchProgress.total}...`
                      : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Analyze {filteredProblems.length} problem
                    {filteredProblems.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>

            {/* Loading progress */}
            {analyzing && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 mb-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3" />
                {fetchProgress ? (
                  <>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Fetching problem data...
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                      {fetchProgress.fetched} / {fetchProgress.total} problems
                    </p>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (fetchProgress.fetched / fetchProgress.total) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Running AI analysis...
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      This may take a moment for large categories.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Analysis result */}
            {analysis && !analyzing && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-6">
                {analysisProvider && (
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${providerBadgeColor(analysisProvider)}`}
                    >
                      {providerLabel(analysisProvider)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {filteredProblems.length} problem
                      {filteredProblems.length !== 1 ? "s" : ""} analyzed
                    </span>
                  </div>
                )}
                <div
                  className="prose prose-zinc dark:prose-invert max-w-none prose-sm"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }}
                />
              </div>
            )}

            {/* Empty state */}
            {!analysis && !analyzing && (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">Ready to analyze</p>
                <p className="text-sm">
                  Select a filter above and click &ldquo;Analyze{" "}
                  {filteredProblems.length} problem
                  {filteredProblems.length !== 1 ? "s" : ""}&rdquo; to get AI
                  insights across the {topicName} category.
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
