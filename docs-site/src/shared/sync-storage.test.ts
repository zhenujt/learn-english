import { beforeEach, describe, expect, it } from "vitest";
import { AnnotationStore, type TextAnnotation } from "./annotation-store";
import { DocumentWorkspaceStore, type StudySnapshot } from "./workspace-store";

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
});