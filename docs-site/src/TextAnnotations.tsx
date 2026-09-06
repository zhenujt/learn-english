import { useEffect, useRef, useState, type RefObject } from "react";
import { MessageSquarePlus, Trash2, X } from "lucide-react";
import type { TextAnnotation } from "./shared/annotation-store";

interface SelectionAnchor {
  quote: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  left: number;
  top: number;
}

interface TextAnnotationsProps {
  containerRef: RefObject<HTMLElement | null>;
  documentPath: string;
  annotations: TextAnnotation[];
  onSave: (annotation: TextAnnotation) => void;
  onDelete: (id: string) => void;
}

const contextLength = 40;

function clipboardNoteText(clipboard: DataTransfer): string {
  const plainText = clipboard.getData("text/plain").replace(/\r\n?/g, "\n");
  if (plainText.includes("\n")) return plainText;

  const html = clipboard.getData("text/html");
  if (!html) return plainText;
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
  document.querySelectorAll("li").forEach((element) => {
    element.prepend("• ");
    element.append("\n");
  });
  document.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, blockquote").forEach((element) => {
    element.append("\n");
  });
  return (document.body.textContent ?? plainText)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findAnnotationOffset(text: string, annotation: TextAnnotation): number {
  const offsets: number[] = [];
  let offset = text.indexOf(annotation.quote);
  while (offset >= 0) {
    offsets.push(offset);
    offset = text.indexOf(annotation.quote, offset + 1);
  }
  if (offsets.length === 1) return offsets[0];
  if (offsets.length === 0) return -1;

  let bestOffset = -1;
  let bestScore = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const offset of offsets) {
    const prefix = text.slice(Math.max(0, offset - contextLength), offset);
    const suffix = text.slice(offset + annotation.quote.length, offset + annotation.quote.length + contextLength);
    const score = commonSuffix(prefix, annotation.prefix) + commonPrefix(suffix, annotation.suffix);
    const distance = Math.abs(offset - annotation.startOffset);
    if (score > bestScore || (score === bestScore && distance < bestDistance)) {
      bestOffset = offset;
      bestScore = score;
      bestDistance = distance;
    }
  }
  const availableContext = annotation.prefix.length + annotation.suffix.length;
  return bestScore >= Math.min(8, availableContext) ? bestOffset : -1;
}

function commonPrefix(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  let index = 0;
  while (index < length && left[index] === right[index]) index += 1;
  return index;
}

function commonSuffix(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  let index = 0;
  while (index < length && left[left.length - 1 - index] === right[right.length - 1 - index]) index += 1;
  return index;
}

