import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

interface MarkdownNode {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class MarkdownValidator {
  public validate(content: string): ValidationResult {
    const errors: string[] = [];
    if (!content.trim()) errors.push("Document cannot be empty.");
    if (new TextEncoder().encode(content).byteLength > 2_000_000) {
      errors.push("Document exceeds the 2 MB limit.");
    }

    const tree = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .parse(content) as MarkdownNode;
    const headings = this.collect(tree, "heading");
    const levelOneHeadings = headings.filter((node) => node.depth === 1);
    if (levelOneHeadings.length !== 1) {
      errors.push("Document must contain exactly one level-one heading.");
    }

    const headingIds = headings
      .map((node) => this.slugify(this.text(node)))
      .filter(Boolean);
    const duplicateIds = headingIds.filter(
      (id, index) => headingIds.indexOf(id) !== index,
    );
    if (duplicateIds.length) {
      errors.push(
        `Duplicate heading anchors: ${[...new Set(duplicateIds)].join(", ")}.`,
      );
    }

    for (const table of this.collect(tree, "table")) {
      const widths = (table.children ?? []).map(
        (row) => row.children?.length ?? 0,
      );
      if (widths.length < 2 || widths.some((width) => width !== widths[0])) {
        errors.push(
          "Every Markdown table must have a header and rows with the same number of columns.",
        );
      }
    }

    if (!this.hasBalancedFences(content)) {
      errors.push(
        "Code fences must be closed with the same marker and length.",
      );
    }

    return { valid: errors.length === 0, errors };
  }

  private collect(node: MarkdownNode, type: string): MarkdownNode[] {
    const matches = node.type === type ? [node] : [];
    return matches.concat(
      (node.children ?? []).flatMap((child) => this.collect(child, type)),
    );
  }

  private text(node: MarkdownNode): string {
    if (typeof node.value === "string") return node.value;
    return (node.children ?? []).map((child) => this.text(child)).join("");
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  private hasBalancedFences(content: string): boolean {
    let openFence: { marker: string; length: number } | undefined;
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*(`{3,}|~{3,})/);
      if (!match) continue;
      const marker = match[1][0];
      if (!openFence) {
        openFence = { marker, length: match[1].length };
      } else if (
        openFence.marker === marker &&
        match[1].length >= openFence.length
      ) {
        openFence = undefined;
      }
    }
    return !openFence;
  }
}
