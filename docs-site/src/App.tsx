import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Menu,
  Pencil,
  Save,
  Search,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import documents from "virtual:analysis-documents";
import { GitHubDocumentClient, SaveError } from "./shared/github-client";

interface Heading {
  level: number;
  label: string;
  id: string;
}

interface Progress {
  stage: "committed" | "building" | "deployed" | "failed" | "unknown";
  runUrl?: string;
}

interface SaveResponse {
  valid?: boolean;
  errors?: string[];
  document?: {
    path: string;
    title: string;
    section: string;
    content: string;
    revision: string;
  };
}

const defaultDocumentPath =
  "zero-to-work-english/04-工作沟通B1/software-workplace-grammar-guide.zh.md";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

const readDocumentPath = () =>
  new URL(window.location.href).searchParams.get("doc") ?? defaultDocumentPath;

const getHeadings = (content: string): Heading[] =>
  [...content.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match) => ({
    level: match[1].length,
    label: match[2],
    id: slugify(match[2]),
  }));

async function saveToLocalServer(
  path: string,
  content: string,
  expectedRevision: string,
): Promise<string> {
  const response = await fetch("/api/documents", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content, expectedRevision }),
  });
  const result = (await response.json()) as SaveResponse;
  if (!response.ok || !result.document) {
    throw new SaveError(result.errors ?? ["The document could not be saved."]);
  }
  return result.document.revision;
}

export class DocumentCatalog {
  public readonly sections = Array.from(
    new Set(documents.map((document) => document.section)),
  );

  public find(path: string) {
    return documents.find((document) => document.path === path) ?? documents[0];
  }

