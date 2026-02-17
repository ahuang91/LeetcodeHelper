import { describe, it, expect, vi, afterEach } from "vitest";
import { formatDate, formatDateShort, formatRelativeTime } from "../date-utils";

describe("formatDate", () => {
  it("formats a timestamp as a full date string", () => {
    // Jan 15, 2025 14:30:00 UTC
    const timestamp = Date.UTC(2025, 0, 15, 14, 30, 0);
    const result = formatDate(timestamp);

    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2025");
  });
});

describe("formatDateShort", () => {
  it("formats without the year", () => {
    const timestamp = Date.UTC(2025, 0, 15, 14, 30, 0);
    const result = formatDateShort(timestamp);

    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).not.toContain("2025");
  });
});

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for timestamps less than a minute ago', () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000);
    expect(formatRelativeTime(1000000 - 30 * 1000)).toBe("just now");
  });

  it('returns "1 minute ago" for singular minute', () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000);
    expect(formatRelativeTime(1000000 - 90 * 1000)).toBe("1 minute ago");
  });

  it("returns plural minutes", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000);
    expect(formatRelativeTime(1000000 - 5 * 60 * 1000)).toBe("5 minutes ago");
  });

  it('returns "1 hour ago" for singular hour', () => {
    vi.spyOn(Date, "now").mockReturnValue(10000000);
    expect(formatRelativeTime(10000000 - 60 * 60 * 1000)).toBe("1 hour ago");
  });

  it("returns plural hours", () => {
    vi.spyOn(Date, "now").mockReturnValue(10000000);
    expect(formatRelativeTime(10000000 - 3 * 60 * 60 * 1000)).toBe(
      "3 hours ago"
    );
  });

  it('returns "1 day ago" for singular day', () => {
    vi.spyOn(Date, "now").mockReturnValue(100000000);
    expect(formatRelativeTime(100000000 - 24 * 60 * 60 * 1000)).toBe(
      "1 day ago"
    );
  });

  it("returns plural days", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000000);
    expect(formatRelativeTime(1000000000 - 7 * 24 * 60 * 60 * 1000)).toBe(
      "7 days ago"
    );
  });
});
