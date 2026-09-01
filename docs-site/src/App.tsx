import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Eye,
  Layers,
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
import { RichMarkdownEditor } from "./RichMarkdownEditor";
import { SaveReviewDialog, type DocumentDiff } from "./SaveReviewDialog";
import { StudyPanel } from "./StudyPanel";
import { TextAnnotations } from "./TextAnnotations";
import {
  AnnotationStore,
  type TextAnnotation,
} from "./shared/annotation-store";
import { StudySyncClient } from "./shared/study-sync";
import {
  DocumentWorkspaceStore,
  type DocumentStudyState,
  type StudySnapshot,
} from "./shared/workspace-store";

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

interface BatchSaveResponse {
  valid?: boolean;
  errors?: string[];
  documents?: SaveResponse["document"][];
}

const defaultDocumentPath =
  "zero-to-work-english/04-工作沟通B1/software-workplace-grammar-guide.zh.md";
const lastDocumentStorageKey = "docs-last-document";
const readingPositionsStorageKey = "docs-reading-positions";

class ReadingProgressStore {
  public readLastDocument(): string | undefined {
    try {
      return localStorage.getItem(lastDocumentStorageKey) ?? undefined;
    } catch {
      return undefined;
    }
  }

  public saveLastDocument(path: string): void {
    try {
      localStorage.setItem(lastDocumentStorageKey, path);
    } catch {
      // Browsing still works when storage is unavailable.
    }
  }

  public readPosition(path: string): number {
    try {
      const positions = JSON.parse(
        localStorage.getItem(readingPositionsStorageKey) ?? "{}",
      ) as Record<string, unknown>;
      const position = positions[path];
      return typeof position === "number" && position >= 0 ? position : 0;
    } catch {
      return 0;
    }
  }

  public savePosition(path: string, position: number): void {
    try {
      const positions = JSON.parse(
        localStorage.getItem(readingPositionsStorageKey) ?? "{}",
      ) as Record<string, unknown>;
      positions[path] = Math.max(0, Math.round(position));
      localStorage.setItem(readingPositionsStorageKey, JSON.stringify(positions));
    } catch {
      // Browsing still works when storage is unavailable.
    }
  }
}

const readingProgress = new ReadingProgressStore();
const workspace = new DocumentWorkspaceStore();
const annotationStore = new AnnotationStore();
const studySync = new StudySyncClient();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

const readDocumentPath = () =>
  new URL(window.location.href).searchParams.get("doc") ??
  readingProgress.readLastDocument() ??
  defaultDocumentPath;

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

async function saveManyToLocalServer(
  changes: { path: string; content: string; expectedRevision: string }[],
): Promise<Record<string, string>> {
  const response = await fetch("/api/documents", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes }),
  });
  const result = (await response.json()) as BatchSaveResponse;
  if (!response.ok || !result.documents) {
    throw new SaveError(result.errors ?? ["The documents could not be saved."]);
  }
  return Object.fromEntries(
    result.documents.map((document) => [document!.path, document!.revision]),
  );
}

