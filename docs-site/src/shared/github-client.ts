import { MarkdownValidator } from "./markdown-validator";

export interface GitHubSaveResult {
  revision: string;
  commitSha: string;
  commitUrl?: string;
}

export interface GitHubDocumentChange {
  path: string;
  content: string;
  expectedRevision: string;
}

export interface GitHubBatchSaveResult {
  revisions: Record<string, string>;
  commitSha: string;
  commitUrl?: string;
}

export interface WorkflowRun {
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  url?: string;
}

const tokenStorageKey = "docs-github-token";

// Networks that block api.github.com can point this at a same-purpose proxy.
const apiBase = (
  import.meta.env.VITE_GITHUB_API_BASE?.trim() || "https://api.github.com"
).replace(/\/$/, "");
// Supabase gateways reject anonymous calls without this.
const apiKey = import.meta.env.VITE_GITHUB_API_KEY?.trim();

/**
 * Commits a single Markdown file straight to the GitHub Contents API.
 * The token lives in localStorage so it remains available across browser sessions.
 */
export class GitHubDocumentClient {
  private readonly validator = new MarkdownValidator();

  public constructor(
    private readonly repository: string,
    private readonly branch: string,
  ) {}
  public get isConfigured(): boolean {
    return Boolean(this.repository && this.branch);
  }

  public get token(): string {
    const storedToken = localStorage.getItem(tokenStorageKey);
    if (storedToken) return storedToken;

    const legacyToken = sessionStorage.getItem(tokenStorageKey);
    if (!legacyToken) return "";
    localStorage.setItem(tokenStorageKey, legacyToken);
    sessionStorage.removeItem(tokenStorageKey);
    return legacyToken;
  }

  public set token(value: string) {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(tokenStorageKey, trimmed);
    else localStorage.removeItem(tokenStorageKey);
    sessionStorage.removeItem(tokenStorageKey);
  }

  /**
   * @throws {SaveError} When validation fails or GitHub rejects the update.
   */
  public async save(
    path: string,
    content: string,
    expectedRevision: string,
  ): Promise<GitHubSaveResult> {
    const validation = this.validator.validate(content);
    if (!validation.valid) throw new SaveError(validation.errors);
    if (!this.token) throw new SaveError(["Add a GitHub token before saving."]);

    const current = await this.read(path);
    if (current.revision !== expectedRevision) {
      throw new SaveError([
        "This file changed on GitHub after you opened it. Reload before saving.",
      ]);
    }

    const response = await fetch(this.contentsUrl(path), {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({
        message: `docs: update ${path.split("/").at(-1)}`,
        content: encodeBase64(content),
        sha: current.sha,
        branch: this.branch,
      }),
    });

    if (!response.ok) throw new SaveError([await describeFailure(response)]);
    const result = (await response.json()) as {
      commit?: { sha?: string; html_url?: string };
    };
    return {
      revision: await hash(content),
      commitSha: result.commit?.sha ?? "",
      commitUrl: result.commit?.html_url,
    };
  }

