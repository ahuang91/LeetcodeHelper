"use client";

const STORAGE_KEY = "leethelper-credentials";

export interface ClientCredentials {
  username: string;
  sessionCookie: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
}

export function saveCredentials(credentials: ClientCredentials): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function getCredentials(): ClientCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid JSON, clear it
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function clearCredentials(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function hasCredentials(): boolean {
  return getCredentials() !== null;
}
