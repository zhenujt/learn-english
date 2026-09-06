import { beforeEach, describe, expect, it } from "vitest";
import { AnnotationStore, type TextAnnotation } from "./annotation-store";
import { DocumentWorkspaceStore, type StudySnapshot } from "./workspace-store";
import { WordStore, type SavedWord } from "./word-store";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const userId = "9fe18e20-9e38-4c0f-9f67-c62e5be49741";
const annotationId = "ced85971-0830-4e92-a6c4-013775c02170";

const annotation = (overrides: Partial<TextAnnotation> = {}): TextAnnotation => ({
  id: annotationId,
  documentPath: "lesson.md",
  quote: "A useful sentence",
  prefix: "",
  suffix: "",
  startOffset: 0,
  note: "local note",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const savedWord = (overrides: Partial<SavedWord> = {}): SavedWord => ({
  id: "3c1b0196-9e8f-453c-a193-f8c5092baf88",
  word: "thorough",
  pronunciation: "/ˈθʌrə/",
  meaning: "彻底的；全面的",
  example: "We need a thorough review before the demo.",
  pronunciationNote: "THUR-oh",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("sync storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  it("migrates anonymous annotations into the signed-in account", () => {
    const store = new AnnotationStore();
    store.save(annotation());

    expect(store.setScope(userId)).toEqual([annotation()]);
    expect(localStorage.getItem("docs-annotations-v2:anonymous")).toBeNull();
    expect(JSON.parse(localStorage.getItem(store.storageKey) ?? "[]")).toEqual([annotation()]);
  });

  it("does not replace a local annotation note with an empty cloud value", () => {
    const store = new AnnotationStore();
    store.setScope(userId);
    store.save(annotation());

    const merged = store.mergeCloud([
      annotation({ note: "", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ]);

    expect(merged[0].note).toBe("local note");
    expect(merged[0].updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("retains an explicit cloud deletion marker", () => {
    const store = new AnnotationStore();
    store.setScope(userId);
    store.save(annotation());
    const deletedAt = "2026-02-01T00:00:00.000Z";

    const merged = store.mergeCloud([
      annotation({ note: "", updatedAt: deletedAt, deletedAt }),
    ]);

    expect(merged[0].deletedAt).toBe(deletedAt);
    expect(merged[0].note).toBe("");
  });

  it("preserves local bookmark notes when cloud progress is newer", () => {
    const store = new DocumentWorkspaceStore();
    store.updateDocument("lesson.md", {
      bookmarks: [{
        id: "bookmark-1",
        heading: "Example",
        note: "local bookmark note",
        createdAt: "2026-01-01T00:00:00.000Z",
      }],
    });
    const cloud: StudySnapshot = {
      documents: {
        "lesson.md": {
          status: "learning",
          scrollTop: 500,
          progress: 75,
          bookmarks: [],
          exerciseResults: {},
          updatedAt: "2099-01-01T00:00:00.000Z",
        },
      },
      dailyPaths: [],
      dailyDate: "",
      updatedAt: "2099-01-01T00:00:00.000Z",
    };

    const merged = store.mergeCloud(cloud);

    expect(merged.documents["lesson.md"].progress).toBe(75);
    expect(merged.documents["lesson.md"].bookmarks[0].note).toBe("local bookmark note");
  });

  it("migrates anonymous words into the signed-in account", () => {
    const store = new WordStore();
    store.save(savedWord());

    expect(store.setScope(userId)).toEqual([savedWord()]);
    expect(localStorage.getItem("docs-words-v1:anonymous")).toBeNull();
  });

  it("keeps local words when the cloud is empty", () => {
    const store = new WordStore();
    store.setScope(userId);
    store.save(savedWord());

    expect(store.mergeCloud([])).toEqual([savedWord()]);
  });

  it("persists a word when every optional field is empty", () => {
    const store = new WordStore();
    const wordOnly = savedWord({
      word: "cache",
      pronunciation: "",
      meaning: "",
      example: "",
      pronunciationNote: "",
    });

    store.save(wordOnly);

    expect(store.readAll()).toEqual([wordOnly]);
  });

  it("keeps the newest soft deletion during word sync", () => {
    const store = new WordStore();
    store.setScope(userId);
    store.save(savedWord());
    const deletedAt = "2026-02-01T00:00:00.000Z";

    const merged = store.mergeCloud([
      savedWord({ updatedAt: deletedAt, deletedAt }),
    ]);

    expect(merged[0].deletedAt).toBe(deletedAt);
  });
});