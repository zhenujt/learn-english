declare module "@toast-ui/editor" {
  interface EditorOptions {
    el: HTMLElement;
    height?: string;
    initialEditType?: "markdown" | "wysiwyg";
    initialValue?: string;
    hideModeSwitch?: boolean;
    previewStyle?: "tab" | "vertical";
    placeholder?: string;
    usageStatistics?: boolean;
    toolbarItems?: string[][];
    events?: {
      change?: () => void;
    };
  }

  export default class Editor {
    public constructor(options: EditorOptions);
    public destroy(): void;
    public focus(): void;
    public getMarkdown(): string;
    public setMarkdown(markdown: string, cursorToEnd?: boolean): void;
  }
}