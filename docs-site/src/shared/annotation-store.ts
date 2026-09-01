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
   * Selects the local annotation scope without importing anonymous records.
   * @param userId Authenticated Supabase user ID, or undefined for anonymous storage.
   * @returns Valid annotations stored in the selected scope.
   */
  public setScope(userId?: string): TextAnnotation[] {
    if (userId && !uuidPattern.test(userId)) {
      throw new Error("The annotation account ID is invalid.");
    }
    this.scope = userId ? `user:${userId}` : "anonymous";
    if (this.scope === "anonymous" && localStorage.getItem(this.storageKey) === null) {
      const legacy = localStorage.getItem(legacyAnnotationsKey);
      if (legacy !== null) {
        localStorage.setItem(this.storageKey, legacy);
        localStorage.removeItem(legacyAnnotationsKey);
      }
    }
    return this.readAll();
  }

  public readAll(): TextAnnotation[] {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey) ?? "[]") as unknown;
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
    const merged = new Map<string, TextAnnotation>();
    for (const annotation of [...cloud, ...this.readAll()]) {
      const current = merged.get(annotation.id);
      if (!current || annotation.updatedAt >= current.updatedAt) {
        merged.set(annotation.id, annotation);
      }
    }
    const annotations = [...merged.values()];
    this.write(annotations);
    return annotations;
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