function textNodes(container: HTMLElement): Text[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

function applyHighlight(container: HTMLElement, annotation: TextAnnotation): void {
  if (container.querySelector(`mark[data-annotation-id="${CSS.escape(annotation.id)}"]`)) return;
  const fullText = container.textContent ?? "";
  const start = findAnnotationOffset(fullText, annotation);
  if (start < 0) return;
  const end = start + annotation.quote.length;
  let offset = 0;
  const nodes = textNodes(container);
  const targetNodes: Text[] = [];
  for (const node of nodes) {
    const nodeStart = offset;
    const nodeEnd = offset + (node.nodeValue?.length ?? 0);
    offset = nodeEnd;
    if (nodeEnd <= start || nodeStart >= end) continue;
    if (node.parentElement?.closest("mark[data-annotation-id]")) return;
    targetNodes.push(node);
  }
  offset = 0;
  for (const node of nodes) {
    const nodeStart = offset;
    const nodeEnd = offset + (node.nodeValue?.length ?? 0);
    offset = nodeEnd;
    if (!targetNodes.includes(node)) continue;
    const range = document.createRange();
    range.setStart(node, Math.max(0, start - nodeStart));
    range.setEnd(node, Math.min(nodeEnd, end) - nodeStart);
    const mark = document.createElement("mark");
    mark.className = "text-annotation-highlight";
    mark.dataset.annotationId = annotation.id;
    mark.title = annotation.note;
    range.surroundContents(mark);
  }
}

/** Adds local and syncable notes to text selected within rendered Markdown. */
export function TextAnnotations(props: TextAnnotationsProps) {
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionAnchor>();
  const [editing, setEditing] = useState<TextAnnotation | "new">();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const selectionTimerRef = useRef<number | undefined>(undefined);
  const editingAnchorRef = useRef<SelectionAnchor | undefined>(undefined);

  useEffect(() => {
    const container = props.containerRef.current;
    if (!container) return;
    props.annotations.forEach((annotation) => applyHighlight(container, annotation));

    const openExisting = (event: MouseEvent) => {
      const mark = (event.target as Element).closest<HTMLElement>("mark[data-annotation-id]");
      if (!mark) return;
      const annotation = props.annotations.find((item) => item.id === mark.dataset.annotationId);
      if (!annotation) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectionAnchor(undefined);
      setError("");
      setNote(annotation.note);
      setEditing(annotation);
    };
    container.addEventListener("click", openExisting);
    return () => container.removeEventListener("click", openExisting);
  }, [props.annotations, props.containerRef]);

  useEffect(() => {
    const captureSelection = () => {
      window.clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = window.setTimeout(() => {
        const container = props.containerRef.current;
        const selection = window.getSelection();
        if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;
        const overlapsAnnotation = [...container.querySelectorAll("mark[data-annotation-id]")]
          .some((mark) => range.intersectsNode(mark));
        if (overlapsAnnotation) return;
        const quote = selection.toString().trim();
        if (!quote || quote.length > 500) return;
        const before = document.createRange();
        before.selectNodeContents(container);
        before.setEnd(range.startContainer, range.startOffset);
        const fullText = container.textContent ?? "";
        const startOffset = before.toString().length + selection.toString().indexOf(quote);
        const rect = range.getBoundingClientRect();
        setSelectionAnchor({
          quote,
          startOffset,
          prefix: fullText.slice(Math.max(0, startOffset - contextLength), startOffset),
          suffix: fullText.slice(startOffset + quote.length, startOffset + quote.length + contextLength),
          left: Math.min(window.innerWidth - 16, Math.max(16, rect.right)),
          top: Math.max(16, rect.top - 8),
        });
      }, 120);
    };
    const dismissSelection = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest(".add-annotation-button, mark[data-annotation-id]")) {
        setSelectionAnchor(undefined);
      }
    };
    const scrollContainer = props.containerRef.current?.closest(".document-main");
    document.addEventListener("selectionchange", captureSelection);
    document.addEventListener("pointerdown", dismissSelection);
    scrollContainer?.addEventListener("scroll", dismissSelection as EventListener);
    return () => {
      document.removeEventListener("selectionchange", captureSelection);
      document.removeEventListener("pointerdown", dismissSelection);
      scrollContainer?.removeEventListener("scroll", dismissSelection as EventListener);
      window.clearTimeout(selectionTimerRef.current);
    };
  }, [props.containerRef, props.documentPath]);

  const beginCreate = () => {
    editingAnchorRef.current = selectionAnchor;
    setNote("");
    setError("");
    setEditing("new");
    window.getSelection()?.removeAllRanges();
  };

  const closeDialog = () => {
    setEditing(undefined);
    setSelectionAnchor(undefined);
    setError("");
    editingAnchorRef.current = undefined;
    window.clearTimeout(selectionTimerRef.current);
    window.getSelection()?.removeAllRanges();
  };

  const pasteNote = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = clipboardNoteText(event.clipboardData);
    if (!pastedText) return;
    event.preventDefault();
    const target = event.currentTarget;
    setNote(`${note.slice(0, target.selectionStart)}${pastedText}${note.slice(target.selectionEnd)}`);
  };

  const save = () => {
    const now = new Date().toISOString();
    const anchor = editingAnchorRef.current;
    try {
      if (editing === "new" && anchor) {
        props.onSave({
          id: crypto.randomUUID(),
          documentPath: props.documentPath,
          quote: anchor.quote,
          prefix: anchor.prefix,
          suffix: anchor.suffix,
          startOffset: anchor.startOffset,
          note: note.trim(),
          createdAt: now,
          updatedAt: now,
        });
      } else if (editing && editing !== "new") {
        props.onSave({ ...editing, note: note.trim(), updatedAt: now });
      }
      closeDialog();
    } catch {
      setError("Could not save this note in browser storage.");
    }
  };

  return (
    <>
      {selectionAnchor && !editing && (
        <button
          className="add-annotation-button"
          style={{ left: selectionAnchor.left, top: selectionAnchor.top }}
          type="button"
          onPointerDown={(event) => event.preventDefault()}
          onClick={beginCreate}
        >
          <MessageSquarePlus size={16} /> Add note
        </button>
      )}
      {editing && (
        <div className="annotation-backdrop">
          <form className="annotation-dialog" role="dialog" aria-modal="true" aria-label="Text note" onSubmit={(event) => { event.preventDefault(); save(); }}>
            <header>
              <div>
                <span className="pane-label">Text note</span>
                <strong>“{editing === "new" ? editingAnchorRef.current?.quote : editing.quote}”</strong>
              </div>
              <button type="button" className="icon-button" aria-label="Close annotation" onClick={closeDialog}><X size={18} /></button>
            </header>
            <textarea
              autoFocus
              rows={10}
              wrap="soft"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onPaste={pasteNote}
              placeholder="Translation or note"
            />
            {error && <p className="annotation-error" role="alert">{error}</p>}
            <footer>
              {editing !== "new" && (
                <button type="button" className="delete-annotation" onClick={() => { try { props.onDelete(editing.id); closeDialog(); } catch { setError("Could not delete this note from browser storage."); } }}><Trash2 size={15} /> Delete</button>
              )}
              <button type="button" className="cancel-button" onClick={closeDialog}>Cancel</button>
              <button type="submit" className="save-button">Save note</button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}