import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Eye,
  Layers,
  LibraryBig,
  LogIn,
  Menu,
  Palette,
  Pencil,
  Play,
  Save,
  Search,
  Volume2,
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
import { AuthDialog } from "../../shared/auth/AuthDialog";
import { auth } from "../../shared/auth/auth-client";
import "../../shared/auth/auth-dialog.css";
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
const readingAppearanceStorageKey = "docs-reading-appearance";
const audioPositionsStorageKey = "docs-audio-positions";
const audioPlaylistProgressStorageKey = "docs-audio-playlist-progress";
const audioVoiceStorageKey = "docs-audio-voice";

type ReadingMode = "cool" | "soft" | "crisp";
type ReadingSize = "small" | "medium" | "large";

interface ReadingAppearance {
  mode: ReadingMode;
  size: ReadingSize;
}

interface AudioPlaylistManifest {
  version: 1;
  chineseVoice: { id: string; label: string };
  englishRepeatCount: number;
  voices: { id: string; label: string }[];
  examples: {
    chinese: string;
    english: string;
    chineseAudio: string;
    englishAudio: Record<string, string>;
  }[];
}

interface AudioPlaylistProgress {
  exampleIndex: number;
  phase: "chinese" | "english";
  englishPlayNumber: number;
  currentTime: number;
}

class ReadingAppearanceStore {
  public read(): ReadingAppearance {
    try {
      const value = JSON.parse(
        localStorage.getItem(readingAppearanceStorageKey) ?? "{}",
      ) as Partial<ReadingAppearance>;
      return {
        mode: value.mode === "soft" || value.mode === "crisp" ? value.mode : "cool",
        size: value.size === "small" || value.size === "large" ? value.size : "medium",
      };
    } catch {
      return { mode: "cool", size: "medium" };
    }
  }

  public save(appearance: ReadingAppearance): void {
    try {
      localStorage.setItem(readingAppearanceStorageKey, JSON.stringify(appearance));
    } catch {
      // Reading controls still work for the current session.
    }
  }
}

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

class AudioProgressStore {
  public readPosition(path: string): number {
    try {
      const positions = JSON.parse(
        localStorage.getItem(audioPositionsStorageKey) ?? "{}",
      ) as Record<string, unknown>;
      const position = positions[path];
      return typeof position === "number" && Number.isFinite(position) && position > 0
        ? position
        : 0;
    } catch {
      return 0;
    }
  }

  public savePosition(path: string, position: number): void {
    try {
      const positions = JSON.parse(
        localStorage.getItem(audioPositionsStorageKey) ?? "{}",
      ) as Record<string, unknown>;
      positions[path] = Math.max(0, position);
      localStorage.setItem(audioPositionsStorageKey, JSON.stringify(positions));
    } catch {
      // Audio playback still works when storage is unavailable.
    }
  }

  public clearPosition(path: string): void {
    try {
      const positions = JSON.parse(
        localStorage.getItem(audioPositionsStorageKey) ?? "{}",
      ) as Record<string, unknown>;
      delete positions[path];
      localStorage.setItem(audioPositionsStorageKey, JSON.stringify(positions));
    } catch {
      // Audio playback still works when storage is unavailable.
    }
  }
}

class AudioPlaylistSettingsStore {
  public readProgress(path: string): AudioPlaylistProgress | undefined {
    try {
      const progress = JSON.parse(
        localStorage.getItem(audioPlaylistProgressStorageKey) ?? "{}",
      ) as Record<string, AudioPlaylistProgress>;
      return progress[path];
    } catch {
      return undefined;
    }
  }

  public saveProgress(path: string, progress: AudioPlaylistProgress): void {
    try {
      const values = JSON.parse(
        localStorage.getItem(audioPlaylistProgressStorageKey) ?? "{}",
      ) as Record<string, AudioPlaylistProgress>;
      values[path] = progress;
      localStorage.setItem(audioPlaylistProgressStorageKey, JSON.stringify(values));
    } catch {
      // Playlist playback still works when storage is unavailable.
    }
  }

