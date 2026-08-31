import asyncio
import hashlib
import html
import re
from dataclasses import dataclass
from pathlib import Path

import edge_tts
import genanki


ROOT = Path(__file__).resolve().parent
SOURCE_PATH = ROOT / "software-demo-and-discussion-playbook.zh.md"
AUDIO_PATH = ROOT / "audio" / "software-demo-playbook-michelle"
OUTPUT_PATH = ROOT / "software-demo-and-discussion-playbook-michelle-v1.apkg"


def stable_id(value: str, minimum: int = 1000) -> int:
    """Return a deterministic positive identifier accepted by Anki."""
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]
    return int(digest, 16) % 1_000_000_000 + minimum


@dataclass(frozen=True)
class SpeakingCard:
    """Represent one Chinese-to-English active-recall prompt."""

    number: int
    section: str
    subsection: str
    english: str
    chinese: str


class PlaybookCardExtractor:
    """Extract speakable bilingual pairs from fenced text examples."""

    SAME_LINE_PAIR = re.compile(r"^(.*?\S)\s{2,}([\u3400-\u9fff].*)$")
    CHINESE = re.compile(r"[\u3400-\u9fff]")

    def extract(self) -> list[SpeakingCard]:
        """Return unique, ordered speaking cards from the Chinese playbook."""
        section = "基础套路"
        subsection = "核心表达"
        in_text_block = False
        pending_english: str | None = None
        pairs: list[tuple[str, str, str, str]] = []

        for raw_line in SOURCE_PATH.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if line.startswith("## "):
                section = re.sub(r"^##\s+\d+\.\s*", "", line)
                subsection = section
                pending_english = None
                continue
            if line.startswith("### "):
                subsection = line.removeprefix("### ").strip()
                pending_english = None
                continue
            if line == "```text":
                in_text_block = True
                pending_english = None
                continue
            if line == "```":
                in_text_block = False
                pending_english = None
                continue
            if not in_text_block or not line:
                continue

            normalized = re.sub(r"^\d+\.\s*", "", line).strip()
            same_line = self.SAME_LINE_PAIR.match(normalized)
            if same_line:
                self._append_pair(
                    pairs, section, subsection, same_line.group(1), same_line.group(2)
                )
                pending_english = None
            elif self.CHINESE.search(normalized):
                if pending_english:
                    self._append_pair(
                        pairs, section, subsection, pending_english, normalized
                    )
                pending_english = None
            elif self._is_speakable_english(normalized):
                pending_english = normalized
            else:
                pending_english = None

        unique: dict[tuple[str, str], tuple[str, str]] = {}
        for current_section, current_subsection, english, chinese in pairs:
            unique.setdefault((english, chinese), (current_section, current_subsection))

        return [
            SpeakingCard(index, card_section, card_subsection, english, chinese)
            for index, ((english, chinese), (card_section, card_subsection)) in enumerate(
                unique.items(), start=1
            )
        ]

    def _append_pair(
        self,
        pairs: list[tuple[str, str, str, str]],
        section: str,
        subsection: str,
        english: str,
        chinese: str,
    ) -> None:
        english = english.strip()
        chinese = chinese.strip()
        if self._is_speakable_english(english) and self.CHINESE.search(chinese):
            pairs.append((section, subsection, english, chinese))

    @staticmethod
    def _is_speakable_english(value: str) -> bool:
        return (
            bool(re.search(r"[A-Za-z]", value))
            and not re.search(r"[\[\]→]", value)
            and " -> " not in value
            and "..." not in value
            and not value.endswith(":")
        )


class MichelleAudioGenerator:
    """Generate one natural Michelle recording for each speaking card."""

    VOICE = "en-US-MichelleNeural"

    async def generate(self, cards: list[SpeakingCard]) -> list[Path]:
        """Generate missing audio files and return all media paths."""
        AUDIO_PATH.mkdir(parents=True, exist_ok=True)
        paths: list[Path] = []
        for card in cards:
            path = AUDIO_PATH / f"demo_playbook_{card.number:03d}_michelle.mp3"
            if not path.is_file() or path.stat().st_size == 0:
                await edge_tts.Communicate(
                    card.english, self.VOICE, rate="-10%"
                ).save(str(path))
            paths.append(path)
            if card.number % 25 == 0 or card.number == len(cards):
                print(f"audio={card.number}/{len(cards)}")
        return paths