class DocumentCatalog {
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
  const storedDrafts = useRef(workspace.readDrafts());
  const [activePath, setActivePath] = useState(readDocumentPath);
  const [query, setQuery] = useState("");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(storedDrafts.current).map(([path, entry]) => [path, entry.content]),
    ),
  );
  const [savedContent, setSavedContent] = useState<Record<string, string>>({});
  const [revisions, setRevisions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(storedDrafts.current).map(([path, entry]) => [path, entry.baseRevision]),
    ),
  );
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [commitUrl, setCommitUrl] = useState<string>();
  const [progress, setProgress] = useState<Progress>();
  const [token, setToken] = useState(() => github.token);
  const [reviewDocuments, setReviewDocuments] = useState<DocumentDiff[]>([]);
  const [study, setStudy] = useState<StudySnapshot>(() =>
    workspace.dailyTasks(documents.map((document) => document.path)),
  );
  const [annotations, setAnnotations] = useState<TextAnnotation[]>(() =>
    annotationStore.readAll(),
  );
  const [studyOpen, setStudyOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState("");
  const [userEmail, setUserEmail] = useState<string>();
  const [syncMessage, setSyncMessage] = useState("");
  const [exerciseMode, setExerciseMode] = useState(false);
  const [wrongOnly, setWrongOnly] = useState(false);
  const [mobileEditorView, setMobileEditorView] = useState<"edit" | "preview">("edit");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const documentMainRef = useRef<HTMLElement>(null);
  const syncInFlightRef = useRef(false);
  const activeDocument = catalog.find(activePath);
  const draft = drafts[activePath] ?? activeDocument.content;
  const persistedContent = savedContent[activePath] ?? activeDocument.content;
  const isDirty = draft !== persistedContent;
  const filteredDocuments = catalog.filter(query);
  const displayContent = isEditing ? draft : persistedContent;
  const headings = getHeadings(displayContent);
  const dirtyPaths = documents
    .map((document) => document.path)
    .filter((path) => {
      const document = catalog.find(path);
      return drafts[path] !== undefined && drafts[path] !== (savedContent[path] ?? document.content);
    });
  const studyDocument = study.documents[activePath] ?? workspace.document(activePath);
  const dailyTasks = study.dailyPaths
    .filter((path) => documents.some((document) => document.path === path))
    .map((path) => ({ path, title: catalog.find(path).title }));
  const exerciseCount = (persistedContent.match(/<details(?:\s[^>]*)?>/gi) ?? []).length;
  const activeAnnotations = annotations.filter(
    (annotation) => annotation.documentPath === activePath && !annotation.deletedAt,
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("doc")) return;
    url.searchParams.set("doc", activePath);
    window.history.replaceState({}, "", url);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = readDocumentPath();
      if (nextPath === activePath) return;
      if (isDirty && !window.confirm("This document has a local draft. Leave it and continue?")) {
        const url = new URL(window.location.href);
        url.searchParams.set("doc", activePath);
        url.hash = "";
        window.history.pushState({}, "", url);
        return;
      }
      setActivePath(nextPath);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activePath, isDirty]);

  useEffect(() => {
    if (!dirtyPaths.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyPaths.length]);

  useEffect(() => {
    if (!studySync.configured) return;
    void studySync.user()
      .then((user) => {
        setUserEmail(user?.email);
        setAnnotations(annotationStore.setScope(user?.id));
      })
      .catch((error: unknown) => {
        setSyncMessage(error instanceof Error ? error.message : "Could not read the sync session");
      });
  }, []);

  useEffect(() => {
    const refreshAnnotations = (event: StorageEvent) => {
      if (event.key === annotationStore.storageKey) {
        setAnnotations(annotationStore.readAll());
      }
    };
    window.addEventListener("storage", refreshAnnotations);
    return () => window.removeEventListener("storage", refreshAnnotations);
  }, [userEmail]);

  useEffect(() => {
    const answers = documentMainRef.current?.querySelectorAll<HTMLDetailsElement>(
      ".markdown-body details",
    );
    answers?.forEach((answer, index) => {
      answer.classList.toggle("exercise-answer", exerciseMode);
      answer.classList.toggle(
        "exercise-correct",
        wrongOnly && studyDocument.exerciseResults[String(index)] === true,
      );
      if (exerciseMode) answer.open = false;
    });
  }, [activePath, exerciseMode, isEditing, wrongOnly, studyDocument.exerciseResults]);

  useLayoutEffect(() => {
    setSaveState("idle");
    setSaveErrors([]);
    setIsEditing(false);
  }, [activePath]);

  useLayoutEffect(() => {
    if (isEditing || !documentMainRef.current) return;
    documentMainRef.current.scrollTo({
      top: readingProgress.readPosition(activePath),
      behavior: "auto",
    });
  }, [activePath, isEditing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setNavigationOpen(false);
        setStudyOpen(false);
        setReviewDocuments([]);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (isEditing) reviewSave([activePath]);
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
    if (isDirty && !window.confirm("This document has a local draft. Leave it and continue?")) return;
    if (documentMainRef.current) {
      readingProgress.savePosition(activePath, documentMainRef.current.scrollTop);
    }
    readingProgress.saveLastDocument(path);
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
    if (content === persistedContent) {
      workspace.removeDraft(activePath);
    } else {
      workspace.saveDraft(
        activePath,
        content,
        revisions[activePath] ?? activeDocument.revision,
      );
    }
    setSaveState("idle");
    setSaveErrors([]);
  };

  const startEditing = () => {
    setSaveState("idle");
    setSaveErrors([]);
    setProgress(undefined);
    setMobileEditorView("edit");
    setIsEditing(true);
  };
  const cancelEditing = () => {
    if (isDirty && !window.confirm("Discard the local draft for this document?")) return;
    workspace.removeDraft(activePath);
    setDrafts((current) => ({
      ...current,
      [activePath]: persistedContent,
    }));
    setSaveState("idle");
    setSaveErrors([]);
    setIsEditing(false);
  };

  const reviewSave = (paths: string[]) => {
    const changed = paths.filter((path) => dirtyPaths.includes(path));
    if (!changed.length || saveState === "saving") return;
    setReviewDocuments(changed.map((path) => {
      const document = catalog.find(path);
      return {
        path,
        before: savedContent[path] ?? document.content,
        after: drafts[path] ?? document.content,
      };
    }));
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

  const saveDocuments = async () => {
    if (!reviewDocuments.length || saveState === "saving") return;
    setSaveState("saving");
    setSaveErrors([]);

    try {
      const changes = reviewDocuments.map((document) => ({
        path: document.path,
        content: document.after,
        expectedRevision: revisions[document.path] ?? catalog.find(document.path).revision,
      }));
      const result = savesToGitHub
        ? await github.saveMany(changes)
        : {
            revisions: reviewDocuments.length === 1
              ? {
                  [changes[0].path]: await saveToLocalServer(
                    changes[0].path,
                    changes[0].content,
                    changes[0].expectedRevision,
                  ),
                }
              : await saveManyToLocalServer(changes),
          };

      setSavedContent((current) => ({
        ...current,
        ...Object.fromEntries(changes.map((change) => [change.path, change.content])),
      }));
      setRevisions((current) => ({ ...current, ...result.revisions }));
      changes.forEach((change) => workspace.removeDraft(change.path));
      setCommitUrl("commitUrl" in result ? result.commitUrl : undefined);
      setSaveState("saved");
      setIsEditing(false);
      setReviewDocuments([]);

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

  const updateStudyDocument = (
    update: Partial<Omit<DocumentStudyState, "updatedAt">>,
  ) => setStudy(workspace.updateDocument(activePath, update));

  const syncStudy = async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      setSyncMessage("Syncing…");
      const user = await studySync.user();
      if (!user) throw new Error("Sign in before syncing.");
      setAnnotations(annotationStore.setScope(user.id));
      const syncStorageKey = annotationStore.storageKey;
      const [cloud, cloudAnnotations] = await Promise.all([
        studySync.pull(),
        studySync.pullAnnotations(),
      ]);
      if (annotationStore.storageKey !== syncStorageKey) return;
      const merged = cloud ? workspace.mergeCloud(cloud) : workspace.readStudy();
      const mergedAnnotations = annotationStore.mergeCloud(cloudAnnotations);
      await Promise.all([
        studySync.push(merged),
        studySync.pushAnnotations(mergedAnnotations),
      ]);
      const canonicalAnnotations = await studySync.pullAnnotations();
      if (annotationStore.storageKey !== syncStorageKey) return;
      const finalAnnotations = annotationStore.mergeCloud(canonicalAnnotations);
      setStudy(merged);
      setAnnotations(finalAnnotations);
      const syncedPosition = merged.documents[activePath]?.scrollTop;
      if (typeof syncedPosition === "number") {
        documentMainRef.current?.scrollTo({ top: syncedPosition, behavior: "auto" });
        readingProgress.savePosition(activePath, syncedPosition);
      }
      setSyncMessage("Synced");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      syncInFlightRef.current = false;
    }
  };

  const sendMagicLink = async (email: string) => {
    try {
      await studySync.sendMagicLink(email);
      setSyncMessage("Check your email for the sign-in link.");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sign-in failed");
    }
  };

  const signOut = async () => {
    try {
      await studySync.signOut();
      setUserEmail(undefined);
      setAnnotations(annotationStore.setScope());
      setSyncMessage("Signed out");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sign-out failed");
    }
  };

  const saveAnnotation = (annotation: TextAnnotation) => {
    setAnnotations(annotationStore.save(annotation));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotationStore.remove(id));
  };

  const selectAnnotation = (id: string) => {
    setStudyOpen(false);
    window.requestAnimationFrame(() => {
      const mark = documentMainRef.current?.querySelector<HTMLElement>(
        `mark[data-annotation-id="${CSS.escape(id)}"]`,
      );
      mark?.scrollIntoView({ behavior: "smooth", block: "center" });
      mark?.click();
    });
  };

  const handleDocumentScroll = (element: HTMLElement) => {
    readingProgress.savePosition(activePath, element.scrollTop);
    const scrollRange = Math.max(1, element.scrollHeight - element.clientHeight);
    const progressValue = Math.min(100, (element.scrollTop / scrollRange) * 100);
    if (Math.round(progressValue) !== Math.round(studyDocument.progress)) {
      setStudy(workspace.updateDocument(activePath, {
        scrollTop: element.scrollTop,
        progress: progressValue,
        status: studyDocument.status === "not-started" ? "learning" : studyDocument.status,
      }));
    }
    const current = [...element.querySelectorAll<HTMLElement>(".markdown-body h2, .markdown-body h3")]
      .filter((heading) => heading.offsetTop <= element.scrollTop + 140)
      .at(-1);
    setActiveHeading(current?.textContent ?? "");
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
                onClick={() => reviewSave([activePath])}
                disabled={!isDirty || saveState === "saving"}
              >
                <Save size={16} /> Save
              </button>
            </>
          ) : (
            <>
              {dirtyPaths.length > 0 && (
                <button className="batch-save-button" onClick={() => reviewSave(dirtyPaths)}>
                  <Layers size={16} /> Save all ({dirtyPaths.length})
                </button>
              )}
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
          <button className="icon-button study-button" onClick={() => setStudyOpen(true)} aria-label="Open study tools">
            <GraduationCap size={19} />
          </button>
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
        <main className={`editor-workspace mobile-view-${mobileEditorView}`}>
          <div className="mobile-editor-view-control" aria-label="Mobile editor view">
            <button
              className={mobileEditorView === "edit" ? "active" : ""}
              type="button"
              aria-pressed={mobileEditorView === "edit"}
              onClick={() => setMobileEditorView("edit")}
            >
              <Pencil size={15} /> Editor
            </button>
            <button
              className={mobileEditorView === "preview" ? "active" : ""}
              type="button"
              aria-pressed={mobileEditorView === "preview"}
              onClick={() => setMobileEditorView("preview")}
            >
              <Eye size={15} /> Preview
            </button>
          </div>
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
                <small>Saved in this browser until you clear the field.</small>
              </label>
            )}
            <RichMarkdownEditor
              key={activePath}
              markdown={draft}
              onChange={updateDraft}
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
          <main
            className="document-main"
            ref={documentMainRef}
            onScroll={(event) => handleDocumentScroll(event.currentTarget)}
          >
            <div className="document-kicker">
              {activeDocument.section.replace(/^\d+\.\s*/, "")}
            </div>
            <MarkdownContent
              content={persistedContent}
              documentPath={activeDocument.path}
              annotations={activeAnnotations}
              onSaveAnnotation={saveAnnotation}
              onDeleteAnnotation={deleteAnnotation}
            />
          </main>
          <aside className="page-outline">
            <div className="outline-label">On this page</div>
            <nav>
              {headings.map((heading) => (
                <a
                  key={`${heading.id}-${heading.label}`}
                  className={`${heading.level === 3 ? "nested" : ""} ${heading.label === activeHeading ? "active" : ""}`}
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
      <StudyPanel
        open={studyOpen}
        path={activePath}
        activeHeading={activeHeading}
        state={studyDocument}
        exerciseCount={exerciseCount}
        dailyTasks={dailyTasks}
        syncConfigured={studySync.configured}
        userEmail={userEmail}
        syncMessage={syncMessage}
        exerciseMode={exerciseMode}
        wrongOnly={wrongOnly}
        annotations={activeAnnotations}
        onClose={() => setStudyOpen(false)}
        onSelectDocument={selectDocument}
        onUpdate={updateStudyDocument}
        onMagicLink={sendMagicLink}
        onSignOut={signOut}
        onSync={syncStudy}
        onExerciseMode={setExerciseMode}
        onWrongOnly={setWrongOnly}
        onSelectAnnotation={selectAnnotation}
        onDeleteAnnotation={deleteAnnotation}
      />
      {studyOpen && <button className="study-scrim" aria-label="Close study tools" onClick={() => setStudyOpen(false)} />}
      {reviewDocuments.length > 0 && (
        <SaveReviewDialog
          documents={reviewDocuments}
          saving={saveState === "saving"}
          errors={saveErrors}
          onCancel={() => setReviewDocuments([])}
          onConfirm={() => void saveDocuments()}
        />
      )}
    </div>
  );
}

function MarkdownContent({
  content,
  documentPath,
  annotations,
  onSaveAnnotation,
  onDeleteAnnotation,
}: {
  content: string;
  documentPath: string;
  annotations?: TextAnnotation[];
  onSaveAnnotation?: (annotation: TextAnnotation) => void;
  onDeleteAnnotation?: (id: string) => void;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const annotationKey = annotations
    ?.map((annotation) => `${annotation.id}:${annotation.updatedAt}`)
    .join("|");
  return (
    <>
      <article className="markdown-body" ref={articleRef} key={`${documentPath}:${annotationKey}`}>
        <ReactMarkdown
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
      {annotations && onSaveAnnotation && onDeleteAnnotation && (
        <TextAnnotations
          containerRef={articleRef}
          documentPath={documentPath}
          annotations={annotations}
          onSave={onSaveAnnotation}
          onDelete={onDeleteAnnotation}
        />
      )}
    </>
  );
}
