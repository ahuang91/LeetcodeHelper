/**
 * Utility functions for the caching system.
 */

/**
 * Generate a hash from submission identifiers.
 * Used to detect when the set of analyzed submissions has changed.
 */
export function hashSubmissions(
  submissions: { id: number; timestamp: number }[]
): string {
  // Sort by timestamp to ensure consistent ordering
  const sorted = [...submissions].sort((a, b) => a.timestamp - b.timestamp);
  const key = sorted.map((s) => `${s.id}:${s.timestamp}`).join("|");

  // Simple hash function (djb2 variant)
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Format a relative time string (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  return "just now";
}