  /** Commits multiple validated Markdown files atomically on the configured branch. */
  public async saveMany(
    changes: GitHubDocumentChange[],
  ): Promise<GitHubBatchSaveResult> {
    if (!changes.length) throw new SaveError(["There are no documents to save."]);
    if (!this.token) throw new SaveError(["Add a GitHub token before saving."]);

    const reference = await this.request<{
      object: { sha: string };
    }>(`/repos/${this.repository}/git/ref/heads/${encodeURIComponent(this.branch)}`);

    for (const change of changes) {
      const validation = this.validator.validate(change.content);
      if (!validation.valid) {
        throw new SaveError(validation.errors.map((error) => `${change.path}: ${error}`));
      }
      const current = await this.read(change.path, reference.object.sha);
      if (current.revision !== change.expectedRevision) {
        throw new SaveError([
          `${change.path} changed on GitHub after you opened it. Reload before saving.`,
        ]);
      }
    }

    const parent = await this.request<{ tree: { sha: string } }>(
      `/repos/${this.repository}/git/commits/${reference.object.sha}`,
    );
    const treeItems = await Promise.all(
      changes.map(async (change) => {
        const blob = await this.request<{ sha: string }>(
          `/repos/${this.repository}/git/blobs`,
          {
            method: "POST",
            body: JSON.stringify({ content: encodeBase64(change.content), encoding: "base64" }),
          },
        );
        return { path: change.path, mode: "100644", type: "blob", sha: blob.sha };
      }),
    );
    const tree = await this.request<{ sha: string }>(
      `/repos/${this.repository}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({ base_tree: parent.tree.sha, tree: treeItems }),
      },
    );
    const commit = await this.request<{ sha: string; html_url?: string }>(
      `/repos/${this.repository}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message: `docs: update ${changes.length} document${changes.length === 1 ? "" : "s"}`,
          tree: tree.sha,
          parents: [reference.object.sha],
        }),
      },
    );
    await this.request(
      `/repos/${this.repository}/git/refs/heads/${encodeURIComponent(this.branch)}`,
      { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) },
    );

    return {
      revisions: Object.fromEntries(
        await Promise.all(changes.map(async (change) => [change.path, await hash(change.content)])),
      ),
      commitSha: commit.sha,
      commitUrl: commit.html_url,
    };
  }

  /**
   * Finds the Actions run for a commit. Returns undefined while GitHub is still
   * creating it, or when the token cannot read Actions.
   */
  public async findWorkflowRun(
    commitSha: string,
  ): Promise<WorkflowRun | undefined> {
    const response = await fetch(
      `${apiBase}/repos/${this.repository}/actions/runs?head_sha=${commitSha}&per_page=1`,
      { headers: this.headers() },
    );
    if (!response.ok) return undefined;

    const body = (await response.json()) as {
      workflow_runs?: {
        status: WorkflowRun["status"];
        conclusion: string | null;
        html_url?: string;
      }[];
    };
    const run = body.workflow_runs?.[0];
    if (!run) return undefined;
    return {
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
    };
  }

  private async read(
    path: string,
    revision = this.branch,
  ): Promise<{ sha: string; revision: string }> {
    const response = await fetch(
      `${this.contentsUrl(path)}?ref=${encodeURIComponent(revision)}`,
      { headers: this.headers() },
    );
    if (!response.ok) throw new SaveError([await describeFailure(response)]);

    const document = (await response.json()) as {
      content: string;
      sha: string;
    };
    return {
      sha: document.sha,
      revision: await hash(decodeBase64(document.content)),
    };
  }

  private contentsUrl(path: string): string {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return `${apiBase}/repos/${this.repository}/contents/${encodedPath}`;
  }

  private headers(): HeadersInit {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      // Supabase's gateway consumes Authorization, so proxies read this instead.
      "X-GitHub-Token": this.token,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(apiKey ? { apikey: apiKey } : {}),
    };
  }

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: this.headers(),
    });
    if (!response.ok) throw new SaveError([await describeFailure(response)]);
    return (await response.json()) as T;
  }
}

export class SaveError extends Error {
  public constructor(public readonly errors: string[]) {
    super(errors[0]);
  }
}

async function describeFailure(response: Response): Promise<string> {
  if (response.status === 401) return "The GitHub token is invalid or expired.";
  if (response.status === 403)
    return "The token lacks 'Contents: Read and write' permission on this repository.";
  if (response.status === 404)
    return "The repository, branch, or file was not found for this token.";
  if (response.status === 409)
    return "The branch moved while saving. Reload and try again.";
  return `GitHub rejected the request (${response.status}).`;
}

async function hash(content: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function encodeBase64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function decodeBase64(content: string): string {
  const bytes = Uint8Array.from(atob(content.replace(/\n/g, "")), (character) =>
    character.charCodeAt(0),
  );
  return new TextDecoder().decode(bytes);
}
