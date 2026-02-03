import { NextRequest, NextResponse } from "next/server";
import {
  createLeetCodeClient,
  fetchSubmissionsForProblem,
  fetchSubmissionDetail,
} from "@/lib/leetcode";

// LeetCode status codes mapping
const STATUS_MAP: Record<number, string> = {
  10: "Accepted",
  11: "Wrong Answer",
  12: "Memory Limit Exceeded",
  13: "Output Limit Exceeded",
  14: "Time Limit Exceeded",
  15: "Runtime Error",
  16: "Internal Error",
  20: "Compile Error",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const body = await request.json();
    const { sessionCookie, ids } = body;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session cookie is required. Please set up your credentials." },
        { status: 401 }
      );
    }

    const { slug } = await params;

    // Check for specific submission IDs
    const submissionIds: string[] | null = ids || null;

    const client = await createLeetCodeClient(sessionCookie);

    // If specific IDs provided, only fetch those; otherwise fetch all for the problem
    let submissionsToFetch: { id: number }[];

    if (submissionIds && submissionIds.length > 0) {
      // Use the provided IDs directly
      submissionsToFetch = submissionIds.map((id: string) => ({
        id: parseInt(id, 10),
      }));
    } else {
      // Fetch all submissions for this problem
      const submissions = await fetchSubmissionsForProblem(client, slug);
      submissionsToFetch = submissions.map((sub) => ({ id: sub.id }));
    }

    // Fetch code for each submission
    const submissionsWithCode = await Promise.all(
      submissionsToFetch.map(async (sub) => {
        try {
          const detail = await fetchSubmissionDetail(client, sub.id);
          return {
            id: sub.id,
            status: STATUS_MAP[detail.statusCode] || "Unknown",
            language: detail.lang.verboseName,
            timestamp: detail.timestamp * 1000, // Convert to milliseconds
            runtime: detail.runtimeDisplay,
            memory: detail.memoryDisplay,
            code: detail.code,
          };
        } catch {
          // If we can't fetch details, skip this submission
          return null;
        }
      })
    );

    // Filter out failed fetches and sort chronologically (oldest first)
    const validSubmissions = submissionsWithCode
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      submissions: validSubmissions,
    });
  } catch (error) {
    console.error("Error fetching submissions for problem:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions." },
      { status: 500 }
    );
  }
}
