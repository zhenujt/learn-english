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

const annotationsKey = "docs-annotations-v1";

/** Stores text annotations locally and merges independently updated cloud records. */
export class AnnotationStore {
  public readAll(): TextAnnotation[] {
    try {
      const value = JSON.parse(localStorage.getItem(annotationsKey) ?? "[]") as unknown;
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
      annotation.id &&
      annotation.documentPath &&
      annotation.quote &&
      typeof annotation.startOffset === "number" &&
      typeof annotation.note === "string" &&
      annotation.createdAt &&
      annotation.updatedAt,
    );
  };

  private write(annotations: TextAnnotation[]): void {
    try {
      localStorage.setItem(annotationsKey, JSON.stringify(annotations));
    } catch {
      // Reading remains available when browser storage is unavailable.
    }
  }
}