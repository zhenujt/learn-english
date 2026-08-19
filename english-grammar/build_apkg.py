import hashlib
import html
import re
import sqlite3
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Optional

import genanki


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "英语语法全解.md"
OUTPUT = ROOT / "英语核心语法.apkg"
MEDIA_DIR = ROOT / ".anki_media"

FALLBACK_ANSWERS = {
    ("✍️ 练习 1.1：识别词性", 1): "meeting：名词",
    ("✍️ 练习 1.1：识别词性", 2): "quickly：副词",
    ("✍️ 练习 1.1：识别词性", 3): "They：代词",
    ("✍️ 练习 1.1：识别词性", 4): "three：数词",
    ("✍️ 练习 1.2：一词多性", 1): "work：动词",
    ("✍️ 练习 1.2：一词多性", 2): "work：名词",
    ("✍️ 练习 1.2：一词多性", 3): "light：动词",
    ("✍️ 练习 1.2：一词多性", 4): "light：形容词",
    ("✍️ 练习 2.1：找出句子成分", 1): "Our team（主语）/ needs（谓语）/ help（宾语）",
    ("✍️ 练习 2.1：找出句子成分", 2): "The meeting（主语）/ is（系动词）/ short（表语）",
    ("✍️ 练习 2.1：找出句子成分", 3): "Anna（主语）/ reads（谓语）/ every morning（状语）",
    ("✍️ 练习 2.2：系动词后用什么词", 1): "good",
    ("✍️ 练习 2.2：系动词后用什么词", 2): "delicious",
    ("✍️ 练习 2.2：系动词后用什么词", 3): "quiet",
    ("✍️ 练习 3.1：识别基本句型", 1): "句型一：主语 + 谓语（S + V）",
    ("✍️ 练习 3.1：识别基本句型", 2): "句型二：主语 + 系动词 + 表语（S + V + P）",
    ("✍️ 练习 3.1：识别基本句型", 3): "句型三：主语 + 谓语 + 宾语（S + V + O）",
    ("✍️ 练习 3.2：主 + 谓", 1): "at nine 不是宾语，是时间状语。",
    ("✍️ 练习 3.2：主 + 谓", 2): "in the city 不是宾语，是地点状语。",
    ("✍️ 练习 3.2：主 + 谓", 3): "peacefully 不是宾语，是方式状语。",
    ("✍️ 练习 3.3：主 + 系 + 表", 1): "comfortable",
    ("✍️ 练习 3.3：主 + 系 + 表", 2): "a leader",
    ("✍️ 练习 3.3：主 + 系 + 表", 3): "nice",
    ("✍️ 练习 3.4：主 + 谓 + 宾", 1): "示例：I finished my work.",
    ("✍️ 练习 3.4：主 + 谓 + 宾", 2): "示例：She bought a laptop.",
    ("✍️ 练习 3.4：主 + 谓 + 宾", 3): "示例：We discussed the plan.",
    ("✍️ 练习 3.5：双宾语", 1): "She sent an email to me.",
    ("✍️ 练习 3.5：双宾语", 2): "He made coffee for us.",
    ("✍️ 练习 3.6：宾语补足语", 1): "是。white 补充说明宾语 the wall 的状态。",
    ("✍️ 练习 3.6：宾语补足语", 2): "是。running 补充说明宾语 him 的动作。",
    ("✍️ 练习 3.6：宾语补足语", 3): "不是。new 是定语，修饰名词 laptop。",
    ("✍️ 练习 4.1：名词分类", 1): "不可数名词",
    ("✍️ 练习 4.1：名词分类", 2): "可数名词",
    ("✍️ 练习 4.1：名词分类", 3): "不可数名词",
    ("✍️ 练习 5.4：冠词改变含义", 1): "go to school",
    ("✍️ 练习 21.3：时间状语变化", None): "that day",
}


def stable_id(value: str, minimum: int = 1000) -> int:
    """Return a deterministic positive identifier accepted by Anki."""
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]
    return int(digest, 16) % 1_000_000_000 + minimum


