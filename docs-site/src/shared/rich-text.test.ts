import { describe, expect, it } from "vitest";
import { richTextToPlainText } from "./rich-text";

describe("richTextToPlainText", () => {
  it("keeps readable content while removing Markdown formatting", () => {
    expect(richTextToPlainText("## **Meaning**\n\n- Read [the guide](https://example.com)\n- Use `carefully`"))
      .toBe("Meaning\n\nRead the guide\nUse carefully");
  });

  it("leaves legacy plain text unchanged", () => {
    expect(richTextToPlainText("第一行\n第二行")).toBe("第一行\n第二行");
  });
});