import { NextRequest, NextResponse } from "next/server";
import {
  createLeetCodeClient,
  fetchSubmissions,
  fetchProblemMetadata,
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

    // Get unique problem slugs and fetch their metadata (difficulty + topic tags)
    const uniqueSlugs = [
      ...new Set(submissions.map((s: { titleSlug: string }) => s.titleSlug)),
    ];
    const metadataPromises = uniqueSlugs.map((slug) =>
      fetchProblemMetadata(client, slug).then((metadata) => ({
        slug,
        metadata,
      }))
    );
    const metadataResults = await Promise.all(metadataPromises);
    const metadataMap = new Map(
      metadataResults.map(({ slug, metadata }) => [slug, metadata])
    );

    // Add difficulty and topicTags to each submission
    const submissionsWithMetadata = submissions.map(
      (s: { titleSlug: string }) => ({
        ...s,
        difficulty: metadataMap.get(s.titleSlug)?.difficulty || "Unknown",
        topicTags: metadataMap.get(s.titleSlug)?.topicTags || [],
      })
    );

    return NextResponse.json({
      submissions: submissionsWithMetadata,
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