def markdown_to_html(text: str) -> str:
    """Convert the source Markdown subset into readable Anki HTML."""
    lines = text.splitlines()
    output = []
    in_code = False
    code_lines = []
    table_rows = []

    def flush_table():
        if not table_rows:
            return
        output.append("<table>" + "".join(table_rows) + "</table>")
        table_rows.clear()

    for line in lines:
        if line.strip().startswith("```"):
            flush_table()
            if in_code:
                output.append("<pre><code>" + html.escape("\n".join(code_lines)) + "</code></pre>")
                code_lines.clear()
            in_code = not in_code
            continue
        if in_code:
            code_lines.append(line)
            continue
        if line.startswith("|"):
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if all(set(cell) <= {"-", ":", " "} for cell in cells):
                continue
            tag = "th" if not table_rows else "td"
            table_rows.append("<tr>" + "".join(f"<{tag}>{inline(cell)}</{tag}>" for cell in cells) + "</tr>")
            continue
        flush_table()
        stripped = line.strip()
        if not stripped:
            continue
        if stripped == "<details>":
            output.append("<details>")
        elif stripped == "</details>":
            output.append("</details>")
        elif stripped.startswith("<summary>") and stripped.endswith("</summary>"):
            output.append(stripped)
        elif stripped.startswith("### "):
            output.append(f"<h3>{inline(stripped[4:])}</h3>")
        elif stripped.startswith("#### "):
            output.append(f"<h4>{inline(stripped[5:])}</h4>")
        elif stripped.startswith("> "):
            output.append(f"<blockquote>{inline(stripped[2:])}</blockquote>")
        elif re.match(r"^[-*] ", stripped):
            output.append(f"<div class=\"list-item\">{inline(stripped[2:])}</div>")
        elif re.match(r"^\d+\. ", stripped):
            output.append(f"<div class=\"list-item\">{inline(stripped)}</div>")
        else:
            output.append(f"<p>{inline(stripped)}</p>")
    flush_table()
    return "".join(output)


def inline(value: str) -> str:
    value = html.escape(value, quote=False)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", value)
    return value


def strip_markdown(value: str) -> str:
    value = re.sub(r"\[[^]]+\]\([^)]*\)", "", value)
    value = re.sub(r"[*_`#|]", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" -:>")


def english_candidates(text: str) -> list[str]:
    candidates = []
    for line in text.splitlines():
        plain = strip_markdown(line)
        for match in re.findall(r"[A-Za-z][A-Za-z0-9 ,.'!?;:/()'-]{8,}", plain):
            candidate = re.sub(r"\s+", " ", match).strip(" -:;,.")
            if len(candidate.split()) < 3:
                continue
            if re.search(r"[\u3400-\u9fff]", candidate):
                continue
            if candidate.lower() in {"answer", "correct answer", "exercise"}:
                continue
            candidates.append(candidate)
    unique = []
    for candidate in candidates:
        if candidate not in unique:
            unique.append(candidate)
    return unique[:2]


def make_audio(text: str) -> Optional[Path]:
    if not text:
        return None
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
    existing = next(MEDIA_DIR.glob(f"voice_*{digest}.mp3"), None)
    if existing:
        return existing
    aiff_path = MEDIA_DIR / f"voice_{digest}.aiff"
    mp3_path = MEDIA_DIR / f"voice_{digest}.mp3"
    if mp3_path.exists():
        return mp3_path
    subprocess.run(["say", "-v", "Samantha", "-r", "165", "-o", str(aiff_path), text], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(aiff_path), "-codec:a", "libmp3lame", "-q:a", "4", str(mp3_path)], check=True)
    aiff_path.unlink(missing_ok=True)
    return mp3_path


def classify_section(title: str) -> tuple[str, str, int]:
    """Map a Markdown H2 section to an ordered Anki stage and chapter number."""
    chapter_match = re.match(r"^(\d+)\.\s+(.+)$", title)
    if chapter_match:
        chapter_number = int(chapter_match.group(1))
        chapter_title = chapter_match.group(2).strip()
        if chapter_number <= 17:
            stage = "01 入门语法"
        elif chapter_number <= 25:
            stage = "02 基础语法"
        elif chapter_number <= 35:
            stage = "03 进阶语法"
        else:
            stage = "04 高级语法"
        return stage, f"{chapter_number:02d}. {chapter_title}", chapter_number
    supplement_match = re.match(r"^补充专题\s+(\d+)：(.+)$", title)
    if supplement_match:
        number = int(supplement_match.group(1))
        return "05 补充专题", f"{number:02d}. {supplement_match.group(2).strip()}", 100 + number
    if title.startswith("附录 "):
        return "06 附录", title, 200
    if title == "🎓 学完之后":
        return "07 学习总结", title, 300
    return "00 学习指南", title, 0


