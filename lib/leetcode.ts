import { LeetCode, Credential } from "leetcode-query";

export async function createLeetCodeClient(
  sessionCookie: string
): Promise<LeetCode> {
  const credential = new Credential();
  await credential.init(sessionCookie);
  return new LeetCode(credential);
}

export async function fetchSubmissions(
  client: LeetCode,
  limit: number = 20,
  offset: number = 0
) {
  return await client.submissions({ limit, offset });
}

export interface TopicTag {
  name: string;
  slug: string;
}

export interface ProblemMetadata {
  difficulty: string;
  topicTags: TopicTag[];
}

export async function fetchProblemMetadata(
  client: LeetCode,
  titleSlug: string
): Promise<ProblemMetadata> {
  try {
    const problem = await client.problem(titleSlug);
    return {
      difficulty: problem.difficulty || "Unknown",
      topicTags: (problem.topicTags as TopicTag[]) || [],
    };
  } catch {
    return { difficulty: "Unknown", topicTags: [] };
  }
}

export async function fetchSubmissionDetail(client: LeetCode, id: number) {
  return await client.submission(id);
}

export async function fetchSubmissionsForProblem(
  client: LeetCode,
  slug: string,
  limit: number = 100
) {
  return await client.submissions({ slug, limit, offset: 0 });
}
