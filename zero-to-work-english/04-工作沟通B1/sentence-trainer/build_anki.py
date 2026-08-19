import hashlib
import html
import json
import shutil
import sqlite3
import tempfile
import re
import zipfile
from pathlib import Path
from typing import Any

import genanki

from course_vocabulary import CourseVocabulary


ROOT = Path(__file__).resolve().parent
CARDS_PATH = ROOT / "src" / "data" / "cards.json"
AUDIO_PATH = ROOT / "public" / "audio"
MEDIA_PATH = ROOT / ".anki_media"
OUTPUT_PATH = ROOT / "sentence-workplace-english-phonetics-v3.apkg"


def stable_id(value: str, minimum: int = 1000) -> int:
    """Return a deterministic positive identifier accepted by Anki."""
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]
    return int(digest, 16) % 1_000_000_000 + minimum


class AnkiDeckBuilder:
    """Build the software workplace sentence deck and its offline media."""

    DECK_NAME = "句练 · 软件职场英语 · 音标词汇版 V3"

    def __init__(self) -> None:
        self.model = self._create_model()
        self.deck = genanki.Deck(stable_id(f"deck:{self.DECK_NAME}"), self.DECK_NAME)
        self.known_vocabulary: dict[str, dict[str, str]] = {}

    def build(self) -> None:
        """Generate the APKG and preserve source order as new-card order."""
        cards = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
        if len(cards) != 100:
            raise ValueError(f"Expected 100 cards, found {len(cards)}")
        self.known_vocabulary = {
            item["word"].lower(): item
            for card in cards
            for item in card["grammar"]["vocabulary"]
            if re.fullmatch(r"[A-Za-z]+(?:['’-][A-Za-z]+)*", item["word"])
        }

        MEDIA_PATH.mkdir(exist_ok=True)
        media_files: list[str] = []
        for card in cards:
            aria_natural_name = self._stage_audio(card, "naturalAudio", "aria_natural")
            aria_clear_name = self._stage_audio(card, "clearAudio", "aria_clear")
            jenny_natural_name = self._stage_audio(card, "jennyNaturalAudio", "jenny_natural")
            jenny_clear_name = self._stage_audio(card, "jennyClearAudio", "jenny_clear")
            audio_names = (
                aria_natural_name,
                aria_clear_name,
                jenny_natural_name,
                jenny_clear_name,
            )
            media_files.extend(str(MEDIA_PATH / name) for name in audio_names)
            self.deck.add_note(self._create_note(card, *audio_names))

        package = genanki.Package(self.deck)
        package.media_files = media_files
        package.write_to_file(str(OUTPUT_PATH))
        self._set_card_order()
        print(f"cards={len(cards)}")
        print(f"audio_files={len(media_files)}")
        print(f"output={OUTPUT_PATH}")

    def _stage_audio(self, card: dict[str, Any], source_key: str, suffix: str) -> str:
        source = ROOT / "public" / card[source_key]
        if not source.is_file() or source.stat().st_size == 0:
            raise FileNotFoundError(f"Missing audio: {source}")
        filename = f"sentence_{card['id']:03d}_{suffix}.mp3"
        shutil.copy2(source, MEDIA_PATH / filename)
        return filename

    def _create_note(
        self,
        card: dict[str, Any],
        aria_natural_name: str,
        aria_clear_name: str,
        jenny_natural_name: str,
        jenny_clear_name: str,
    ) -> genanki.Note:
        grammar = card["grammar"]
        vocabulary = self._vocabulary_html(card)
        fields = [
            f"{card['id']:03d}",
            html.escape(card["category"]),
            self._pair(card["questionZh"], card["responseZh"]),
            self._pair(card["question"], card["response"]),
            f"<div>{html.escape(card['questionZh'])}</div><div>{html.escape(card['responseZh'])}</div>",
            html.escape(grammar["questionPattern"]),
            html.escape(grammar["responsePattern"]),
            html.escape(grammar["tense"]),
            html.escape(grammar["chunks"]),
            vocabulary,
            f"[sound:{aria_natural_name}]",
            f"[sound:{aria_clear_name}]",
            f"[sound:{jenny_natural_name}]",
            f"[sound:{jenny_clear_name}]",
        ]
        tags = ["句练", f"编号_{card['id']:03d}", self._tag(card["category"])]
        return genanki.Note(
            model=self.model,
            fields=fields,
            tags=tags,
            guid=f"sentence-workplace-phonetics-v3-{card['id']:03d}",
        )

    def _vocabulary_html(self, card: dict[str, Any]) -> str:
        words = CourseVocabulary.tokenize(card)
        entries = []
        for word in words:
            part_of_speech, meaning = CourseVocabulary.metadata(
                word, self.known_vocabulary
            )
            american_ipa, british_ipa, kk = CourseVocabulary.phonetics(word)
            entries.append(
                f'<div class="word-entry"><div class="word-summary">'
                f'<span class="word">{html.escape(word)}</span>'
                f'<span class="part-of-speech">{html.escape(part_of_speech)}</span>'
                f'<span class="word-meaning">{html.escape(meaning)}</span></div>'
                f'<div class="pronunciations">'
                f'<div class="pronunciation"><span>美式 IPA</span>/{html.escape(american_ipa)}/</div>'
                f'<div class="pronunciation"><span>英式 IPA</span>/{html.escape(british_ipa)}/</div>'
                f'<div class="pronunciation"><span>KK</span>/{html.escape(kk)}/</div>'
                f'</div></div>'
            )
        return (
            f'<details class="vocabulary" open><summary>全部词汇 · {len(words)} 词</summary>'
            f'{"".join(entries)}</details>'
        )

    @staticmethod
    def _pair(question: str, response: str) -> str:
        return (
            f"<div class='sentence question'>{html.escape(question)}</div>"
            f"<div class='sentence response'>{html.escape(response)}</div>"
        )

    @staticmethod
    def _tag(value: str) -> str:
        return "场景_" + "_".join(value.split())

    def _set_card_order(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            extracted = Path(directory)
            with zipfile.ZipFile(OUTPUT_PATH) as archive:
                archive.extractall(extracted)
            database = extracted / "collection.anki2"
            with sqlite3.connect(database) as connection:
                card_ids = [row[0] for row in connection.execute("SELECT id FROM cards ORDER BY id")]
                connection.executemany(
                    "UPDATE cards SET due = ? WHERE id = ?",
                    ((position, card_id) for position, card_id in enumerate(card_ids, start=1)),
                )
            replacement = OUTPUT_PATH.with_suffix(".tmp")
            with zipfile.ZipFile(replacement, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for path in sorted(extracted.iterdir(), key=lambda item: item.name):
                    archive.write(path, path.name)
            replacement.replace(OUTPUT_PATH)

    @staticmethod
    def _create_model() -> genanki.Model:
        return genanki.Model(
            stable_id("model:sentence-workplace-phonetics-v3"),
            "句练 · 软件职场英语 · 音标词汇版 V3",
            fields=[
                {"name": "Number"},
                {"name": "Category"},
                {"name": "Prompt"},
                {"name": "English"},
                {"name": "Translation"},
                {"name": "QuestionPattern"},
                {"name": "ResponsePattern"},
                {"name": "Tense"},
                {"name": "Chunks"},
                {"name": "Vocabulary"},
                {"name": "NaturalAudio"},
                {"name": "ClearAudio"},
                {"name": "JennyNaturalAudio"},
                {"name": "JennyClearAudio"},
            ],
            templates=[
                {
                    "name": "中文回忆英文",
                    "qfmt": """
<div class="meta">#{{Number}} · {{Category}}</div>
<div class="eyebrow">先完整说出英文问答</div>
<div class="prompt">{{Prompt}}</div>
""",
                    "afmt": """
{{FrontSide}}
<hr>
<div class="answer">{{English}}</div>
<div class="audio-panel">
    <div class="audio-panel-header">
        <span>发音</span>
        <button class="loop-button" id="loop-button" type="button" aria-pressed="false">循环全部</button>
    </div>
    <div class="audio-row">
        <b>Aria</b>
        <div class="audio-modes"><span>连读 {{NaturalAudio}}</span><span>分词 {{ClearAudio}}</span></div>
    </div>
    <div class="audio-row">
        <b>Jenny</b>
        <div class="audio-modes"><span>连读 {{JennyNaturalAudio}}</span><span>分词 {{JennyClearAudio}}</span></div>
    </div>
</div>
{{Vocabulary}}
<div id="loop-audio-sources" hidden
    data-aria-natural="sentence_{{Number}}_aria_natural.mp3"
    data-aria-clear="sentence_{{Number}}_aria_clear.mp3"
    data-jenny-natural="sentence_{{Number}}_jenny_natural.mp3"
    data-jenny-clear="sentence_{{Number}}_jenny_clear.mp3">
</div>
<script>
(() => {
    if (window.sentenceLoopPlayer) window.sentenceLoopPlayer.stop();

    const button = document.getElementById("loop-button");
    const sources = document.getElementById("loop-audio-sources");
    const files = [
        sources.dataset.ariaNatural,
        sources.dataset.ariaClear,
        sources.dataset.jennyNatural,
        sources.dataset.jennyClear,
    ];
    let active = false;
    let audio = null;
    let index = 0;

    const stop = () => {
        active = false;
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio = null;
        }
        button.textContent = "循环播放四段音频";
        button.setAttribute("aria-pressed", "false");
        button.classList.remove("is-playing");
    };

    const playNext = () => {
        if (!active) return;
        audio = new Audio(files[index]);
        audio.addEventListener("ended", () => {
            index = (index + 1) % files.length;
            playNext();
        }, { once: true });
        audio.addEventListener("error", () => {
            stop();
            button.textContent = "播放失败，请点单段音频";
        }, { once: true });
        audio.play().catch(() => {
            stop();
            button.textContent = "播放失败，请点单段音频";
        });
    };

    button.addEventListener("click", () => {
        if (active) {
            stop();
            return;
        }
        active = true;
        index = 0;
        button.textContent = "停止循环播放";
        button.setAttribute("aria-pressed", "true");
        button.classList.add("is-playing");
        playNext();
    });

    window.sentenceLoopPlayer = { stop };
})();
</script>
<details class="reference">
    <summary>表达提示</summary>
    <div class="grammar-grid">
        <div><b>常用表达</b>{{Chunks}}</div>
        <div><b>可替换句型</b>{{ResponsePattern}}</div>
    </div>
</details>
<div class="tip">听清晰分词版跟读三遍，再听自然连读版复述，最后替换句型内容造句。</div>
""",
                }
            ],
            css="""
.card { background: #f7f8f3; color: #17231f; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; font-size: 18px; line-height: 1.55; padding: 18px; text-align: left; }
.meta { color: #68736e; font-size: 13px; font-weight: 700; margin-bottom: 26px; text-transform: uppercase; }
.eyebrow { color: #c94b37; font-size: 12px; font-weight: 800; letter-spacing: .08em; margin-bottom: 10px; }
.prompt, .answer { font-size: 24px; font-weight: 750; }
.sentence + .sentence { margin-top: 12px; }
.response { color: #3f5d53; }
hr { border: 0; border-top: 1px solid #d9ded9; margin: 24px 0; }
.vocabulary { background: #fff; border: 1px solid #d9ded9; border-radius: 7px; margin-top: 16px; overflow: hidden; }
.vocabulary > summary { color: #68736e; cursor: pointer; font-size: 12px; font-weight: 800; list-style-position: inside; padding: 9px 12px; }
.word-entry { border-top: 1px solid #d9ded9; padding: 9px 12px 10px; }
.word-summary { align-items: baseline; display: flex; gap: 7px; }
.word { font-size: 17px; font-weight: 800; }
.part-of-speech { color: #c94b37; font-size: 12px; font-weight: 800; }
.word-meaning { color: #3f5d53; font-size: 13px; margin-left: auto; text-align: right; }
.pronunciations { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 5px; }
.pronunciation { font-family: "Times New Roman", serif; font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; }
.pronunciation span { color: #68736e; display: block; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; font-size: 10px; font-weight: 700; }
.audio-panel { background: #fff; border: 1px solid #d9ded9; border-radius: 7px; margin-top: 16px; overflow: hidden; }
.audio-panel-header, .audio-row { align-items: center; display: flex; justify-content: space-between; }
.audio-panel-header { border-bottom: 1px solid #d9ded9; min-height: 42px; padding: 5px 7px 5px 13px; }
.audio-panel-header > span { color: #68736e; font-size: 12px; font-weight: 800; }
.audio-row { min-height: 48px; padding: 6px 7px 6px 13px; }
.audio-row + .audio-row { border-top: 1px solid #d9ded9; }
.audio-row b { font-size: 14px; }
.audio-modes { align-items: center; display: flex; gap: 12px; }
.audio-modes span { align-items: center; display: flex; font-size: 12px; font-weight: 700; gap: 3px; white-space: nowrap; }
.audio-modes .replay-button { margin: 0; }
.loop-button { background: #17231f; border: 0; border-radius: 6px; color: #fff; cursor: pointer; font-size: 13px; font-weight: 800; min-height: 34px; min-width: 92px; padding: 5px 10px; }
.loop-button.is-playing { background: #c94b37; }
.reference { border-top: 1px solid #d9ded9; margin-top: 22px; padding-top: 14px; }
.reference summary { color: #3f5d53; cursor: pointer; font-size: 14px; font-weight: 800; }
.reference[open] summary { margin-bottom: 12px; }
.grammar-grid { display: grid; gap: 8px; }
.grammar-grid > div { background: #fff; border-left: 3px solid #ed5b42; padding: 10px 12px; }
.grammar-grid b { display: block; font-size: 12px; margin-bottom: 3px; }
table { border-collapse: collapse; margin-top: 16px; width: 100%; }
th, td { border-bottom: 1px solid #d9ded9; font-size: 14px; padding: 8px 5px; }
th { color: #68736e; text-align: left; }
.tip { background: #f5c84c; border-radius: 7px; font-size: 14px; margin-top: 18px; padding: 12px; }
.replay-button svg { width: 30px; height: 30px; }
.nightMode .card { background: #17231f; color: #f7f8f3; }
.nightMode .audio-panel, .nightMode .vocabulary, .nightMode .grammar-grid > div { background: #22312c; border-color: #43534d; }
.nightMode .audio-panel-header, .nightMode .audio-row, .nightMode .word-entry { border-color: #43534d; }
.nightMode .loop-button { background: #f5c84c; color: #17231f; }
.nightMode .loop-button.is-playing { background: #ed5b42; color: #17231f; }
.nightMode .response { color: #b9d2c8; }
.nightMode .meta, .nightMode th { color: #bdc7c2; }
.nightMode .word-meaning { color: #b9d2c8; }
.nightMode .reference { border-color: #43534d; }
.nightMode .reference summary { color: #b9d2c8; }
.nightMode .tip { color: #17231f; }
""",
        )


if __name__ == "__main__":
    AnkiDeckBuilder().build()