def block_kind(title: str) -> str:
    """Classify a Markdown subsection for note styling and tags."""
    if title.startswith("✍️ 章节复习测试"):
        return "章节复习测试"
    if title.startswith("✍️ 追加练习"):
        return "追加练习"
    if title.startswith("✍️ 练习"):
        return "练习"
    if "易错点" in title:
        return "易错点"
    if title == "讲解":
        return "章节讲解"
    return "知识"


def classify_course_heading(title: str) -> tuple[str, str, int]:
    """Map course-level H1 headings to ordered overview decks."""
    stage_map = {
        "第一阶段 · 入门语法": ("01 入门语法", "00. 阶段导读", 1),
        "第二阶段 · 基础语法": ("02 基础语法", "00. 阶段导读", 18),
        "第三阶段 · 进阶语法": ("03 进阶语法", "00. 阶段导读", 26),
        "第四阶段 · 高级语法": ("04 高级语法", "00. 阶段导读", 36),
        "核心语法补充专题：助动词、限定词与语体": ("05 补充专题", "00. 专题导读", 100),
        "附录": ("06 附录", "00. 附录导读", 200),
    }
    return stage_map.get(title, ("00 学习指南", "00. 课程介绍", 0))


def split_source(text: str):
    """Split every H2/H3/H4 section so no Markdown teaching content is skipped."""
    blocks = []
    current = None
    for line in text.splitlines():
        course_match = re.match(r"^# (.+)$", line)
        section_match = re.match(r"^## (.+)$", line)
        subsection_match = re.match(r"^### (.+)$", line)
        detail_match = re.match(r"^#### (.+)$", line)
        if course_match:
            if current and any(item.strip() for item in current["body"]):
                blocks.append(current)
            course_title = course_match.group(1).strip()
            stage, deck_section, chapter_number = classify_course_heading(course_title)
            current = {
                "kind": "导读",
                "title": course_title,
                "section": course_title,
                "deck_section": deck_section,
                "stage": stage,
                "chapter_number": chapter_number,
                "body": [],
            }
            continue
        if section_match:
            if current:
                if any(item.strip() for item in current["body"]):
                    blocks.append(current)
            section_title = section_match.group(1).strip()
            stage, deck_section, chapter_number = classify_section(section_title)
            current = {
                "kind": "导读",
                "title": "导读",
                "section": section_title,
                "deck_section": deck_section,
                "stage": stage,
                "chapter_number": chapter_number,
                "body": [],
            }
            continue
        if subsection_match and current:
            if any(item.strip() for item in current["body"]):
                blocks.append(current)
            subsection_title = subsection_match.group(1).strip()
            current = {
                "kind": block_kind(subsection_title),
                "title": subsection_title,
                "section": current["section"],
                "deck_section": current["deck_section"],
                "stage": current["stage"],
                "chapter_number": current["chapter_number"],
                "body": [],
            }
            continue
        if detail_match and current:
            if any(item.strip() for item in current["body"]):
                blocks.append(current)
            detail_title = detail_match.group(1).strip()
            current = {
                "kind": "知识",
                "title": detail_title,
                "section": current["section"],
                "deck_section": current["deck_section"],
                "stage": current["stage"],
                "chapter_number": current["chapter_number"],
                "body": [],
            }
            continue
        if current:
            current["body"].append(line)
    if current and any(item.strip() for item in current["body"]):
        blocks.append(current)
    return blocks


def parse_review_answers(text: str) -> dict[int, dict[int, str]]:
    """Extract numbered chapter-review answers from Appendix C."""
    appendix = text.split("## 附录 C：答案汇总", 1)[-1]
    headings = list(re.finditer(r"^\*\*章节复习测试\s+(\d+)\*\*\s*$", appendix, re.MULTILINE))
    answers = {}
    for index, heading in enumerate(headings):
        chapter = int(heading.group(1))
        end = headings[index + 1].start() if index + 1 < len(headings) else len(appendix)
        section = appendix[heading.end():end].strip()
        section = re.sub(r"</?details>|<summary>查看答案</summary>", "", section)
        markers = list(re.finditer(r"(?:^|\s)(\d{1,2})\.\s+", section))
        chapter_answers = {}
        for marker_index, marker in enumerate(markers):
            item_end = markers[marker_index + 1].start() if marker_index + 1 < len(markers) else len(section)
            answer = section[marker.end():item_end].strip()
            chapter_answers[int(marker.group(1))] = answer
        answers[chapter] = chapter_answers
    return answers


