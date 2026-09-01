import { useEffect, useRef, useState } from "react";
import Editor from "@toast-ui/editor";
import { Code2, Type } from "lucide-react";

interface RichMarkdownEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

class ProtectedHtmlBlocks {
  private readonly blocks = new Map<string, string>();

  public protect(markdown: string): string {
    let blockIndex = 0;
    return markdown.replace(/<details\b[^>]*>[\s\S]*?<\/details>/gi, (block) => {
      const token = `DOCSPROTECTEDDETAILS${blockIndex}`;
      this.blocks.set(token, block);
      blockIndex += 1;
      return `[Protected answer block ${blockIndex}. Use Markdown mode to edit it.] ${token}`;
    });
  }

  public restore(markdown: string): string | undefined {
    let restored = markdown;
    for (const [token, block] of this.blocks) {
      if (!restored.includes(token)) return undefined;
      const placeholderLine = new RegExp(`^.*${token}(?!\\d).*$`, "gm");
      restored = restored.replace(placeholderLine, block);
    }
    return restored;
  }
}

function RichEditorSurface({ markdown, onChange }: RichMarkdownEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const initialMarkdownRef = useRef(markdown);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mountRef.current) return;

    const protectedBlocks = new ProtectedHtmlBlocks();
    const editor = new Editor({
      el: mountRef.current,
      height: "100%",
      hideModeSwitch: true,
      initialEditType: "wysiwyg",
      initialValue: protectedBlocks.protect(initialMarkdownRef.current),
      previewStyle: "tab",
      usageStatistics: false,
      toolbarItems: [
        ["heading", "bold", "italic", "strike"],
        ["hr", "quote"],
        ["ul", "ol", "task", "indent", "outdent"],
        ["table", "link"],
        ["code", "codeblock"],
      ],
      events: {
        change: () => {
          const restored = protectedBlocks.restore(editor.getMarkdown());
          if (restored !== undefined) onChangeRef.current(restored);
        },
      },
    });

    return () => editor.destroy();
  }, []);

  return <div className="rich-editor-surface" ref={mountRef} />;
}

/**
 * Provides WYSIWYG and Markdown editing while keeping Markdown as the source of truth.
 *
 * @param props - Current Markdown and the callback used to update the document draft.
 * @returns The editor mount point.
 */
export function RichMarkdownEditor({
  markdown,
  onChange,
}: RichMarkdownEditorProps) {
  const [mode, setMode] = useState<"rich" | "markdown">("rich");

  return (
    <div className="rich-markdown-editor">
      <div className="editor-mode-control" aria-label="Editor mode">
        <button
          className={mode === "rich" ? "active" : ""}
          type="button"
          title="Edit with formatting controls"
          aria-pressed={mode === "rich"}
          onClick={() => setMode("rich")}
        >
          <Type size={15} /> Rich text
        </button>
        <button
          className={mode === "markdown" ? "active" : ""}
          type="button"
          title="Edit the Markdown source"
          aria-pressed={mode === "markdown"}
          onClick={() => setMode("markdown")}
        >
          <Code2 size={15} /> Markdown
        </button>
      </div>
      <div className="editor-mode-content">
        {mode === "rich" ? (
          <RichEditorSurface markdown={markdown} onChange={onChange} />
        ) : (
          <textarea
            className="markdown-source-editor"
            aria-label="Markdown source editor"
            value={markdown}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}