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

export interface AnalysisCache {
  analysis: string;
  analyzedSubmissionIds: number[];
  fetchedAt: number;
}

interface CacheState {
  submissionsList: SubmissionsListCache;
  lastSelectedTimeWindow: TimeWindow;
  problemSubmissions: Record<string, ProblemSubmissionsCache>;
  analysisCache: Record<string, AnalysisCache>;
}

interface CacheContextValue {
  // State
  isHydrated: boolean;
  getSubmissionsList: (timeWindow: TimeWindow) => TimeWindowCache | null;
  getLastSelectedTimeWindow: () => TimeWindow;
  getProblemSubmissions: (slug: string) => ProblemSubmissionsCache | null;
  getAnalysis: (slug: string) => AnalysisCache | null;

  // Setters
  setSubmissionsList: (
    data: CachedSubmission[],
    username: string,
    timeWindow: TimeWindow
  ) => void;
  setLastSelectedTimeWindow: (timeWindow: TimeWindow) => void;
  setProblemSubmissions: (slug: string, data: CachedSubmissionWithCode[]) => void;
  setAnalysis: (slug: string, analysis: string, analyzedSubmissionIds: number[]) => void;

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
  analysisCache: {},
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

  const setAnalysis = useCallback(
    (slug: string, analysis: string, analyzedSubmissionIds: number[]) => {
      setState((prev) => ({
        ...prev,
        analysisCache: {
          ...prev.analysisCache,
          [slug]: {
            analysis,
            analyzedSubmissionIds,
            fetchedAt: Date.now(),
          },
        },
      }));
    },
    []
  );

  const getProblemSubmissions = useCallback(
    (slug: string): ProblemSubmissionsCache | null => {
      return state.problemSubmissions[slug] || null;
    },
    [state.problemSubmissions]
  );

  const getAnalysis = useCallback(
    (slug: string): AnalysisCache | null => {
      return state.analysisCache[slug] || null;
    },
    [state.analysisCache]
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
    getAnalysis,
    setSubmissionsList,
    setLastSelectedTimeWindow,
    setProblemSubmissions,
    setAnalysis,
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