def split_answer(text: str) -> tuple[str, str]:
    """Separate an inline exercise answer introduced by an arrow or answer label."""
    folded_match = re.match(
        r"^(.*?)\n*<details>\s*<summary>查看答案</summary>\s*(.*?)\s*</details>\s*$",
        text.strip(),
        re.DOTALL,
    )
    if folded_match:
        return folded_match.group(1).strip(), folded_match.group(2).strip()
    arrow_match = re.match(r"^(.*?)\s*[。.]?\s*→\s*(.+)$", text.strip(), re.DOTALL)
    if arrow_match:
        return arrow_match.group(1).strip(), arrow_match.group(2).strip()
    answer_match = re.match(r"^(.*?)\n+答案[：:]\s*(.+)$", text.strip(), re.DOTALL)
    if answer_match:
        return answer_match.group(1).strip(), answer_match.group(2).strip()
    embedded_answer = re.match(r"^(.*?)(?:：答案是|。答案[：:])\s*(.+)$", text.strip(), re.DOTALL)
    if embedded_answer:
        return embedded_answer.group(1).strip(), embedded_answer.group(2).strip()
    direct_answer = re.match(r"^((?:写出|读出|强调|改写|标出|给.+?补标点)[^：:]*?)[：:]\s*(.+)$", text.strip(), re.DOTALL)
    if direct_answer:
        return direct_answer.group(1).strip(), direct_answer.group(2).strip()
    if text.strip().startswith("判断："):
        return text.strip(), "正确"
    return text.strip(), ""


def split_exercise(block: dict, review_answers: dict[int, dict[int, str]]) -> list[dict]:
    """Split an exercise block into atomic question-and-answer cards."""
    body = "\n".join(block["body"])
    body = re.sub(r"<details data-answer-key>.*?</details>", "", body, flags=re.DOTALL)
    body = re.sub(r"</?details>|<summary>查看答案</summary>", "", body)
    lines = [line.rstrip() for line in body.splitlines() if line.strip() and line.strip() != "---"]
    context = []
    items = []
    current = None
    for line in lines:
        numbered = re.match(r"^(\d+)\.\s+(.+)$", line.strip())
        if numbered:
            if current:
                items.append(current)
            current = {"number": int(numbered.group(1)), "lines": [numbered.group(2)]}
        elif current:
            current["lines"].append(line)
        else:
            context.append(line)
    if current:
        items.append(current)

    if not items:
        question, answer = split_answer("\n".join(lines))
        if not answer:
            answer = FALLBACK_ANSWERS.get((block["title"], None), "")
        return [{"number": None, "context": [], "question": question, "answer": answer}]

    context_text = "\n".join(context).strip()
    result = []
    chapter_answers = review_answers.get(block["chapter_number"], {})
    for item in items:
        question, answer = split_answer("\n".join(item["lines"]))
        if not answer and block["kind"] == "章节复习测试":
            answer = chapter_answers.get(item["number"], "")
        if not answer:
            answer = FALLBACK_ANSWERS.get((block["title"], item["number"]), "")
        result.append(
            {
                "number": item["number"],
                "context": [context_text] if context_text else [],
                "question": question,
                "answer": answer,
            }
        )
    return result


