export interface TextAnnotation {
  id: string;
  documentPath: string;
  quote: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

const legacyAnnotationsKey = "docs-annotations-v1";
const annotationsKeyPrefix = "docs-annotations-v2";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validTimestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

/** Stores text annotations locally and merges independently updated cloud records. */
export class AnnotationStore {
  private scope = "anonymous";

  /** @returns The local-storage key for the active account scope. */
  public get storageKey(): string {
    return `${annotationsKeyPrefix}:${this.scope}`;
  }

  /**
   * Selects the local annotation scope and migrates anonymous records on sign-in.
   * @param userId Authenticated Supabase user ID, or undefined for anonymous storage.
   * @returns Valid annotations stored in the selected scope.
   */
  public setScope(userId?: string): TextAnnotation[] {
    if (userId && !uuidPattern.test(userId)) {
      throw new Error("The annotation account ID is invalid.");
    }
    const anonymousAnnotations = userId ? this.readScope("anonymous") : [];
    this.scope = userId ? `user:${userId}` : "anonymous";
    if (this.scope === "anonymous" && localStorage.getItem(this.storageKey) === null) {
      const legacy = localStorage.getItem(legacyAnnotationsKey);
      if (legacy !== null) {
        localStorage.setItem(this.storageKey, legacy);
        localStorage.removeItem(legacyAnnotationsKey);
      }
    }
    if (userId && anonymousAnnotations.length > 0) {
      const annotations = this.merge(anonymousAnnotations, this.readAll());
      this.write(annotations);
      localStorage.removeItem(`${annotationsKeyPrefix}:anonymous`);
      return annotations;
    }
    return this.readAll();
  }

  public readAll(): TextAnnotation[] {
    return this.readScope(this.scope);
  }

  private readScope(scope: string): TextAnnotation[] {
    try {
      const value = JSON.parse(localStorage.getItem(`${annotationsKeyPrefix}:${scope}`) ?? "[]") as unknown;
      return Array.isArray(value) ? value.filter(this.isAnnotation) : [];
    } catch {
      return [];
    }
  }

  public save(annotation: TextAnnotation): TextAnnotation[] {
    const annotations = this.readAll();
    const index = annotations.findIndex((item) => item.id === annotation.id);
    if (index >= 0) annotations[index] = annotation;
    else annotations.push(annotation);
    this.write(annotations);
    return annotations;
  }

  public remove(id: string): TextAnnotation[] {
    const annotations = this.readAll();
    const annotation = annotations.find((item) => item.id === id);
    if (!annotation) return annotations;
    const now = new Date().toISOString();
    return this.save({ ...annotation, updatedAt: now, deletedAt: now });
  }

  public mergeCloud(cloud: TextAnnotation[]): TextAnnotation[] {
    const annotations = this.merge(cloud, this.readAll());
    this.write(annotations);
    return annotations;
  }

  private merge(...sources: TextAnnotation[][]): TextAnnotation[] {
    const merged = new Map<string, TextAnnotation>();
    for (const annotations of sources) {
      for (const annotation of annotations) {
        const current = merged.get(annotation.id);
        if (!current) {
          merged.set(annotation.id, annotation);
          continue;
        }
        const newer = annotation.updatedAt >= current.updatedAt ? annotation : current;
        const older = newer === annotation ? current : annotation;
        const note = !newer.deletedAt && !newer.note.trim() && older.note.trim()
          ? older.note
          : newer.note;
        merged.set(annotation.id, { ...newer, note });
      }
    }
    return [...merged.values()];
  }

  private readonly isAnnotation = (value: unknown): value is TextAnnotation => {
    if (!value || typeof value !== "object") return false;
    const annotation = value as Partial<TextAnnotation>;
    return Boolean(
      typeof annotation.id === "string" && uuidPattern.test(annotation.id) &&
      typeof annotation.documentPath === "string" && annotation.documentPath.length > 0 &&
      typeof annotation.quote === "string" && annotation.quote.length > 0 && annotation.quote.length <= 500 &&
      typeof annotation.prefix === "string" &&
      typeof annotation.suffix === "string" &&
      typeof annotation.startOffset === "number" && Number.isInteger(annotation.startOffset) && annotation.startOffset >= 0 &&
      typeof annotation.note === "string" &&
      validTimestamp(annotation.createdAt) &&
      validTimestamp(annotation.updatedAt) &&
      (annotation.deletedAt === undefined || validTimestamp(annotation.deletedAt)),
    );
  };

  private write(annotations: TextAnnotation[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(annotations));
  }
}