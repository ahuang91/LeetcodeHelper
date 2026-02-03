"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
} from "@/lib/credentials-client";
import type { AppConfig } from "./api/config/route";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [sessionCookie, setSessionCookie] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState<string | null>(null);
  const [hasExistingGeminiKey, setHasExistingGeminiKey] = useState(false);
  const [hasExistingAnthropicKey, setHasExistingAnthropicKey] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    // Fetch app configuration
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: AppConfig) => setConfig(data))
      .catch(() => {});

    // Check if credentials already exist in localStorage
    const credentials = getCredentials();
    if (credentials) {
      setExistingUser(credentials.username);
      setHasExistingGeminiKey(!!credentials.geminiApiKey);
      setHasExistingAnthropicKey(!!credentials.anthropicApiKey);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate Gemini API key if provided (and not using server-configured key)
      if (geminiApiKey && !config?.geminiApiKeyConfigured) {
        const response = await fetch("/api/validate-api-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Invalid Gemini API key");
        }
      }

      // Save credentials to localStorage
      saveCredentials({
        username,
        sessionCookie,
        geminiApiKey: geminiApiKey || undefined,
        anthropicApiKey: anthropicApiKey || undefined,
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
    setHasExistingAnthropicKey(false);
  };

  // Determine if we should show API key fields
  const showGeminiApiKeyField = !config?.geminiApiKeyConfigured;
  const showAnthropicApiKeyField = !config?.anthropicApiKeyConfigured;

  // Determine if API keys are available (either from env or user-provided)
  const hasGeminiKey = config?.geminiApiKeyConfigured || hasExistingGeminiKey;
  const hasAnthropicKey =
    config?.anthropicApiKeyConfigured || hasExistingAnthropicKey;

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
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
              {hasGeminiKey && (
                <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                  Gemini
                </span>
              )}
              {hasAnthropicKey && (
                <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                  Claude
                </span>
              )}
            </div>
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

          {(showGeminiApiKeyField || showAnthropicApiKeyField) && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                AI API Keys{" "}
                <span className="text-zinc-400 font-normal">
                  (at least one required for analysis)
                </span>
              </p>

              {showGeminiApiKeyField && (
                <div className="mb-4">
                  <label
                    htmlFor="geminiApiKey"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                  >
                    Gemini API Key
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
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Get your key at{" "}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </div>
                </div>
              )}

              {showAnthropicApiKeyField && (
                <div>
                  <label
                    htmlFor="anthropicApiKey"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                  >
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    id="anthropicApiKey"
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    placeholder="sk-ant-..."
                    autoComplete="off"
                  />
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Get your key at{" "}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:underline"
                    >
                      Anthropic Console
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

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
