import { NextRequest, NextResponse } from "next/server";
import {
  createLeetCodeClient,
  fetchSubmissions,
  fetchProblemDifficulty,
} from "@/lib/leetcode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionCookie, username, limit = 20, offset = 0 } = body;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session cookie is required. Please set up your credentials." },
        { status: 401 }
      );
    }

    const client = await createLeetCodeClient(sessionCookie);
    const submissions = await fetchSubmissions(client, limit, offset);

    // Get unique problem slugs and fetch their difficulties
    const uniqueSlugs = [
      ...new Set(submissions.map((s: { titleSlug: string }) => s.titleSlug)),
    ];
    const difficultyPromises = uniqueSlugs.map((slug) =>
      fetchProblemDifficulty(client, slug).then((difficulty) => ({
        slug,
        difficulty,
      }))
    );
    const difficulties = await Promise.all(difficultyPromises);
    const difficultyMap = new Map(
      difficulties.map(({ slug, difficulty }) => [slug, difficulty])
    );

    // Add difficulty to each submission
    const submissionsWithDifficulty = submissions.map(
      (s: { titleSlug: string }) => ({
        ...s,
        difficulty: difficultyMap.get(s.titleSlug) || "Unknown",
      })
    );

    return NextResponse.json({
      submissions: submissionsWithDifficulty,
      username: username || "Unknown",
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch submissions. Please check your session cookie is valid.",
      },
      { status: 500 }
    );
  }
}
