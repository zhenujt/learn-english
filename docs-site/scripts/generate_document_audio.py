#!/usr/bin/env python3

from __future__ import annotations

import argparse
import asyncio
import hashlib
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import edge_tts


SITE_DIRECTORY = Path(__file__).resolve().parents[1]
REPOSITORY_DIRECTORY = SITE_DIRECTORY.parent
AUDIO_DIRECTORY = SITE_DIRECTORY / "public" / "audio" / "documents"
CACHE_DIRECTORY = SITE_DIRECTORY / ".audio-cache"
IGNORED_DIRECTORIES = {".git", ".venv", "dist", "docs-site", "node_modules"}
CHINESE_PATTERN = re.compile(r"[\u3400-\u9fff]")
ENGLISH_PATTERN = re.compile(r"[A-Za-z]")


@dataclass(frozen=True)
class BilingualExample:
    chinese: str
    english: str


class DocumentAudioNaming:
    @staticmethod
    def canonical_path(document_path: Path) -> str:
        relative_path = document_path.relative_to(REPOSITORY_DIRECTORY).as_posix()
        return relative_path.removesuffix(".zh.md") + ".md" if relative_path.endswith(".zh.md") else relative_path

    @classmethod
    def output_path(cls, document_path: Path) -> Path:
        digest = hashlib.sha256(cls.canonical_path(document_path).encode("utf-8")).hexdigest()[:20]
        return AUDIO_DIRECTORY / f"{digest}.mp3"


class MarkdownExampleExtractor:
    EXCLUDED_CUES = ("错误", "不自然", "避免", "❌")

    def extract(self, document_path: Path) -> list[BilingualExample]:
        content = document_path.read_text(encoding="utf-8")
        examples = self._extract_fenced_examples(content)
        examples.extend(self._extract_table_examples(content))
        examples.extend(self._extract_inline_examples(content))
        return self._unique(examples)

    def _extract_fenced_examples(self, content: str) -> list[BilingualExample]:
        examples: list[BilingualExample] = []
        for match in re.finditer(r"```(?:text)?\s*\n(.*?)\n```", content, re.DOTALL):
            lines = [self._plain_text(line) for line in match.group(1).splitlines()]
            index = 0
            while index < len(lines):
                line = lines[index]
                split_example = self._split_mixed_line(line)
                if split_example:
                    examples.append(split_example)
                    index += 1
                    continue
                if self._is_english(line):
                    chinese_index = index + 1
                    while chinese_index < len(lines) and not lines[chinese_index]:
                        chinese_index += 1
                    if chinese_index < len(lines) and self._is_chinese(lines[chinese_index]):
                        examples.append(BilingualExample(lines[chinese_index], line))
                        index = chinese_index + 1
                        continue
                index += 1
        return examples

    def _extract_table_examples(self, content: str) -> list[BilingualExample]:
        examples: list[BilingualExample] = []
        for line in content.splitlines():
            if not line.lstrip().startswith("|"):
                continue
            cells = [self._plain_text(cell) for cell in line.strip().strip("|").split("|")]
            if all(re.fullmatch(r"[-: ]+", cell) for cell in cells if cell):
                continue
            english_cells = [cell for cell in cells if self._is_english(cell)]
            chinese_cells = [cell for cell in cells if self._is_chinese(cell) and not ENGLISH_PATTERN.search(cell)]
            if len(english_cells) == 1 and chinese_cells:
                examples.append(BilingualExample(chinese_cells[0], english_cells[0]))
        return examples

    def _extract_inline_examples(self, content: str) -> list[BilingualExample]:
        examples: list[BilingualExample] = []
        in_fence = False
        for line in content.splitlines():
            if line.strip().startswith("```"):
                in_fence = not in_fence
                continue
            if (
                in_fence
                or not CHINESE_PATTERN.search(line)
                or any(cue in line for cue in self.EXCLUDED_CUES)
            ):
                continue
            english_values = [
                self._plain_text(value)
                for value in re.findall(r"`([^`]+)`", line)
                if self._is_english(self._plain_text(value))
            ]
            if not english_values:
                continue
            chinese = self._inline_chinese_prompt(line)
            if not chinese:
                continue
            examples.extend(BilingualExample(chinese, english) for english in english_values)
        return examples

    def _inline_chinese_prompt(self, line: str) -> str:
        without_code = re.sub(r"`[^`]+`", "", line)
        plain = self._plain_text(without_code)
        chinese_parts = re.findall(r"[\u3400-\u9fff][\u3400-\u9fff，。！？、；：“”‘’（）/ ·+-]*", plain)
        chinese = "".join(chinese_parts).strip("，。；：-/ ")
        return chinese[:240]

    def _split_mixed_line(self, line: str) -> BilingualExample | None:
        chinese_match = CHINESE_PATTERN.search(line)
        if not chinese_match:
            return None
        english = line[: chinese_match.start()].strip()
        chinese = line[chinese_match.start() :].strip()
        if self._is_english(english) and self._is_chinese(chinese):
            return BilingualExample(chinese, english)
        return None

    @staticmethod
    def _plain_text(value: str) -> str:
        value = re.sub(r"`([^`]+)`", r"\1", value)
        value = re.sub(r"[*_#>]", "", value)
        return re.sub(r"\s+", " ", value).strip(" -|")

    @staticmethod
    def _is_english(value: str) -> bool:
        words = re.findall(r"[A-Za-z]+(?:['-][A-Za-z]+)?", value)
        return (
            len(words) >= 2
            and not CHINESE_PATTERN.search(value)
            and not re.search(r"(?:^|\s)[+=>](?:\s|$)|\[|\]", value)
            and len(value) <= 500
        )

    @staticmethod
    def _is_chinese(value: str) -> bool:
        return bool(CHINESE_PATTERN.search(value)) and len(value) <= 500

    @staticmethod
    def _unique(examples: list[BilingualExample]) -> list[BilingualExample]:
        return list(dict.fromkeys(examples))


