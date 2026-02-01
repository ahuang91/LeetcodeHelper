import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { decrypt } from "@/lib/crypto";
import { createLeetCodeClient, StoredCredentials } from "@/lib/leetcode";

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

    const client = await createLeetCodeClient(credentials.sessionCookie);
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
