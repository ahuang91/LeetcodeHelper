"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
} from "@/lib/credentials-client";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [sessionCookie, setSessionCookie] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState<string | null>(null);
  const [hasExistingGeminiKey, setHasExistingGeminiKey] = useState(false);

  useEffect(() => {
    // Check if credentials already exist in localStorage
    const credentials = getCredentials();
    if (credentials) {
      setExistingUser(credentials.username);
      setHasExistingGeminiKey(!!credentials.geminiApiKey);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate Gemini API key if provided
      if (geminiApiKey) {
        const response = await fetch("/api/validate-api-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Invalid API key");
        }
      }

      // Save credentials to localStorage
      saveCredentials({
        username,
        sessionCookie,
        geminiApiKey: geminiApiKey || undefined,
      });

      router.push("/submissions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCredentials = () => {
    clearCredentials();
    setExistingUser(null);
    setHasExistingGeminiKey(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4">
      <main className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-zinc-900 dark:text-zinc-100">
          LeetCode Helper
        </h1>
        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-8">
          Analyze your LeetCode submissions
        </p>

        {existingUser && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-200 mb-2">
              Credentials saved for <strong>{existingUser}</strong>
              {hasExistingGeminiKey && (
                <span className="ml-2 text-xs bg-green-100 dark:bg-green-800 px-2 py-0.5 rounded">
                  Gemini API key configured
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/submissions")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                View Submissions
              </button>
              <button
                onClick={handleClearCredentials}
                className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 py-2 px-4 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              LeetCode Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="your_username"
              required
            />
          </div>

          <div>
            <label
              htmlFor="sessionCookie"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              LeetCode Session Cookie
            </label>
            <textarea
              id="sessionCookie"
              value={sessionCookie}
              onChange={(e) => setSessionCookie(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
              rows={4}
              required
            />
            <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              <details>
                <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                  How to get your session cookie
                </summary>
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>Go to leetcode.com and log in</li>
                  <li>Open Developer Tools (F12)</li>
                  <li>Go to Application &gt; Cookies &gt; leetcode.com</li>
                  <li>
                    Find the cookie named{" "}
                    <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">
                      LEETCODE_SESSION
                    </code>
                  </li>
                  <li>Copy its value and paste it here</li>
                </ol>
              </details>
            </div>
          </div>

          <div>
            <label
              htmlFor="geminiApiKey"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Gemini API Key{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="password"
              id="geminiApiKey"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              placeholder="AIzaSy..."
              autoComplete="off"
            />
            <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              <details>
                <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                  How to get your Gemini API key
                </summary>
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>
                    Go to{" "}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </li>
                  <li>Sign in with your Google account</li>
                  <li>Click &quot;Create API Key&quot;</li>
                  <li>Copy the key and paste it here</li>
                </ol>
              </details>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? "Validating..." : "Save & View Submissions"}
          </button>
        </form>
      </main>
    </div>
  );
}
