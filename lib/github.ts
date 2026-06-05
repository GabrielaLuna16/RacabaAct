import { Octokit } from '@octokit/rest';

const owner = process.env.GITHUB_OWNER!;
const repo = process.env.GITHUB_REPO!;

function getOctokit() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

async function getFileSha(octokit: Octokit, path: string): Promise<string | undefined> {
  try {
    const res = await octokit.repos.getContent({ owner, repo, path });
    const data = res.data;
    if (!Array.isArray(data) && 'sha' in data) return data.sha;
  } catch {
    // File doesn't exist yet
  }
  return undefined;
}

export async function commitJsonToGitHub(
  path: string,
  content: unknown,
  message: string
): Promise<void> {
  const octokit = getOctokit();
  const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

  // Intento 1 — SHA fresco
  let sha = await getFileSha(octokit, path);
  try {
    await octokit.repos.createOrUpdateFileContents({ owner, repo, path, message, content: encoded, sha });
    return;
  } catch (err: unknown) {
    // 409 = SHA desactualizado (conflicto). Reintentamos con SHA actualizado.
    const status = (err as { status?: number }).status;
    if (status !== 409) throw err;
  }

  // Intento 2 — SHA actualizado
  sha = await getFileSha(octokit, path);
  await octokit.repos.createOrUpdateFileContents({ owner, repo, path, message, content: encoded, sha });
}

export async function getMonthsList(): Promise<string[]> {
  try {
    const octokit = getOctokit();
    const res = await octokit.repos.getContent({ owner, repo, path: 'public/data/months.json' });
    const data = res.data;
    if (!Array.isArray(data) && 'content' in data) {
      const json = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      return json as string[];
    }
  } catch {
    // File doesn't exist yet
  }
  return [];
}

export async function updateMonthsList(monthStr: string): Promise<void> {
  const existing = await getMonthsList();
  if (!existing.includes(monthStr)) {
    const updated = [...existing, monthStr].sort();
    await commitJsonToGitHub(
      'public/data/months.json',
      updated,
      `chore: add month ${monthStr} to index`
    );
  }
}
