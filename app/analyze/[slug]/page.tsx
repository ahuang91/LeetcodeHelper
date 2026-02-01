"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatMarkdown } from "@/lib/markdown";
import {
  getStatusBgColor,
  getStatusBorderColor,
  getStatusRingColor,
  DIFFICULTY_COLORS,
} from "@/lib/status";
import { useCache, CachedSubmissionWithCode } from "@/lib/cache-context";
import { hashSubmissions, formatRelativeTime } from "@/lib/cache-utils";

interface TopicTag {
  name: string;
  slug: string;
  translatedName: string | null;
}

interface ProblemDetails {
  title: string;
  titleSlug: string;
  difficulty: string;
  content: string;
  topicTags: TopicTag[];
}

type SubmissionWithCode = CachedSubmissionWithCode;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const cache = useCache();
  const initializedFromCache = useRef(false);

  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [refreshingSubmissions, setRefreshingSubmissions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [problemExpanded, setProblemExpanded] = useState(true);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<number | null>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [submissionsLastUpdated, setSubmissionsLastUpdated] = useState<number | null>(null);
  const [analysisLastUpdated, setAnalysisLastUpdated] = useState<number | null>(null);
  const [cachedAnalysisHash, setCachedAnalysisHash] = useState<string | null>(null);

  // Hydrate from cache on mount
  useEffect(() => {
    if (initializedFromCache.current || !slug) return;
    initializedFromCache.current = true;

    // Load cached submissions for this problem
    const cachedSubs = cache.getProblemSubmissions(slug);
    if (cachedSubs?.data && cachedSubs.fetchedAt) {
      setSubmissions(cachedSubs.data);
      setSubmissionsLastUpdated(cachedSubs.fetchedAt);
      setLoadingSubmissions(false);
      setRefreshingSubmissions(true); // Will refresh in background
    }

    // Load cached analysis for this problem
    const cachedAnalysis = cache.getAnalysis(slug);
    if (cachedAnalysis) {
      setAnalysis(cachedAnalysis.analysis);
      setAnalysisLastUpdated(cachedAnalysis.fetchedAt);
      setCachedAnalysisHash(cachedAnalysis.submissionsHash);
    }
  }, [slug, cache]);

  const handleSubmissionClick = (submissionId: number) => {
    if (expandedSubmissionId === submissionId) {
      // Clicking the same submission collapses it and expands problem
      setExpandedSubmissionId(null);
      setProblemExpanded(true);
    } else {
      // Clicking a different submission expands it and collapses problem
      setExpandedSubmissionId(submissionId);
      setProblemExpanded(false);
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

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const container = document.getElementById("split-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp between 20% and 80%
      setLeftPaneWidth(Math.min(80, Math.max(20, newWidth)));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    async function fetchData() {
      // Check if we have cached data to determine if this is a background refresh
      const cachedSubs = cache.getProblemSubmissions(slug);
      const isBackgroundRefresh = !!(cachedSubs?.data);

      try {
        if (!isBackgroundRefresh) {
          setLoading(true);
          setLoadingSubmissions(true);
        }
        setRefreshingSubmissions(true);

        // Get submission IDs from sessionStorage (set by submissions page)
        const storedIds = sessionStorage.getItem(`analyze-${slug}`);
        const submissionIds = storedIds ? JSON.parse(storedIds) : null;

        // Build submissions URL with IDs if available
        const submissionsUrl = submissionIds
          ? `/api/submissions/${slug}?ids=${submissionIds.join(",")}`
          : `/api/submissions/${slug}`;

        // Fetch problem and submissions in parallel
        const [problemRes, submissionsRes] = await Promise.all([
          fetch(`/api/problem/${slug}`),
          fetch(submissionsUrl),
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
          const fetchedSubmissions = submissionsData.submissions;
          setSubmissions(fetchedSubmissions);
          setSubmissionsLastUpdated(Date.now());

          // Save to cache
          cache.setProblemSubmissions(slug, fetchedSubmissions);
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

  // Calculate current submissions hash
  const currentSubmissionsHash = submissions.length > 0
    ? hashSubmissions(submissions.map((s) => ({ id: s.id, timestamp: s.timestamp })))
    : null;

  // Check if submissions have changed since last analysis
  const submissionsChanged = !!(
    cachedAnalysisHash &&
    currentSubmissionsHash &&
    cachedAnalysisHash !== currentSubmissionsHash
  );

  const handleAnalyze = async () => {
    if (!problem || submissions.length === 0) return;

    setAnalyzing(true);
    setAnalysis(null);
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
          submissions: submissions.map((s) => ({
            code: s.code,
            language: s.language,
            status: s.status,
            timestamp: s.timestamp,
            runtime: s.runtime,
            memory: s.memory,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setAnalysisLastUpdated(Date.now());

      // Save to cache with current submissions hash
      if (currentSubmissionsHash) {
        cache.setAnalysis(slug, data.analysis, currentSubmissionsHash);
        setCachedAnalysisHash(currentSubmissionsHash);
      }
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

  const hasAccepted = submissions.some((s) => s.status === "Accepted");

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
              <button
                onClick={toggleProblem}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 text-zinc-500 transition-transform ${problemExpanded ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Problem Definition</span>
                </div>
                {problem.topicTags && problem.topicTags.length > 0 && (
                  <div className="flex gap-1">
                    {problem.topicTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.slug}
                        className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {problem.topicTags.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-zinc-400">
                        +{problem.topicTags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {problemExpanded && (
                <div className="mt-3 p-4 bg-white dark:bg-zinc-800 rounded-lg">
                  {/* Topic tags */}
                  {problem.topicTags && problem.topicTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {problem.topicTags.map((tag) => (
                        <span
                          key={tag.slug}
                          className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Problem content */}
                  <div
                    className="prose prose-zinc dark:prose-invert max-w-none prose-sm
                      prose-pre:bg-zinc-100 prose-pre:dark:bg-zinc-900
                      prose-code:text-orange-600 prose-code:dark:text-orange-400
                      prose-img:rounded-lg"
                    dangerouslySetInnerHTML={{ __html: problem.content }}
                  />
                </div>
              )}
            </div>

            {/* Submission History */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Submission History ({submissions.length})
                </h2>
                {submissionsLastUpdated && (
                  <span className="text-xs text-zinc-400">
                    · {formatRelativeTime(submissionsLastUpdated)}
                  </span>
                )}
                {refreshingSubmissions && (
                  <span className="flex items-center gap-1 text-xs text-orange-500">
                    <span className="animate-spin h-3 w-3 border-b border-orange-500 rounded-full"></span>
                    refreshing
                  </span>
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
                  {submissions.map((sub, index) => (
                    <div key={sub.id}>
                      {/* Submission header - clickable */}
                      <button
                        onClick={() => handleSubmissionClick(sub.id)}
                        className={`w-full flex items-center gap-3 rounded-lg p-3 transition-colors bg-white dark:bg-zinc-800 ${
                          expandedSubmissionId === sub.id
                            ? `ring-2 ${getStatusRingColor(sub.status)}`
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
                        }`}
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
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                          {formatDate(sub.timestamp)}
                        </span>
                      </button>

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
                  ))}
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
            {/* Submissions Changed Alert */}
            {submissionsChanged && analysis && !analyzing && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Submissions have changed
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      New submissions detected since last analysis. Re-analyze to get updated insights.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analyze Button */}
            {submissions.length > 0 && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className={`w-full font-medium py-3 px-4 rounded-lg transition-colors mb-6 flex items-center justify-center gap-2 ${
                  submissionsChanged && analysis
                    ? "bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white"
                    : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white"
                }`}
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing {submissions.length} submission{submissions.length > 1 ? "s" : ""}...
                  </>
                ) : submissionsChanged && analysis ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-analyze with Gemini
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Analyze with Gemini
                  </>
                )}
              </button>
            )}

            {/* Analysis Results */}
            {analysis && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Gemini&apos;s Analysis
                  </h3>
                  {hasAccepted ? (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                      Solved
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                      In Progress
                    </span>
                  )}
                  {analysisLastUpdated && (
                    <span className="text-xs text-zinc-400 ml-auto">
                      Analyzed {formatRelativeTime(analysisLastUpdated)}
                    </span>
                  )}
                </div>
                <div
                  className="prose prose-zinc dark:prose-invert prose-sm max-w-none
                    prose-pre:bg-zinc-100 prose-pre:dark:bg-zinc-900
                    prose-code:text-orange-600 prose-code:dark:text-orange-400"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }}
                />
              </div>
            )}

            {/* Empty state when no analysis yet */}
            {!analysis && !analyzing && submissions.length > 0 && (
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
