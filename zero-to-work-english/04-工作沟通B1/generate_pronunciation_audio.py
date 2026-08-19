#!/usr/bin/env python3

import argparse
import asyncio
import re
from dataclasses import dataclass
from pathlib import Path

import edge_tts


QUESTION_RE = re.compile(r"^(\d{1,3})\. \*\*(.+?)\*\*")
RESPONSE_RE = re.compile(r"^(\s+)- (?:\*\*(.+?)\*\*|(.+))$")
CORE_END_RE = re.compile(
    r"^## (Practical Meeting Scripts|日常英文会议实战脚本)$"
)
AUDIO_LINK_RE = re.compile(
    r"^\s+- \[🔊 (?:(?:Aria|Jenny) · )?(?:Natural linking|No linking|自然连读版|不连读版|American pronunciation|美式发音)\]"
)


@dataclass(frozen=True)
class QuestionAndResponse:
    number: int
    question: str
    response: str

    @property
    def speech_text(self) -> str:
        return f"{self.question} {self.response}"


@dataclass(frozen=True)
class VoiceOutput:
    name: str
    voice: str
    audio_directory: Path

    @property
    def no_linking_audio_directory(self) -> Path:
        return self.audio_directory / "no-linking"


class PronunciationAudioGenerator:
    def __init__(
        self,
        course_directory: Path,
        aria_voice: str,
        jenny_voice: str,
        rate: str,
        force: bool = False,
    ) -> None:
        self.course_directory = course_directory
        self.rate = rate
        self.force = force
        self.english_document = course_directory / "software-business-english-must-know.md"
        self.chinese_document = (
            course_directory / "software-business-english-must-know.zh.md"
        )
        self.audio_directory = (
            course_directory / "audio" / "software-business-english"
        )
        self.voice_outputs = (
            VoiceOutput("Aria", aria_voice, self.audio_directory),
            VoiceOutput("Jenny", jenny_voice, self.audio_directory / "jenny"),
        )

    async def run(self) -> None:
        pairs = self._read_core_pairs()
        if len(pairs) != 100:
            raise ValueError(f"Expected 100 core pairs, found {len(pairs)}")

        for voice_output in self.voice_outputs:
            voice_output.audio_directory.mkdir(parents=True, exist_ok=True)
            voice_output.no_linking_audio_directory.mkdir(
                parents=True,
                exist_ok=True,
            )
            for pair in pairs:
                await self._generate_audio(
                    pair.speech_text,
                    voice_output.audio_directory / f"{pair.number:03d}.mp3",
                    voice_output.voice,
                )
                await self._generate_audio(
                    self._add_word_pauses(pair.speech_text),
                    voice_output.no_linking_audio_directory
                    / f"{pair.number:03d}.mp3",
                    voice_output.voice,
                )

        self._insert_audio_links(
            self.english_document,
            "Natural linking",
            "No linking",
        )
        self._insert_audio_links(
            self.chinese_document,
            "自然连读版",
            "不连读版",
        )

    def _read_core_pairs(self) -> list[QuestionAndResponse]:
        pairs: list[QuestionAndResponse] = []
        current_number: int | None = None
        current_question = ""

        for line in self.english_document.read_text(encoding="utf-8").splitlines():
            if CORE_END_RE.match(line):
                break

            question_match = QUESTION_RE.match(line)
            if question_match:
                current_number = int(question_match.group(1))
                current_question = self._plain_text(question_match.group(2))
                continue

            response_match = RESPONSE_RE.match(line)
            if response_match and current_number is not None:
                response = response_match.group(2) or response_match.group(3)
                pairs.append(
                    QuestionAndResponse(
                        number=current_number,
                        question=current_question,
                        response=self._plain_text(response),
                    )
                )
                current_number = None

        return pairs

    async def _generate_audio(
        self,
        speech_text: str,
        output_path: Path,
        voice: str,
    ) -> None:
        if not self.force and output_path.exists() and output_path.stat().st_size > 0:
            return

        for attempt in range(3):
            try:
                communicator = edge_tts.Communicate(
                    speech_text,
                    voice,
                    rate=self.rate,
                )
                await asyncio.wait_for(
                    communicator.save(str(output_path)),
                    timeout=90,
                )
                return
            except (TimeoutError, OSError) as error:
                if attempt == 2:
                    raise RuntimeError(
                        f"Failed to generate {output_path.name} after 3 attempts"
                    ) from error

    def _insert_audio_links(
        self,
        document: Path,
        natural_label: str,
        no_linking_label: str,
    ) -> None:
        source_lines = document.read_text(encoding="utf-8").splitlines()
        filtered_lines = [line for line in source_lines if not AUDIO_LINK_RE.match(line)]
        output_lines: list[str] = []
        current_number: int | None = None
        inside_core_pairs = True

        for line in filtered_lines:
            if CORE_END_RE.match(line):
                inside_core_pairs = False

            question_match = QUESTION_RE.match(line) if inside_core_pairs else None
            if question_match:
                current_number = int(question_match.group(1))

            output_lines.append(line)

            response_match = RESPONSE_RE.match(line) if inside_core_pairs else None
            if response_match and current_number is not None:
                indent = response_match.group(1)
                output_lines.append(
                    f"{indent}- [🔊 Aria · {natural_label}](audio/software-business-english/"
                    f"{current_number:03d}.mp3)"
                )
                output_lines.append(
                    f"{indent}- [🔊 Aria · {no_linking_label}](audio/software-business-english/"
                    f"no-linking/{current_number:03d}.mp3)"
                )
                output_lines.append(
                    f"{indent}- [🔊 Jenny · {natural_label}](audio/software-business-english/"
                    f"jenny/{current_number:03d}.mp3)"
                )
                output_lines.append(
                    f"{indent}- [🔊 Jenny · {no_linking_label}](audio/software-business-english/"
                    f"jenny/no-linking/{current_number:03d}.mp3)"
                )
                current_number = None

        document.write_text("\n".join(output_lines) + "\n", encoding="utf-8")

    @staticmethod
    def _plain_text(value: str) -> str:
        return value.replace("`", "").replace("[", "").replace("]", "")

    @staticmethod
    def _add_word_pauses(value: str) -> str:
        sentences = re.split(r"(?<=[.!?])\s+", value)
        paused_sentences: list[str] = []

        for sentence in sentences:
            ending = sentence[-1] if sentence and sentence[-1] in ".!?" else ""
            body = sentence[:-1] if ending else sentence
            paused_sentences.append(", ".join(body.split()) + ending)

        return " ".join(paused_sentences)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate American English audio for the 100 core workplace pairs."
    )
    parser.add_argument("--voice", default="en-US-AriaNeural")
    parser.add_argument("--jenny-voice", default="en-US-JennyNeural")
    parser.add_argument("--rate", default="-15%")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate natural-linking audio even when output files already exist.",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    course_directory = Path(__file__).resolve().parent
    generator = PronunciationAudioGenerator(
        course_directory=course_directory,
        aria_voice=args.voice,
        jenny_voice=args.jenny_voice,
        rate=args.rate,
        force=args.force,
    )
    await generator.run()


if __name__ == "__main__":
    asyncio.run(main())