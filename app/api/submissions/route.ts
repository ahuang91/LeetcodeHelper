import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { decrypt } from "@/lib/crypto";
import { createLeetCodeClient, fetchSubmissions, fetchProblemDifficulty, StoredCredentials } from "@/lib/leetcode";

const CREDENTIALS_FILE = path.join(process.cwd(), "data", "credentials.json");

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

export async function GET(request: NextRequest) {
  try {
    const credentials = getStoredCredentials();

    if (!credentials) {
      return NextResponse.json(
        { error: "No credentials found. Please set up your credentials first." },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const client = await createLeetCodeClient(credentials.sessionCookie);
    const submissions = await fetchSubmissions(client, limit, offset);

    // Get unique problem slugs and fetch their difficulties
    const uniqueSlugs = [...new Set(submissions.map((s: { titleSlug: string }) => s.titleSlug))];
    const difficultyPromises = uniqueSlugs.map((slug) =>
      fetchProblemDifficulty(client, slug).then((difficulty) => ({ slug, difficulty }))
    );
    const difficulties = await Promise.all(difficultyPromises);
    const difficultyMap = new Map(difficulties.map(({ slug, difficulty }) => [slug, difficulty]));

    // Add difficulty to each submission
    const submissionsWithDifficulty = submissions.map((s: { titleSlug: string }) => ({
      ...s,
      difficulty: difficultyMap.get(s.titleSlug) || "Unknown",
    }));

    return NextResponse.json({
      submissions: submissionsWithDifficulty,
      username: credentials.username,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions. Please check your session cookie is valid." },
      { status: 500 }
    );
  }
}