class EdgeSpeechSynthesizer:
    CHINESE_VOICE = "zh-CN-XiaoxiaoNeural"
    ENGLISH_VOICE = "en-US-MichelleNeural"
    CHINESE_RATE = "-10%"
    ENGLISH_RATE = "-20%"
    REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self) -> None:
        self.semaphore = asyncio.Semaphore(3)

    async def synthesize(self, text: str, voice: str, rate: str) -> Path:
        cache_key = hashlib.sha256(f"{voice}|{rate}|{text}".encode("utf-8")).hexdigest()
        output_path = CACHE_DIRECTORY / f"{cache_key}.mp3"
        if output_path.is_file() and output_path.stat().st_size > 0:
            return output_path
        CACHE_DIRECTORY.mkdir(parents=True, exist_ok=True)
        temporary_path = output_path.with_suffix(".tmp.mp3")
        for attempt in range(1, 5):
            temporary_path.unlink(missing_ok=True)
            try:
                async with self.semaphore:
                    await asyncio.wait_for(
                        edge_tts.Communicate(text, voice, rate=rate).save(str(temporary_path)),
                        timeout=self.REQUEST_TIMEOUT_SECONDS,
                    )
                temporary_path.replace(output_path)
                return output_path
            except Exception:
                temporary_path.unlink(missing_ok=True)
                if attempt == 4:
                    raise
                await asyncio.sleep(attempt * 2)
        raise RuntimeError("Audio synthesis retry loop ended unexpectedly.")

    async def synthesize_many(self, requests: list[tuple[str, str, str]]) -> list[Path]:
        tasks: dict[tuple[str, str, str], asyncio.Task[Path]] = {}
        for request in requests:
            if request not in tasks:
                tasks[request] = asyncio.create_task(self.synthesize(*request))
        await asyncio.gather(*tasks.values())
        return [tasks[request].result() for request in requests]


