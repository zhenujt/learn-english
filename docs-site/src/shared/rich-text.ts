/**
 * Converts stored Markdown into readable plain text for speech and compact labels.
 *
 * @param markdown Markdown or legacy plain-text content.
 * @returns Text without Markdown formatting or link destinations.
 */
export function richTextToPlainText(markdown: string): string {
  return markdown
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[ \t]{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])[ \t]+/gm, "")
    .replace(/~~|\*\*|__|`/g, "")
    .replace(/(^|\W)[*_]([^\n*_]+)[*_](?=\W|$)/g, "$1$2")
    .replace(/\s*\|\s*/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}