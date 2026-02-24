"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
} from "@/lib/credentials-client";
import type { AppConfig } from "./api/config/route";
import { ApiKeyInput } from "./components/ApiKeyInput";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [sessionCookie, setSessionCookie] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState<string | null>(null);
  const [hasExistingGeminiKey, setHasExistingGeminiKey] = useState(false);
  const [hasExistingAnthropicKey, setHasExistingAnthropicKey] = useState(false);
  const [hasExistingOpenaiKey, setHasExistingOpenaiKey] = useState(false);
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
      setHasExistingOpenaiKey(!!credentials.openaiApiKey);
      // Pre-populate form fields with existing values
      setUsername(credentials.username);
      setSessionCookie(credentials.sessionCookie);
      if (credentials.geminiApiKey) setGeminiApiKey(credentials.geminiApiKey);
      if (credentials.anthropicApiKey) setAnthropicApiKey(credentials.anthropicApiKey);
      if (credentials.openaiApiKey) setOpenaiApiKey(credentials.openaiApiKey);
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
        openaiApiKey: openaiApiKey || undefined,
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
    setHasExistingOpenaiKey(false);
  };

  // Determine if we should show API key fields
  const showGeminiApiKeyField = !config?.geminiApiKeyConfigured;
  const showAnthropicApiKeyField = !config?.anthropicApiKeyConfigured;
  const showOpenaiApiKeyField = !config?.openaiApiKeyConfigured;

  // Determine if API keys are available (either from env or user-provided)
  const hasGeminiKey = config?.geminiApiKeyConfigured || hasExistingGeminiKey;
  const hasAnthropicKey =
    config?.anthropicApiKeyConfigured || hasExistingAnthropicKey;
  const hasOpenaiKey = config?.openaiApiKeyConfigured || hasExistingOpenaiKey;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4">
      <main className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-zinc-900 dark:text-zinc-100">
          LeetCode Helper
        </h1>
        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-8">
          Analyze your LeetCode submissions
        </p>

        {config?.deploymentMode === "single-user" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Single-user mode
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  AI providers are configured via environment variables.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {config.geminiApiKeyConfigured && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      Gemini
                    </span>
                  )}
                  {config.anthropicApiKeyConfigured && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      Claude
                    </span>
                  )}
                  {config.openaiApiKeyConfigured && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      OpenAI
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
              {hasOpenaiKey && (
                <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                  OpenAI
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

          {(showGeminiApiKeyField || showAnthropicApiKeyField || showOpenaiApiKeyField) && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                AI API Keys{" "}
                <span className="text-zinc-400 font-normal">
                  (at least one required for analysis)
                </span>
              </p>

              {showGeminiApiKeyField && (
                <ApiKeyInput
                  id="geminiApiKey"
                  label="Gemini API Key"
                  value={geminiApiKey}
                  onChange={setGeminiApiKey}
                  placeholder="AIzaSy..."
                  helpText="Google AI Studio"
                  helpUrl="https://aistudio.google.com/apikey"
                />
              )}

              {showAnthropicApiKeyField && (
                <ApiKeyInput
                  id="anthropicApiKey"
                  label="Anthropic API Key"
                  value={anthropicApiKey}
                  onChange={setAnthropicApiKey}
                  placeholder="sk-ant-..."
                  helpText="Anthropic Console"
                  helpUrl="https://console.anthropic.com/settings/keys"
                />
              )}

              {showOpenaiApiKeyField && (
                <ApiKeyInput
                  id="openaiApiKey"
                  label="OpenAI API Key"
                  value={openaiApiKey}
                  onChange={setOpenaiApiKey}
                  placeholder="sk-..."
                  helpText="OpenAI Platform"
                  helpUrl="https://platform.openai.com/api-keys"
                />
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            {existingUser && (
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "Validating..." : existingUser ? "Update" : "Save & View Submissions"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
