declare module "@toast-ui/editor" {
  interface EditorOptions {
    el: HTMLElement;
    height?: string;
    initialEditType?: "markdown" | "wysiwyg";
    initialValue?: string;
    hideModeSwitch?: boolean;
    previewStyle?: "tab" | "vertical";
    usageStatistics?: boolean;
    toolbarItems?: string[][];
    events?: {
      change?: () => void;
    };
  }

  export default class Editor {
    public constructor(options: EditorOptions);
    public destroy(): void;
    public getMarkdown(): string;
  }
}