  public filter(query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return documents;
    return documents.filter((document) =>
      `${document.title} ${document.section} ${document.content}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }
}

const catalog = new DocumentCatalog();
const github = new GitHubDocumentClient(
  import.meta.env.VITE_GITHUB_REPOSITORY?.trim() ?? "",
  import.meta.env.VITE_GITHUB_BRANCH?.trim() || "main",
);
const savesToGitHub = github.isConfigured;

export function App() {
  const [activePath, setActivePath] = useState(readDocumentPath);
  const [query, setQuery] = useState("");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedContent, setSavedContent] = useState<Record<string, string>>({});
  const [revisions, setRevisions] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [commitUrl, setCommitUrl] = useState<string>();
  const [progress, setProgress] = useState<Progress>();
  const [token, setToken] = useState(() => github.token);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeDocument = catalog.find(activePath);
  const draft = drafts[activePath] ?? activeDocument.content;
  const persistedContent = savedContent[activePath] ?? activeDocument.content;
  const isDirty = draft !== persistedContent;
  const filteredDocuments = catalog.filter(query);
  const displayContent = isEditing ? draft : persistedContent;
  const headings = getHeadings(displayContent);

  useEffect(() => {
    const onPopState = () => setActivePath(readDocumentPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setSaveState("idle");
    setSaveErrors([]);
    setIsEditing(false);
  }, [activePath]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") setNavigationOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (isEditing) void saveDocument();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = setTimeout(() => setSaveState("idle"), 6000);
    return () => clearTimeout(timer);
  }, [saveState]);

  const selectDocument = (path: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("doc", path);
    url.hash = "";
    window.history.pushState({}, "", url);
    setActivePath(path);
    setNavigationOpen(false);
    setIsEditing(false);
  };

  const updateDraft = (content: string) => {
    setDrafts((current) => ({ ...current, [activePath]: content }));
    setSaveState("idle");
    setSaveErrors([]);
  };

  const startEditing = () => {
    setSaveState("idle");
    setSaveErrors([]);
    setProgress(undefined);
    setIsEditing(true);
  };
  const cancelEditing = () => {
    setDrafts((current) => ({
      ...current,
      [activePath]: persistedContent,
    }));
    setSaveState("idle");
    setSaveErrors([]);
    setIsEditing(false);
  };

  const trackDeployment = async (commitSha: string) => {
    const deadline = Date.now() + 15 * 60 * 1000;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const run = await github.findWorkflowRun(commitSha);

      // No run yet, or the token cannot read Actions.
      if (!run) continue;

      if (run.status !== "completed") {
        setProgress({ stage: "building", runUrl: run.url });
        continue;
      }

      setProgress({
        stage: run.conclusion === "success" ? "deployed" : "failed",
        runUrl: run.url,
      });
      return;
    }

    setProgress((current) =>
      current?.stage === "deployed" ? current : { stage: "unknown" },
    );
  };

  const saveDocument = async () => {
    if (!isDirty || saveState === "saving") return;
    setSaveState("saving");
    setSaveErrors([]);
    const expectedRevision = revisions[activePath] ?? activeDocument.revision;

    try {
      const result = savesToGitHub
        ? await github.save(activePath, draft, expectedRevision)
        : {
            revision: await saveToLocalServer(
              activePath,
              draft,
              expectedRevision,
            ),
          };

      setSavedContent((current) => ({ ...current, [activePath]: draft }));
      setRevisions((current) => ({
        ...current,
        [activePath]: result.revision,
      }));
      setCommitUrl("commitUrl" in result ? result.commitUrl : undefined);
      setSaveState("saved");
      setIsEditing(false);

      if ("commitSha" in result && result.commitSha) {
        setProgress({ stage: "committed" });
        void trackDeployment(result.commitSha);
      }
    } catch (error) {
      setSaveState("error");
      setSaveErrors(
        error instanceof SaveError
          ? error.errors
          : [
              error instanceof Error
                ? error.message
                : "The document could not be saved.",
            ],
      );
    }
  };

  return (
    <div className={`app-shell ${isEditing ? "is-editing" : ""}`}>
      <header className="topbar">
        <button
          className="icon-button menu-button"
          onClick={() => setNavigationOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <button
          className="brand"
          onClick={() => selectDocument("README.md")}
          aria-label="Learn English home"
        >
          <span className="brand-mark">
            <BookOpen size={19} />
          </span>
          <span>
            Learn <strong>English</strong>
          </span>
        </button>
        <div className="topbar-actions">
          {isEditing ? (
            <>
              <span className={`save-status ${saveState}`}>
                {saveState === "saving" && "Validating…"}
                {saveState === "saved" && (
                  <>
                    <Check size={14} />
                    {savesToGitHub ? "Committed to GitHub" : "Saved locally"}
                  </>
                )}
                {saveState === "error" && "Fix formatting errors"}
                {saveState === "idle" &&
                  (isDirty ? "Unsaved changes" : "No changes")}
              </span>
              <button className="cancel-button" onClick={cancelEditing}>
                Cancel
              </button>
              <button
                className="save-button"
                onClick={() => void saveDocument()}
                disabled={!isDirty || saveState === "saving"}
              >
                <Save size={16} /> Save
              </button>
            </>
          ) : (
            <>
              {progress && (
                <span
                  className={`deploy-status ${progress.stage}`}
                  role="status"
                >
                  {progress.stage === "committed" &&
                    "Committed · queuing build…"}
                  {progress.stage === "building" && "Building & deploying…"}
                  {progress.stage === "deployed" && (
                    <>
                      <Check size={14} /> Live on the site
                    </>
                  )}
                  {progress.stage === "failed" && "Build failed"}
                  {progress.stage === "unknown" &&
                    "Committed · build status unavailable"}
                  {progress.runUrl && (
                    <a href={progress.runUrl} target="_blank" rel="noreferrer">
                      View run
                    </a>
                  )}
                </span>
              )}
              {saveState === "saved" && !progress && (
                <span className="save-status saved" role="status">
                  <Check size={14} />
                  {savesToGitHub ? "Committed to GitHub" : "Saved locally"}
                  {commitUrl && (
                    <a href={commitUrl} target="_blank" rel="noreferrer">
                      View commit
                    </a>
                  )}
                </span>
              )}
              <button className="edit-button" onClick={startEditing}>
                <Pencil size={16} /> Edit
              </button>
            </>
          )}
        </div>
      </header>

      <aside className={`navigation ${navigationOpen ? "is-open" : ""}`}>
        <div className="navigation-header">
          <span className="navigation-label">Documentation</span>
          <button
            className="icon-button close-button"
            onClick={() => setNavigationOpen(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search analysis"
          />
          <kbd>/</kbd>
        </label>
        <nav className="document-tree" aria-label="Documentation navigation">
          {catalog.sections.map((section) => {
            const sectionDocuments = filteredDocuments.filter(
              (document) => document.section === section,
            );
            if (!sectionDocuments.length) return null;
            return (
              <details key={section} open>
                <summary>
                  <ChevronDown size={15} />
                  <span>
                    {section === "Overview"
                      ? section
                      : section.replace(/^\d+\.\s*/, "")}
                  </span>
                </summary>
                {sectionDocuments.map((document) => (
                  <button
                    key={document.path}
                    className={
                      document.path === activeDocument.path ? "active" : ""
                    }
                    onClick={() => selectDocument(document.path)}
                  >
                    <FileText size={14} />
                    <span>{document.title}</span>
                  </button>
                ))}
              </details>
            );
          })}
          {!filteredDocuments.length && (
            <p className="empty-state">No documents match “{query}”.</p>
          )}
        </nav>
      </aside>

      {navigationOpen && (
        <button
          className="scrim"
          onClick={() => setNavigationOpen(false)}
          aria-label="Dismiss navigation"
        />
      )}

      {isEditing ? (
        <main className="editor-workspace">
          <section className="editor-pane">
            <div className="pane-header">
              <div>
                <span className="pane-label">Markdown</span>
                <code>{activeDocument.path}</code>
              </div>
              <span>{draft.split("\n").length} lines</span>
            </div>
            {saveErrors.length > 0 && (
              <div className="validation-errors" role="alert">
                <strong>Save blocked</strong>
                {saveErrors.map((error) => (
                  <span key={error}>{error}</span>
                ))}
              </div>
            )}
            {savesToGitHub && (
              <label className="token-field">
                <span>GitHub token</span>
                <input
                  type="password"
                  value={token}
                  placeholder="Fine-grained token with Contents: Read and write"
                  autoComplete="off"
                  onChange={(event) => {
                    github.token = event.target.value;
                    setToken(event.target.value);
                  }}
                />
                <small>Kept in this tab only; cleared when you close it.</small>
              </label>
            )}
            <textarea
              className="markdown-editor"
              aria-label="Markdown editor"
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              spellCheck={false}
            />
          </section>

          <section className="preview-pane">
            <div className="pane-header preview-header">
              <div>
                <span className="pane-label">Live preview</span>
                <span>{activeDocument.section.replace(/^\d+\.\s*/, "")}</span>
              </div>
              <span>{headings.length} sections</span>
            </div>
            <MarkdownContent
              content={draft}
              documentPath={activeDocument.path}
            />
          </section>
        </main>
      ) : (
        <>
          <main className="document-main">
            <div className="document-kicker">
              {activeDocument.section.replace(/^\d+\.\s*/, "")}
            </div>
            <MarkdownContent
              content={persistedContent}
              documentPath={activeDocument.path}
            />
          </main>
          <aside className="page-outline">
            <div className="outline-label">On this page</div>
            <nav>
              {headings.map((heading) => (
                <a
                  key={`${heading.id}-${heading.label}`}
                  className={heading.level === 3 ? "nested" : ""}
                  href={`#${heading.id}`}
                >
                  {heading.label}
                </a>
              ))}
            </nav>
            <div className="source-note">
              Source
              <br />
              <code>{activeDocument.path}</code>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function MarkdownContent({
  content,
  documentPath,
}: {
  content: string;
  documentPath: string;
}) {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        key={documentPath}
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 id={slugify(String(children))}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 id={slugify(String(children))}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={slugify(String(children))}>{children}</h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
