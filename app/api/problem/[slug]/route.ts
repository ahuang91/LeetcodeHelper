import { NextRequest, NextResponse } from "next/server";
import { createLeetCodeClient } from "@/lib/leetcode";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const body = await request.json();
    const { sessionCookie } = body;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session cookie is required. Please set up your credentials." },
        { status: 401 }
      );
    }

    const { slug } = await params;

    const client = await createLeetCodeClient(sessionCookie);
    const problem = await client.problem(slug);

    return NextResponse.json({
      title: problem.title,
      titleSlug: problem.titleSlug,
      difficulty: problem.difficulty,
      content: problem.content,
      topicTags: problem.topicTags,
    });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem details." },
      { status: 500 }
    );
  }
}
