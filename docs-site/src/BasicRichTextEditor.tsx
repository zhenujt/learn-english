import { useEffect, useRef } from "react";
import Editor from "@toast-ui/editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BasicRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  minHeight?: number;
  autoFocus?: boolean;
}

/**
 * Edits Markdown through a compact WYSIWYG surface that preserves pasted formatting.
 *
 * @param props Controlled Markdown value and editor presentation options.
 * @returns A compact rich-text editor.
 */
export function BasicRichTextEditor({
  value,
  onChange,
  ariaLabel,
  placeholder = "",
  minHeight = 150,
  autoFocus = false,
}: BasicRichTextEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mountRef.current) return;
    const editor = new Editor({
      el: mountRef.current,
      height: `${minHeight}px`,
      hideModeSwitch: true,
      initialEditType: "wysiwyg",
      initialValue: value,
      placeholder,
      previewStyle: "tab",
      usageStatistics: false,
      toolbarItems: [
        ["heading", "bold", "italic", "strike"],
        ["quote", "ul", "ol", "task"],
        ["link", "code"],
      ],
      events: {
        change: () => onChangeRef.current(editor.getMarkdown()),
      },
    });
    editorRef.current = editor;
    mountRef.current.setAttribute("aria-label", ariaLabel);
    if (autoFocus) window.setTimeout(() => editor.focus(), 0);
    return () => {
      editorRef.current = null;
      editor.destroy();
    };
  }, [ariaLabel, autoFocus, minHeight, placeholder]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getMarkdown() !== value) editor.setMarkdown(value, false);
  }, [value]);

  return <div className="basic-rich-text-editor" ref={mountRef} />;
}

/**
 * Renders stored rich text while remaining compatible with existing plain text.
 *
 * @param props Markdown content to render.
 * @returns Formatted rich-text content.
 */
export function RichTextContent({ value }: { value: string }) {
  return <div className="rich-text-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div>;
}