"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// Types for cached data
export interface CachedSubmission {
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

export interface CachedSubmissionWithCode {
  id: number;
  status: string;
  language: string;
  timestamp: number;
  runtime: string;
  memory: string;
  code: string;
}

export type TimeWindow = "week" | "month" | "year";

export interface TimeWindowCache {
  data: CachedSubmission[] | null;
  username: string | null;
  fetchedAt: number | null;
}

type SubmissionsListCache = Record<TimeWindow, TimeWindowCache>;

interface ProblemSubmissionsCache {
  data: CachedSubmissionWithCode[] | null;
  fetchedAt: number | null;
}

export interface SingleAnalysis {
  analysis: string;
  submissionIds: number[];
  fetchedAt: number;
}

export interface AnalysisHistoryCache {
  analyses: SingleAnalysis[];
  allAnalyzedSubmissionIds: number[]; // Union of all submission IDs ever analyzed
}

interface CacheState {
  submissionsList: SubmissionsListCache;
  lastSelectedTimeWindow: TimeWindow;
  problemSubmissions: Record<string, ProblemSubmissionsCache>;
  analysisHistory: Record<string, AnalysisHistoryCache>;
}

interface CacheContextValue {
  // State
  isHydrated: boolean;
  getSubmissionsList: (timeWindow: TimeWindow) => TimeWindowCache | null;
  getLastSelectedTimeWindow: () => TimeWindow;
  getProblemSubmissions: (slug: string) => ProblemSubmissionsCache | null;
  getAnalysisHistory: (slug: string) => AnalysisHistoryCache | null;

  // Setters
  setSubmissionsList: (
    data: CachedSubmission[],
    username: string,
    timeWindow: TimeWindow
  ) => void;
  setLastSelectedTimeWindow: (timeWindow: TimeWindow) => void;
  setProblemSubmissions: (slug: string, data: CachedSubmissionWithCode[]) => void;
  addAnalysis: (slug: string, analysis: string, submissionIds: number[]) => void;

  // Clear
  clearCache: () => void;
}

const STORAGE_KEY = "leethelper-cache";

const defaultTimeWindowCache: TimeWindowCache = {
  data: null,
  username: null,
  fetchedAt: null,
};

const defaultSubmissionsList: SubmissionsListCache = {
  week: { ...defaultTimeWindowCache },
  month: { ...defaultTimeWindowCache },
  year: { ...defaultTimeWindowCache },
};

const defaultCacheState: CacheState = {
  submissionsList: defaultSubmissionsList,
  lastSelectedTimeWindow: "week",
  problemSubmissions: {},
  analysisHistory: {},
};

const CacheContext = createContext<CacheContextValue | null>(null);

function loadFromStorage(): CacheState {
  if (typeof window === "undefined") {
    return defaultCacheState;
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return defaultCacheState;
}

function saveToStorage(state: CacheState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

export function CacheProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CacheState>(defaultCacheState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const loaded = loadFromStorage();
    setState(loaded);
    setHydrated(true);
  }, []);

  // Persist to sessionStorage on state changes (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveToStorage(state);
    }
  }, [state, hydrated]);

  const setSubmissionsList = useCallback(
    (data: CachedSubmission[], username: string, timeWindow: TimeWindow) => {
      setState((prev) => ({
        ...prev,
        submissionsList: {
          ...prev.submissionsList,
          [timeWindow]: {
            data,
            username,
            fetchedAt: Date.now(),
          },
        },
      }));
    },
    []
  );

  const getSubmissionsList = useCallback(
    (timeWindow: TimeWindow): TimeWindowCache | null => {
      const cached = state.submissionsList[timeWindow];
      if (cached?.data && cached.fetchedAt) {
        return cached;
      }
      return null;
    },
    [state.submissionsList]
  );

  const getLastSelectedTimeWindow = useCallback(
    (): TimeWindow => state.lastSelectedTimeWindow,
    [state.lastSelectedTimeWindow]
  );

  const setLastSelectedTimeWindow = useCallback((timeWindow: TimeWindow) => {
    setState((prev) => ({
      ...prev,
      lastSelectedTimeWindow: timeWindow,
    }));
  }, []);

  const setProblemSubmissions = useCallback(
    (slug: string, data: CachedSubmissionWithCode[]) => {
      setState((prev) => ({
        ...prev,
        problemSubmissions: {
          ...prev.problemSubmissions,
          [slug]: {
            data,
            fetchedAt: Date.now(),
          },
        },
      }));
    },
    []
  );

  const addAnalysis = useCallback(
    (slug: string, analysis: string, submissionIds: number[]) => {
      setState((prev) => {
        const existing = prev.analysisHistory[slug];
        const existingAnalyses = existing?.analyses || [];
        const existingAllIds = existing?.allAnalyzedSubmissionIds || [];

        // Merge new submission IDs with existing ones (deduplicated)
        const allAnalyzedSubmissionIds = [...new Set([...existingAllIds, ...submissionIds])];

        return {
          ...prev,
          analysisHistory: {
            ...prev.analysisHistory,
            [slug]: {
              analyses: [
                ...existingAnalyses,
                {
                  analysis,
                  submissionIds,
                  fetchedAt: Date.now(),
                },
              ],
              allAnalyzedSubmissionIds,
            },
          },
        };
      });
    },
    []
  );

  const getProblemSubmissions = useCallback(
    (slug: string): ProblemSubmissionsCache | null => {
      return state.problemSubmissions[slug] || null;
    },
    [state.problemSubmissions]
  );

  const getAnalysisHistory = useCallback(
    (slug: string): AnalysisHistoryCache | null => {
      return state.analysisHistory[slug] || null;
    },
    [state.analysisHistory]
  );

  const clearCache = useCallback(() => {
    setState(defaultCacheState);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value: CacheContextValue = {
    isHydrated: hydrated,
    getSubmissionsList,
    getLastSelectedTimeWindow,
    getProblemSubmissions,
    getAnalysisHistory,
    setSubmissionsList,
    setLastSelectedTimeWindow,
    setProblemSubmissions,
    addAnalysis,
    clearCache,
  };

  return (
    <CacheContext.Provider value={value}>{children}</CacheContext.Provider>
  );
}

export function useCache(): CacheContextValue {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error("useCache must be used within a CacheProvider");
  }
  return context;
}
