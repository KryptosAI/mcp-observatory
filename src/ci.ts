import ci from "ci-info";

export const isCI: boolean = ci.isCI;
export const ciName: string | null = ci.name;

export function getGitHubContext(): { sha: string; repo: string } | null {
  const sha = process.env["GITHUB_SHA"];
  const repo = process.env["GITHUB_REPOSITORY"];
  if (!sha || !repo) return null;
  return { sha, repo };
}