class DocumentAudioGenerator:
    def __init__(self, force: bool = False) -> None:
        self.force = force
        self.extractor = MarkdownExampleExtractor()
        self.synthesizer = EdgeSpeechSynthesizer()

    async def generate(self, document_path: Path) -> Path:
        examples = self.extractor.extract(document_path)
        if not examples:
            raise ValueError(f"No bilingual examples found in {document_path}")
        output_path = DocumentAudioNaming.output_path(document_path)
        if output_path.is_file() and output_path.stat().st_size > 0 and not self.force:
            print(f"skip={output_path.relative_to(REPOSITORY_DIRECTORY)}")
            return output_path

        AUDIO_DIRECTORY.mkdir(parents=True, exist_ok=True)
        requests: list[tuple[str, str, str]] = []
        for example in examples:
            requests.append((
                self._finish_sentence(example.chinese, "。"),
                self.synthesizer.CHINESE_VOICE,
                self.synthesizer.CHINESE_RATE,
            ))
            english_sentence = self._finish_sentence(example.english, ".")
            requests.append((
                " ... ".join([english_sentence] * 3),
                self.synthesizer.ENGLISH_VOICE,
                self.synthesizer.ENGLISH_RATE,
            ))
        segment_paths = await self.synthesizer.synthesize_many(requests)
        print(f"audio={len(segment_paths)}/{len(segment_paths)}")

        self._concatenate(segment_paths, output_path)
        print(f"examples={len(examples)}")
        print(f"output={output_path.relative_to(REPOSITORY_DIRECTORY)}")
        return output_path

    @staticmethod
    def _finish_sentence(value: str, punctuation: str) -> str:
        return value if value.endswith((".", "!", "?", "。", "！", "？")) else value + punctuation

    @staticmethod
    def _concatenate(segment_paths: list[Path], output_path: Path) -> None:
        if not shutil.which("ffmpeg"):
            raise RuntimeError("ffmpeg is required to combine document audio.")
        list_path = CACHE_DIRECTORY / "concat.txt"
        list_path.write_text(
            "".join(f"file '{path.as_posix()}'\n" for path in segment_paths),
            encoding="utf-8",
        )
        temporary_path = output_path.with_suffix(".tmp.mp3")
        subprocess.run(
            [
                "ffmpeg",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_path),
                "-c",
                "copy",
                str(temporary_path),
            ],
            check=True,
        )
        temporary_path.replace(output_path)


class MarkdownDocumentFinder:
    def find_all(self) -> list[Path]:
        return sorted(
            path
            for path in REPOSITORY_DIRECTORY.rglob("*.md")
            if not any(part in IGNORED_DIRECTORIES for part in path.parts)
            and (path.name.endswith(".zh.md") or not path.with_name(f"{path.stem}.zh.md").exists())
        )

    def resolve(self, value: str) -> Path:
        path = (REPOSITORY_DIRECTORY / value).resolve()
        if not path.is_relative_to(REPOSITORY_DIRECTORY) or not path.is_file() or path.suffix != ".md":
            raise ValueError(f"Invalid Markdown document: {value}")
        chinese_path = path.with_name(f"{path.stem}.zh.md")
        return chinese_path if chinese_path.is_file() else path


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate bilingual document MP3 files.")
    parser.add_argument("documents", nargs="*", help="Repository-relative Markdown paths")
    parser.add_argument("--all", action="store_true", help="Generate audio for every eligible document")
    parser.add_argument("--dry-run", action="store_true", help="Extract and report examples without TTS")
    parser.add_argument("--force", action="store_true", help="Replace existing document MP3 files")
    args = parser.parse_args()
    finder = MarkdownDocumentFinder()
    paths = finder.find_all() if args.all else [finder.resolve(value) for value in args.documents]
    if not paths:
        parser.error("Provide at least one Markdown path or use --all.")

    extractor = MarkdownExampleExtractor()
    if args.dry_run:
        for path in paths:
            examples = extractor.extract(path)
            print(f"{path.relative_to(REPOSITORY_DIRECTORY)}: {len(examples)} examples")
            for example in examples[:5]:
                print(f"  {example.chinese} -> {example.english}")
        return

    generator = DocumentAudioGenerator(force=args.force)
    for path in paths:
        try:
            await generator.generate(path)
        except ValueError as error:
            print(f"skip={error}")


if __name__ == "__main__":
    asyncio.run(main())