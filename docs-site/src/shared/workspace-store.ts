export type LearningStatus = "not-started" | "learning" | "completed" | "review";

export interface Bookmark {
  id: string;
  heading: string;
  note: string;
  createdAt: string;
}

export interface DocumentStudyState {
  status: LearningStatus;
  scrollTop: number;
  progress: number;
  bookmarks: Bookmark[];
  exerciseResults: Record<string, boolean>;
  updatedAt: string;
}

export interface StudySnapshot {
  documents: Record<string, DocumentStudyState>;
  dailyPaths: string[];
  dailyDate: string;
  updatedAt: string;
}

interface DraftEntry {
  content: string;
  baseRevision: string;
  updatedAt: string;
}

const draftsKey = "docs-drafts-v1";
const studyKey = "docs-study-v1";

const emptyStudy = (): StudySnapshot => ({
  documents: {},
  dailyPaths: [],
  dailyDate: "",
  updatedAt: new Date(0).toISOString(),
});

const emptyDocument = (): DocumentStudyState => ({
  status: "not-started",
  scrollTop: 0,
  progress: 0,
  bookmarks: [],
  exerciseResults: {},
  updatedAt: new Date(0).toISOString(),
});

const mergeBookmarks = (cloud: Bookmark[], local: Bookmark[]): Bookmark[] => {
  const bookmarks = new Map(cloud.map((bookmark) => [bookmark.id, bookmark]));
  for (const localBookmark of local) {
    const cloudBookmark = bookmarks.get(localBookmark.id);
    if (!cloudBookmark || localBookmark.note.trim() || !cloudBookmark.note.trim()) {
      bookmarks.set(localBookmark.id, localBookmark);
    }
  }
  return [...bookmarks.values()];
};

/** Stores local drafts separately from syncable learning data. */
export class DocumentWorkspaceStore {
  public readDrafts(): Record<string, DraftEntry> {
    return this.read<Record<string, DraftEntry>>(draftsKey, {});
  }

  public saveDraft(path: string, content: string, baseRevision: string): void {
    const drafts = this.readDrafts();
    drafts[path] = { content, baseRevision, updatedAt: new Date().toISOString() };
    this.write(draftsKey, drafts);
  }

  public removeDraft(path: string): void {
    const drafts = this.readDrafts();
    delete drafts[path];
    this.write(draftsKey, drafts);
  }

  public readStudy(): StudySnapshot {
    return this.read<StudySnapshot>(studyKey, emptyStudy());
  }

  public document(path: string): DocumentStudyState {
    return this.readStudy().documents[path] ?? emptyDocument();
  }

  public updateDocument(
    path: string,
    update: Partial<Omit<DocumentStudyState, "updatedAt">>,
  ): StudySnapshot {
    const study = this.readStudy();
    const now = new Date().toISOString();
    study.documents[path] = { ...emptyDocument(), ...study.documents[path], ...update, updatedAt: now };
    study.updatedAt = now;
    this.write(studyKey, study);
    return study;
  }

  public dailyTasks(paths: string[], count = 5): StudySnapshot {
    const study = this.readStudy();
    const today = new Date().toISOString().slice(0, 10);
    if (study.dailyDate === today && study.dailyPaths.length) return study;
    const candidates = paths.filter((path) => study.documents[path]?.status !== "completed");
    const shuffled = [...candidates];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    study.dailyPaths = shuffled.slice(0, count);
    study.dailyDate = today;
    study.updatedAt = new Date().toISOString();
    this.write(studyKey, study);
    return study;
  }

  public mergeCloud(cloud: StudySnapshot): StudySnapshot {
    const local = this.readStudy();
    const documents = { ...cloud.documents };
    for (const [path, localDocument] of Object.entries(local.documents)) {
      const cloudDocument = documents[path];
      if (!cloudDocument) {
        documents[path] = localDocument;
        continue;
      }
      const newerDocument = localDocument.updatedAt >= cloudDocument.updatedAt
        ? localDocument
        : cloudDocument;
      documents[path] = {
        ...newerDocument,
        bookmarks: mergeBookmarks(cloudDocument.bookmarks ?? [], localDocument.bookmarks ?? []),
      };
    }
    const newerSnapshot = local.updatedAt >= cloud.updatedAt ? local : cloud;
    const updatedAt = Object.values(documents).reduce(
      (latest, document) => document.updatedAt > latest ? document.updatedAt : latest,
      local.updatedAt > cloud.updatedAt ? local.updatedAt : cloud.updatedAt,
    );
    const merged = { ...newerSnapshot, documents, updatedAt };
    this.write(studyKey, merged);
    return merged;
  }

  private read<T>(key: string, fallback: T): T {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "") as T;
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The app remains usable when browser storage is unavailable.
    }
  }
}