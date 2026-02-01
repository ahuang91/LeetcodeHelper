import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { decrypt } from "@/lib/crypto";
import {
  createLeetCodeClient,
  fetchSubmissionsForProblem,
  fetchSubmissionDetail,
  StoredCredentials,
} from "@/lib/leetcode";

const CREDENTIALS_FILE = path.join(process.cwd(), "data", "credentials.json");

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

function getStoredCredentials(): StoredCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const fileContent = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
    const { encrypted } = JSON.parse(fileContent);
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const credentials = getStoredCredentials();

    if (!credentials) {
      return NextResponse.json(
        { error: "No credentials found. Please set up your credentials first." },
        { status: 401 }
      );
    }

    const { slug } = await params;

    // Check for specific submission IDs in query params
    const idsParam = request.nextUrl.searchParams.get("ids");
    const submissionIds = idsParam ? idsParam.split(",") : null;

    const client = await createLeetCodeClient(credentials.sessionCookie);

    // If specific IDs provided, only fetch those; otherwise fetch all for the problem
    let submissionsToFetch: { id: number }[];

    if (submissionIds && submissionIds.length > 0) {
      // Use the provided IDs directly
      submissionsToFetch = submissionIds.map((id) => ({ id: parseInt(id, 10) }));
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