class PlaybookAnkiBuilder:
    """Build the software demo and discussion active-recall deck."""

    DECK_NAME = "软件 Demo 与技术讨论英语 · Michelle V1"

    def __init__(self) -> None:
        self.model = self._create_model()
        self.deck = genanki.Deck(stable_id(f"deck:{self.DECK_NAME}"), self.DECK_NAME)

    async def build(self) -> None:
        """Extract cards, generate audio, and write the APKG file."""
        cards = PlaybookCardExtractor().extract()
        if len(cards) < 100:
            raise ValueError(f"Expected at least 100 useful cards, found {len(cards)}")

        media_paths = await MichelleAudioGenerator().generate(cards)
        for card, audio_path in zip(cards, media_paths):
            self.deck.add_note(self._create_note(card, audio_path.name))

        package = genanki.Package(self.deck)
        package.media_files = [str(path) for path in media_paths]
        package.write_to_file(str(OUTPUT_PATH))
        print(f"cards={len(cards)}")
        print(f"audio_files={len(media_paths)}")
        print(f"output={OUTPUT_PATH}")

    def _create_note(self, card: SpeakingCard, audio_name: str) -> genanki.Note:
        fields = [
            f"{card.number:03d}",
            html.escape(card.section),
            html.escape(card.subsection),
            html.escape(card.chinese),
            html.escape(card.english),
            f"[sound:{audio_name}]",
        ]
        return genanki.Note(
            model=self.model,
            fields=fields,
            tags=[
                "软件Demo英语",
                self._tag(card.section),
                self._tag(card.subsection),
            ],
            guid=f"software-demo-playbook-michelle-v1-{card.number:03d}",
        )

    def _create_model(self) -> genanki.Model:
        return genanki.Model(
            stable_id("model:software-demo-playbook-michelle-v1"),
            "软件 Demo 与技术讨论英语 · Michelle V1",
            fields=[
                {"name": "Number"},
                {"name": "Section"},
                {"name": "Subsection"},
                {"name": "Chinese"},
                {"name": "English"},
                {"name": "Audio"},
            ],
            templates=[
                {
                    "name": "中文提示 → 英文输出",
                    "qfmt": """
<main class="card-shell">
  <div class="meta">#{{Number}} · {{Section}}</div>
    <div class="instruction">第 1 步 · 看中文</div>
  <div class="prompt">{{Chinese}}</div>
</main>
""",
                    "afmt": """
<main class="card-shell">
  <div class="meta">#{{Number}} · {{Section}} · {{Subsection}}</div>
  <div class="prompt prompt-small">{{Chinese}}</div>
  <hr>
    <div class="instruction">第 2 步 · 先看标准英文并朗读</div>
    <div class="answer" id="standard-answer">{{English}}</div>
  <div class="audio">{{Audio}}</div>
    <section class="typing-practice">
        <div class="instruction">第 3 步 · 隐藏答案，再手动输入英文</div>
        <button class="typing-button" id="start-typing" type="button">隐藏答案并开始输入</button>
        <div id="typing-controls" hidden>
            <textarea id="typed-answer" rows="4" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="输入完整英文"></textarea>
            <button class="typing-button" id="check-typing" type="button">核对输入</button>
        </div>
        <div id="typing-feedback" aria-live="polite"></div>
        <div id="expected-answer" hidden>{{text:English}}</div>
    </section>
    <div class="practice">输入有误请选择“重来（Again）”，正确再选择其他评分。</div>
</main>
<script>
(() => {
    const answer = document.getElementById("standard-answer");
    const startTyping = document.getElementById("start-typing");
    const controls = document.getElementById("typing-controls");
    const typedAnswer = document.getElementById("typed-answer");
    const checkTyping = document.getElementById("check-typing");
    const feedback = document.getElementById("typing-feedback");
    const expected = document.getElementById("expected-answer").textContent;
    const normalize = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

    startTyping.addEventListener("click", () => {
        answer.hidden = true;
        startTyping.hidden = true;
        controls.hidden = false;
        typedAnswer.focus();
    });

    checkTyping.addEventListener("click", () => {
        const correct = normalize(typedAnswer.value) === normalize(expected);
        answer.hidden = false;
        feedback.textContent = correct
            ? "输入正确，可以选择合适的评分。"
            : "与标准答案不一致，请选择“重来（Again）”重新学习。";
        feedback.className = correct ? "typing-correct" : "typing-wrong";
    });
})();
</script>
""",
                }
            ],
            css="""
.card {
  margin: 0;
  background: #f4f1ea;
  color: #17211b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  text-align: left;
}
.card-shell {
  box-sizing: border-box;
  max-width: 680px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 28px 22px 40px;
}
.meta {
  color: #52625a;
  font-size: 13px;
  font-weight: 700;
}
.instruction, .practice {
  margin-top: 28px;
  color: #68766f;
  font-size: 14px;
}
.prompt {
  margin-top: 24px;
  font-size: 28px;
  font-weight: 750;
  line-height: 1.45;
}
.prompt-small {
  color: #52625a;
  font-size: 18px;
  font-weight: 600;
}
.typing-practice { border-top: 1px solid #c9cec8; margin-top: 24px; padding-top: 4px; }
.typing-button { width: 100%; min-height: 44px; padding: 10px 14px; border: 0; border-radius: 6px; background: #17211b; color: #fff; font-size: 14px; font-weight: 750; }
#typed-answer { box-sizing: border-box; width: 100%; margin-bottom: 10px; padding: 13px 14px; border: 2px solid #9da8a1; border-radius: 6px; background: #fff; color: #17211b; font-family: inherit; font-size: 19px; line-height: 1.45; resize: vertical; }
#typed-answer:focus { border-color: #0b6847; outline: 3px solid rgba(11, 104, 71, .14); }
#typing-feedback { min-height: 22px; margin-top: 10px; font-size: 14px; font-weight: 750; }
.typing-correct { color: #087849; }
.typing-wrong { color: #b43f2d; }
hr {
  margin: 26px 0;
  border: 0;
  border-top: 1px solid #c9cec8;
}
.answer {
  color: #0b6847;
  font-size: 30px;
  font-weight: 750;
  line-height: 1.35;
}
.audio {
  margin-top: 24px;
}
.nightMode .card, .night_mode .card {
  background: #17201b;
  color: #f2efe7;
}
.nightMode .answer, .night_mode .answer {
  color: #78d6ad;
}
.nightMode #typed-answer, .night_mode #typed-answer { border-color: #68766f; background: #222d27; color: #f2efe7; }
.nightMode .typing-button, .night_mode .typing-button { background: #78d6ad; color: #17211b; }
""",
        )

    @staticmethod
    def _tag(value: str) -> str:
        return re.sub(r"[^\w\u3400-\u9fff]+", "_", value).strip("_")


if __name__ == "__main__":
    asyncio.run(PlaybookAnkiBuilder().build())