  public clearProgress(path: string): void {
    try {
      const values = JSON.parse(
        localStorage.getItem(audioPlaylistProgressStorageKey) ?? "{}",
      ) as Record<string, AudioPlaylistProgress>;
      delete values[path];
      localStorage.setItem(audioPlaylistProgressStorageKey, JSON.stringify(values));
    } catch {
      // Playlist playback still works when storage is unavailable.
    }
  }

  public readVoice(): string | undefined {
    try {
      return localStorage.getItem(audioVoiceStorageKey) ?? undefined;
    } catch {
      return undefined;
    }
  }

  public saveVoice(voiceId: string): void {
    try {
      localStorage.setItem(audioVoiceStorageKey, voiceId);
    } catch {
      // Voice selection still works for the current session.
    }
  }
}

const readingProgress = new ReadingProgressStore();
const audioProgress = new AudioProgressStore();
const audioPlaylistSettings = new AudioPlaylistSettingsStore();
const readingAppearanceStore = new ReadingAppearanceStore();
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

const canonicalAudioDocumentPath = (path: string) =>
  path.endsWith(".zh.md") ? `${path.slice(0, -6)}.md` : path;

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
  const [readingAppearance, setReadingAppearance] = useState<ReadingAppearance>(() =>
    readingAppearanceStore.read(),
  );
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const documentMainRef = useRef<HTMLElement>(null);
  const appearanceRef = useRef<HTMLDetailsElement>(null);
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
    if (!appearanceOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!appearanceRef.current?.contains(event.target as Node)) setAppearanceOpen(false);
    };
    const dismissWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAppearanceOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissWithKeyboard);
    };
  }, [appearanceOpen]);

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
    // Picks up sign-in and sign-out performed in the trainer app or another tab.
    return auth.onChange((_event, session) => {
      setUserEmail(session?.user.email);
      setAnnotations(annotationStore.setScope(session?.user.id));
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

  const openSignIn = () => setAuthOpen(true);

  const refreshSignedInUser = () => {
    void auth
      .currentUser()
      .then((user) => {
        setUserEmail(user?.email);
        setAnnotations(annotationStore.setScope(user?.id));
        if (user) void syncStudy();
      })
      .catch(() => setSyncMessage("Could not read the sync session"));
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

  const updateReadingAppearance = (update: Partial<ReadingAppearance>) => {
    const next = { ...readingAppearance, ...update };
    setReadingAppearance(next);
    readingAppearanceStore.save(next);
  };

  return (
    <div
      className={`app-shell reading-${readingAppearance.mode} reading-${readingAppearance.size} ${isEditing ? "is-editing" : ""}`}
    >
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
          {!isEditing && studySync.configured && !userEmail && (
            <button className="secondary-command sign-in-button" onClick={openSignIn}>
              <LogIn size={16} /> Sign in
            </button>
          )}
          {!isEditing && (
            <details className="appearance-control" open={appearanceOpen} ref={appearanceRef}>
              <summary
                className="icon-button"
                aria-label="Reading appearance"
                title="Reading appearance"
                onClick={(event) => {
                  event.preventDefault();
                  setAppearanceOpen((open) => !open);
                }}
              >
                <Palette size={19} />
              </summary>
              <div className="appearance-menu">
                <span className="appearance-label">Reading mode</span>
                <div className="reading-mode-options">
                  {(["cool", "soft", "crisp"] as const).map((mode) => (
                    <button
                      type="button"
                      className={readingAppearance.mode === mode ? "active" : ""}
                      onClick={() => updateReadingAppearance({ mode })}
                      key={mode}
                    >
                      <span className={`mode-swatch ${mode}`} />
                      {mode === "cool" ? "Cool" : mode === "soft" ? "Soft" : "Crisp"}
                      {readingAppearance.mode === mode && <Check size={14} />}
                    </button>
                  ))}
                </div>
                <span className="appearance-label">Text size</span>
                <div className="reading-size-options" aria-label="Reading text size">
                  {(["small", "medium", "large"] as const).map((size, index) => (
                    <button
                      type="button"
                      className={readingAppearance.size === size ? "active" : ""}
                      aria-label={`${size} reading text`}
                      onClick={() => updateReadingAppearance({ size })}
                      key={size}
                    >
                      A{index === 0 ? "−" : index === 2 ? "+" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          )}
          <button className="icon-button study-button" onClick={() => setStudyOpen(true)} aria-label="Open study tools">
            <GraduationCap size={19} />
          </button>
          <a className="icon-button words-button" href={`${import.meta.env.VITE_SITE_BASE_PATH ?? import.meta.env.BASE_URL}words`} aria-label="Open my words" title="My words">
            <LibraryBig size={19} />
          </a>
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
              documentTitle={activeDocument.title}
              audioPath={activeDocument.audioPath}
              audioPlaylistPath={activeDocument.audioPlaylistPath}
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
              documentTitle={activeDocument.title}
              audioPath={activeDocument.audioPath}
              audioPlaylistPath={activeDocument.audioPlaylistPath}
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
        onOpenSignIn={openSignIn}
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
      <AuthDialog
        open={authOpen}
        email={userEmail}
        onClose={() => setAuthOpen(false)}
        onSignedIn={refreshSignedInUser}
        onSignedOut={() => {
          setUserEmail(undefined);
          setAnnotations(annotationStore.setScope());
          setSyncMessage("Signed out");
        }}
      />
    </div>
  );
}

function MarkdownContent({
  content,
  documentPath,
  documentTitle,
  audioPath,
  audioPlaylistPath,
  annotations,
  onSaveAnnotation,
  onDeleteAnnotation,
}: {
  content: string;
  documentPath: string;
  documentTitle: string;
  audioPath?: string;
  audioPlaylistPath?: string;
  annotations?: TextAnnotation[];
  onSaveAnnotation?: (annotation: TextAnnotation) => void;
  onDeleteAnnotation?: (id: string) => void;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const sentenceAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaylist, setAudioPlaylist] = useState<AudioPlaylistManifest>();
  const annotationKey = annotations
    ?.map((annotation) => `${annotation.id}:${annotation.updatedAt}`)
    .join("|");

  useEffect(() => {
    sentenceAudioRef.current?.pause();
    sentenceAudioRef.current = null;
    setAudioPlaylist(undefined);
    if (!audioPlaylistPath) return;

    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}${audioPlaylistPath}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load sentence audio.");
        return response.json() as Promise<AudioPlaylistManifest>;
      })
      .then(setAudioPlaylist)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      });
    return () => controller.abort();
  }, [audioPlaylistPath]);

  useEffect(() => () => sentenceAudioRef.current?.pause(), []);

  const playSentence = (audioPath: string) => {
    sentenceAudioRef.current?.pause();
    const audio = new Audio(`${import.meta.env.BASE_URL}${audioPath}`);
    sentenceAudioRef.current = audio;
    void audio.play();
  };

  return (
    <>
      <article className="markdown-body" ref={articleRef} key={`${documentPath}:${annotationKey}`}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <>
                <h1 id={slugify(String(children))}>{children}</h1>
                <DocumentAudioPlayer
                  title={documentTitle}
                  documentPath={documentPath}
                  audioPath={audioPath}
                  audioPlaylistPath={audioPlaylistPath}
                />
              </>
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
            code: ({ className, children, ...props }) => {
              const value = String(children).replace(/\n$/, "");
              const inlineExample = !className
                ? audioPlaylist?.examples.find((example) => example.english === value)
                : undefined;
              if (inlineExample) {
                return (
                  <span className="inline-audio-example">
                    <code {...props}>{children}</code>
                    <button
                      type="button"
                      className="sentence-audio-button is-inline"
                      aria-label={`播放：${inlineExample.english}`}
                      title="播放 Jenny 英文朗读"
                      onClick={() => playSentence(inlineExample.englishAudio["jenny-us"])}
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  </span>
                );
              }
              const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
              const examples = className === "language-text" && audioPlaylist && lines.length % 2 === 0
                ? lines.reduce<AudioPlaylistManifest["examples"]>((matches, english, index) => {
                    if (index % 2 !== 0) return matches;
                    const chinese = lines[index + 1];
                    const example = audioPlaylist.examples.find(
                      (candidate) => candidate.english === english && candidate.chinese === chinese,
                    );
                    return example ? [...matches, example] : matches;
                  }, [])
                : [];
              if (examples.length * 2 !== lines.length) {
                return <code className={className} {...props}>{children}</code>;
              }
              return (
                <span className="bilingual-example-list">
                  {examples.map((example) => (
                    <span className="bilingual-example" key={`${example.english}:${example.chinese}`}>
                      <span className="bilingual-example-copy">
                        <strong>{example.english}</strong>
                        <span>{example.chinese}</span>
                      </span>
                      <button
                        type="button"
                        className="sentence-audio-button"
                        aria-label={`播放：${example.english}`}
                        title="播放 Jenny 英文朗读"
                        onClick={() => playSentence(example.englishAudio["jenny-us"])}
                      >
                        <Play size={15} fill="currentColor" />
                      </button>
                    </span>
                  ))}
                </span>
              );
            },
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

function DocumentAudioPlayer({
  title,
  documentPath,
  audioPath,
  audioPlaylistPath,
}: {
  title: string;
  documentPath: string;
  audioPath?: string;
  audioPlaylistPath?: string;
}) {
  if (!audioPath && audioPlaylistPath) {
    return (
      <DocumentAudioPlaylistPlayer
        title={title}
        documentPath={documentPath}
        playlistPath={audioPlaylistPath}
      />
    );
  }
  return (
    <LegacyDocumentAudioPlayer
      title={title}
      documentPath={documentPath}
      audioPath={audioPath}
      voiceLabel={audioPlaylistPath ? "Jenny 慢速英文" : "Michelle 慢速英文"}
    />
  );
}

function LegacyDocumentAudioPlayer({
  title,
  documentPath,
  audioPath,
  voiceLabel,
}: {
  title: string;
  documentPath: string;
  audioPath?: string;
  voiceLabel: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const savedPositionRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const progressKey = canonicalAudioDocumentPath(documentPath);

  const saveCurrentPosition = () => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.currentTime) || audio.currentTime <= 0) return;
    audioProgress.savePosition(progressKey, audio.currentTime);
    lastSavedAtRef.current = Date.now();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioPath) return;

    const savedPosition = audioProgress.readPosition(progressKey);
    savedPositionRef.current = savedPosition;
    const restorePosition = () => {
      if (
        savedPositionRef.current > 0 &&
        Number.isFinite(audio.duration) &&
        audio.duration > 1
      ) {
        audio.currentTime = Math.min(savedPositionRef.current, audio.duration - 1);
      }
    };
    if (audio.readyState >= 1) restorePosition();
    else audio.addEventListener("loadedmetadata", restorePosition);

    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveCurrentPosition();
    };
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      saveCurrentPosition();
      audio.removeEventListener("loadedmetadata", restorePosition);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [audioPath, progressKey]);

  return (
    <section className={`document-audio ${audioPath ? "is-ready" : "is-pending"}`} aria-label="Document audio">
      <div className="document-audio-heading">
        <Volume2 size={18} />
        <div>
          <strong>例句跟读</strong>
          <span>中文 1 遍 · {voiceLabel} 3 遍</span>
        </div>
      </div>
      {audioPath ? (
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          src={`${import.meta.env.BASE_URL}${audioPath}`}
          aria-label={`${title} 例句音频`}
          onTimeUpdate={() => {
            if (Date.now() - lastSavedAtRef.current >= 1000) saveCurrentPosition();
          }}
          onPause={saveCurrentPosition}
          onEnded={() => audioProgress.clearPosition(progressKey)}
        />
      ) : (
        <span className="audio-pending">该文档的音频正在准备中</span>
      )}
    </section>
  );
}