def set_package_card_order(output: Path) -> None:
    """Persist Markdown order as Anki's sequential new-card due positions."""
    with tempfile.TemporaryDirectory() as directory:
        extracted = Path(directory) / "package"
        extracted.mkdir()
        with zipfile.ZipFile(output) as archive:
            archive.extractall(extracted)
        database = extracted / "collection.anki2"
        with sqlite3.connect(database) as connection:
            card_ids = [row[0] for row in connection.execute("SELECT id FROM cards ORDER BY id")]
            connection.executemany(
                "UPDATE cards SET due = ? WHERE id = ?",
                ((position, card_id) for position, card_id in enumerate(card_ids, start=1)),
            )
        replacement = output.with_suffix(".tmp")
        with zipfile.ZipFile(replacement, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(extracted.iterdir(), key=lambda item: item.name):
                archive.write(path, path.name)
        replacement.replace(output)


def build():
    MEDIA_DIR.mkdir(exist_ok=True)
    text = SOURCE.read_text(encoding="utf-8")
    blocks = split_source(text)
    review_answers = parse_review_answers(text)
    package = genanki.Package([])
    package.media_files = []

    knowledge_model = genanki.Model(
        1704001001,
        "英语语法知识卡",
        fields=[{"name": "Front"}, {"name": "Back"}, {"name": "Audio"}],
        templates=[{"name": "Knowledge", "qfmt": "<div class='front'>{{Front}}</div>", "afmt": "{{FrontSide}}<hr><div class='back'>{{Back}}{{Audio}}</div>"}],
        css="""body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #202124; background: #f7f8fa; } .card { padding: 20px; } .front { font-size: 24px; font-weight: 700; } .back { font-size: 17px; line-height: 1.65; } h3 { color: #146c94; } h4 { color: #4c6f50; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccd3d9; padding: 7px; text-align: left; } th { background: #e8f1f5; } code { background: #eef1f3; padding: 2px 4px; } blockquote { border-left: 4px solid #7aa6b8; padding-left: 10px; color: #52616b; } .audio { margin-top: 14px; }""",
    )
    exercise_model = genanki.Model(
        1704001002,
        "英语语法练习卡",
        fields=[{"name": "Topic"}, {"name": "Question"}, {"name": "Answer"}, {"name": "Audio"}],
        templates=[{
            "name": "Exercise",
            "qfmt": "<div class='topic'>{{Topic}}</div><div class='question'>{{Question}}</div>",
            "afmt": "{{FrontSide}}<hr><div class='answer-label'>参考答案</div><div class='answer'>{{Answer}}</div>{{Audio}}",
        }],
        css=knowledge_model.css + """ .topic { color: #5f6b73; font-size: 14px; margin-bottom: 14px; } .question { font-size: 22px; line-height: 1.55; } .answer-label { color: #287a4b; font-size: 13px; font-weight: 700; margin-bottom: 8px; } .answer { font-size: 21px; line-height: 1.55; } .unanswered { color: #6b7280; font-size: 16px; }""",
    )

    decks = {}
    media_paths = []
    note_count = 0
    for block in blocks:
        chapter_number = block["chapter_number"]
        deck_name = f"英语核心语法::{block['stage']}::{block['deck_section']}"
        if deck_name not in decks:
            deck = genanki.Deck(stable_id(f"deck:{deck_name}"), deck_name)
            decks[deck_name] = deck
            package.decks.append(deck)
        deck = decks[deck_name]
        source = block["section"]
        if block["kind"] not in {"练习", "追加练习", "章节复习测试"}:
            body = "\n".join(block["body"]).strip()
            rendered = markdown_to_html(body)
            candidates = english_candidates(body)
            audio_tag = ""
            if candidates:
                audio_path = make_audio(". ".join(candidates))
                if audio_path:
                    media_paths.append(audio_path)
                    audio_tag = f"<div class='audio'>[sound:{audio_path.name}]</div>"
            front = f"{block['deck_section']}｜{block['title']}"
            tags = ["knowledge", block["kind"], f"section_{chapter_number}"]
            note = genanki.Note(model=knowledge_model, fields=[front, f"<div class='source'>{source}</div>{rendered}", audio_tag], tags=tags)
            deck.add_note(note)
            note_count += 1
        else:
            topic = f"{block['deck_section']}｜{block['title']}"
            tags = ["exercise", f"section_{chapter_number}", block["kind"]]
            for item in split_exercise(block, review_answers):
                context_html = "".join(markdown_to_html(value) for value in item["context"])
                question_html = context_html + markdown_to_html(item["question"])
                if item["answer"]:
                    answer_html = markdown_to_html(item["answer"])
                    audio_source = item["answer"]
                else:
                    answer_html = "<div class='unanswered'>原文未提供标准答案，请对照本节讲解自行核对。</div>"
                    audio_source = item["question"]
                audio_tag = ""
                candidates = english_candidates(audio_source)
                if candidates:
                    audio_path = make_audio(". ".join(candidates))
                    if audio_path:
                        media_paths.append(audio_path)
                        audio_tag = f"<div class='audio'>[sound:{audio_path.name}]</div>"
                note = genanki.Note(model=exercise_model, fields=[topic, question_html, answer_html, audio_tag], tags=tags)
                deck.add_note(note)
                note_count += 1

    package.media_files = [str(path) for path in dict.fromkeys(media_paths)]
    package.write_to_file(str(OUTPUT))
    set_package_card_order(OUTPUT)
    print(f"notes={note_count}")
    print(f"audio_files={len(media_paths)}")
    print(f"decks={len(decks)}")
    print(f"output={OUTPUT}")


if __name__ == "__main__":
    build()
