#!/usr/bin/env python3
"""Convert the grammar curriculum Markdown into Google-Docs-import block JSON.

Splits the source file into chunks along its top-level (H1) sections so each
chunk can be pushed to the Apps Script `importBlocks` action in one call.

Usage:
    python3 md_to_docs_blocks.py <input.md> <output_dir>
"""
import json
import re
import sys
from pathlib import Path

HEADING_RE = re.compile(r"^(#{1,4})\s+(.*)$")
TABLE_ROW_RE = re.compile(r"^\s*\|(.+)\|\s*$")
TABLE_SEP_RE = re.compile(r"^\s*\|?[\s:|-]+\|?\s*$")
LIST_RE = re.compile(r"^(\s*)([-*]|\d+\.)\s+(.*)$")
DETAILS_OPEN_RE = re.compile(r"^\s*<details(?:\s+[^>]*)?>\s*$")
SUMMARY_RE = re.compile(r"^\s*<summary>(.*)</summary>\s*$")
DETAILS_CLOSE_RE = re.compile(r"^\s*</details>\s*$")
CODE_FENCE_RE = re.compile(r"^\s*```")


def strip_inline_md(text):
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)  # links -> text
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)  # bold
    text = re.sub(r"(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)", r"\1", text)  # italic
    text = re.sub(r"`([^`]*)`", r"\1", text)  # inline code
    return text.strip()


def parse_table(lines, i):
    rows = []
    header = [c.strip() for c in lines[i].strip().strip("|").split("|")]
    rows.append(header)
    i += 1
    if i < len(lines) and TABLE_SEP_RE.match(lines[i]):
        i += 1
    while i < len(lines) and TABLE_ROW_RE.match(lines[i]):
        row = [strip_inline_md(c.strip()) for c in lines[i].strip().strip("|").split("|")]
        rows.append(row)
        i += 1
    return rows, i


def parse_blocks(text):
    lines = text.split("\n")
    blocks = []
    i = 0
    in_details = False
    in_code = False
    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()

        if CODE_FENCE_RE.match(line):
            in_code = not in_code
            i += 1
            continue

        if in_code:
            if line.strip():
                blocks.append({"type": "code", "text": line})
            i += 1
            continue

        if DETAILS_OPEN_RE.match(line):
            in_details = True
            i += 1
            continue
        if DETAILS_CLOSE_RE.match(line):
            in_details = False
            i += 1
            continue
        m = SUMMARY_RE.match(line)
        if m:
            blocks.append({"type": "answer_label", "text": strip_inline_md(m.group(1))})
            i += 1
            continue

        if not line.strip():
            i += 1
            continue

        hm = HEADING_RE.match(line)
        if hm:
            level = len(hm.group(1))
            blocks.append({"type": "heading", "level": min(level, 4), "text": strip_inline_md(hm.group(2))})
            i += 1
            continue

        if TABLE_ROW_RE.match(line):
            rows, i = parse_table(lines, i)
            blocks.append({"type": "table", "rows": rows})
            continue

        lm = LIST_RE.match(raw)
        if lm:
            indent, marker, content = lm.groups()
            level = len(indent) // 2
            ordered = marker != "-" and marker != "*"
            blocks.append({
                "type": "list_item",
                "text": strip_inline_md(content),
                "level": level,
                "ordered": ordered,
                "answer": in_details,
            })
            i += 1
            continue

        if line.strip() in ("---", "***", "___"):
            i += 1
            continue

        if line.lstrip().startswith(">"):
            blocks.append({"type": "quote", "text": strip_inline_md(line.lstrip().lstrip(">").strip())})
            i += 1
            continue

        blocks.append({"type": "answer" if in_details else "paragraph", "text": strip_inline_md(line.strip())})
        i += 1

    return blocks


def split_sections(md_text):
    lines = md_text.split("\n")
    sections = []
    current_title = "front-matter"
    current_lines = []
    for line in lines:
        if line.startswith("# "):
            if current_lines:
                sections.append((current_title, "\n".join(current_lines)))
            current_title = line[2:].strip()
            current_lines = [line]
        else:
            current_lines.append(line)
    if current_lines:
        sections.append((current_title, "\n".join(current_lines)))
    return sections


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    text = src.read_text(encoding="utf-8")
    sections = split_sections(text)

    manifest = []
    for idx, (title, body) in enumerate(sections):
        blocks = parse_blocks(body)
        fname = f"chunk_{idx:02d}.json"
        (out_dir / fname).write_text(json.dumps(blocks, ensure_ascii=False), encoding="utf-8")
        manifest.append({"index": idx, "title": title, "file": fname, "blockCount": len(blocks)})
        print(f"{fname}: {title!r} -> {len(blocks)} blocks")

    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
