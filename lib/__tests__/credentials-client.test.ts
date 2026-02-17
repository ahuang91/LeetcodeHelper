import { describe, it, expect, beforeEach } from "vitest";
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
  hasCredentials,
} from "../credentials-client";

describe("credentials-client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const testCredentials = {
    username: "testuser",
    sessionCookie: "abc123",
    geminiApiKey: "key-gemini",
    anthropicApiKey: "key-anthropic",
  };

  describe("saveCredentials / getCredentials", () => {
    it("round-trips credentials through localStorage", () => {
      saveCredentials(testCredentials);
      const retrieved = getCredentials();
      expect(retrieved).toEqual(testCredentials);
    });

    it("returns null when nothing is stored", () => {
      expect(getCredentials()).toBeNull();
    });
  });

  describe("clearCredentials", () => {
    it("removes credentials from localStorage", () => {
      saveCredentials(testCredentials);
      expect(getCredentials()).not.toBeNull();

      clearCredentials();
      expect(getCredentials()).toBeNull();
    });
  });

  describe("hasCredentials", () => {
    it("returns false when no credentials are stored", () => {
      expect(hasCredentials()).toBe(false);
    });

    it("returns true when credentials are stored", () => {
      saveCredentials(testCredentials);
      expect(hasCredentials()).toBe(true);
    });
  });

  describe("error handling", () => {
    it("handles invalid JSON in localStorage gracefully", () => {
      localStorage.setItem("leethelper-credentials", "not valid json{{{");
      const result = getCredentials();
      expect(result).toBeNull();
      // Should have cleared the invalid entry
      expect(localStorage.getItem("leethelper-credentials")).toBeNull();
    });
  });
});