function DocumentAudioPlaylistPlayer({
  title,
  documentPath,
  playlistPath,
}: {
  title: string;
  documentPath: string;
  playlistPath: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldContinueRef = useRef(false);
  const restoreTimeRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const progressKey = canonicalAudioDocumentPath(documentPath);
  const [manifest, setManifest] = useState<AudioPlaylistManifest>();
  const [voiceId, setVoiceId] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState<"chinese" | "english">("chinese");
  const [englishPlayNumber, setEnglishPlayNumber] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}${playlistPath}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the audio playlist.");
        return response.json() as Promise<AudioPlaylistManifest>;
      })
      .then((value) => {
        if (!value.examples.length || !value.voices.length) {
          throw new Error("The audio playlist is empty.");
        }
        const savedVoice = audioPlaylistSettings.readVoice();
        setVoiceId(value.voices.some((voice) => voice.id === savedVoice)
          ? savedVoice!
          : value.voices[0].id);
        const saved = audioPlaylistSettings.readProgress(progressKey);
        if (saved && saved.exampleIndex < value.examples.length) {
          setExampleIndex(saved.exampleIndex);
          setPhase(saved.phase);
          setEnglishPlayNumber(saved.englishPlayNumber);
          restoreTimeRef.current = saved.currentTime;
        }
        setManifest(value);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      });
    return () => controller.abort();
  }, [playlistPath, progressKey]);

  const example = manifest?.examples[exampleIndex];
  const segmentPath = phase === "chinese"
    ? example?.chineseAudio
    : example?.englishAudio[voiceId];

  const saveProgress = () => {
    const audio = audioRef.current;
    audioPlaylistSettings.saveProgress(progressKey, {
      exampleIndex,
      phase,
      englishPlayNumber,
      currentTime: audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    });
    lastSavedAtRef.current = Date.now();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !segmentPath) return;
    if (shouldContinueRef.current) void audio.play();
  }, [segmentPath, exampleIndex, phase, englishPlayNumber, voiceId]);

  useEffect(() => () => saveProgress(), [exampleIndex, phase, englishPlayNumber]);

  const advance = () => {
    if (!manifest) return;
    if (phase === "chinese") {
      setPhase("english");
      setEnglishPlayNumber(1);
      return;
    }
    if (englishPlayNumber < manifest.englishRepeatCount) {
      setEnglishPlayNumber((current) => current + 1);
      return;
    }
    if (exampleIndex + 1 < manifest.examples.length) {
      setExampleIndex((current) => current + 1);
      setPhase("chinese");
      setEnglishPlayNumber(1);
      return;
    }
    shouldContinueRef.current = false;
    audioPlaylistSettings.clearProgress(progressKey);
    setExampleIndex(0);
    setPhase("chinese");
    setEnglishPlayNumber(1);
  };

  return (
    <section className="document-audio document-audio-playlist" aria-label="Document audio">
      <div className="document-audio-heading">
        <Volume2 size={18} />
        <div>
          <strong>会议与 Demo 跟读</strong>
          <span>中文 1 遍 · 英文 {manifest?.englishRepeatCount ?? 10} 遍 · 自动保存进度</span>
        </div>
      </div>
      {manifest && example && segmentPath ? (
        <div className="playlist-player">
          <div className="playlist-controls">
            <label>
              英文声音
              <select
                value={voiceId}
                onChange={(event) => {
                  shouldContinueRef.current = false;
                  setVoiceId(event.target.value);
                  audioPlaylistSettings.saveVoice(event.target.value);
                }}
              >
                {manifest.voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>{voice.label}</option>
                ))}
              </select>
            </label>
            <span>{exampleIndex + 1} / {manifest.examples.length}</span>
            <span>{phase === "chinese" ? "中文" : `英文 ${englishPlayNumber} / ${manifest.englishRepeatCount}`}</span>
          </div>
          <div className="playlist-caption">
            <strong>{example.english}</strong>
            <span>{example.chinese}</span>
          </div>
          <audio
            key={`${segmentPath}:${englishPlayNumber}`}
            ref={audioRef}
            controls
            preload="metadata"
            src={`${import.meta.env.BASE_URL}${segmentPath}`}
            aria-label={`${title} 跟读音频`}
            onLoadedMetadata={(event) => {
              if (restoreTimeRef.current > 0) {
                event.currentTarget.currentTime = Math.min(
                  restoreTimeRef.current,
                  Math.max(0, event.currentTarget.duration - 0.1),
                );
                restoreTimeRef.current = 0;
              }
            }}
            onPlay={() => { shouldContinueRef.current = true; }}
            onPause={() => {
              if (!audioRef.current?.ended) shouldContinueRef.current = false;
              saveProgress();
            }}
            onTimeUpdate={() => {
              if (Date.now() - lastSavedAtRef.current >= 1000) saveProgress();
            }}
            onEnded={advance}
          />
        </div>
      ) : (
        <span className="audio-pending">正在加载多声音频</span>
      )}
    </section>
  );
}
