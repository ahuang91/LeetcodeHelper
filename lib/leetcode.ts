import { LeetCode, Credential } from "leetcode-query";

export interface StoredCredentials {
  username: string;
  sessionCookie: string;
}

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

export async function fetchProblemDifficulty(
  client: LeetCode,
  titleSlug: string
): Promise<string> {
  try {
    const problem = await client.problem(titleSlug);
    return problem.difficulty || "Unknown";
  } catch {
    return "Unknown";
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
