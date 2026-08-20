#!/usr/bin/env python3
"""Play each workplace English recording several times, then read its Chinese translation."""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

COURSE_DIRECTORY = Path(__file__).resolve().parent
AUDIO_DIRECTORY = COURSE_DIRECTORY / "audio" / "software-business-english"
CARDS_PATH = COURSE_DIRECTORY / "sentence-trainer" / "src" / "data" / "cards.json"
ANNOTATION_PATTERN = re.compile(r"[（(][^）)]*[）)]")


class SentencePlayer:
    """Play sentence recordings and speak their Chinese meaning."""

    def __init__(
        self,
        audio_directory: Path = AUDIO_DIRECTORY,
        cards_path: Path = CARDS_PATH,
        repeat: int = 5,
        voice: str = "Tingting",
        clear_speech: bool = False,
    ) -> None:
        self.audio_directory = audio_directory
        self.cards_path = cards_path
        self.repeat = repeat
        self.voice = voice
        self.clear_speech = clear_speech

    def play(self, first: int = 1, last: int = 100) -> None:
        """Play every selected card, English recording first and Chinese last."""
        for card in self._load_cards(first, last):
            audio_file = self._audio_file(card["id"])
            if not audio_file.exists():
                print(f"跳过 #{card['id']:03d}：找不到 {audio_file.name}")
                continue

            print(f"\n#{card['id']:03d} · {card['category']}")
            print(f"  {card['question']}")
            print(f"  {card['response']}")

            for round_number in range(1, self.repeat + 1):
                print(f"  英文第 {round_number}/{self.repeat} 遍")
                self._run(["/usr/bin/afplay", str(audio_file)])

            chinese = self._chinese_text(card)
            print(f"  中文：{chinese}")
            self._run(["/usr/bin/say", "-v", self.voice, chinese])

    def _load_cards(self, first: int, last: int) -> list[dict]:
        cards = json.loads(self.cards_path.read_text(encoding="utf-8"))
        return [card for card in cards if first <= card["id"] <= last]

    def _audio_file(self, card_id: int) -> Path:
        directory = self.audio_directory / "no-linking" if self.clear_speech else self.audio_directory
        return directory / f"{card_id:03d}.mp3"

    @staticmethod
    def _chinese_text(card: dict) -> str:
        question = ANNOTATION_PATTERN.sub("", card["questionZh"]).strip()
        response = ANNOTATION_PATTERN.sub("", card["responseZh"]).strip()
        return f"{question} {response}"

    @staticmethod
    def _run(command: list[str]) -> None:
        subprocess.run(command, check=False)


def main() -> int:
    """Parse playback options and start the session."""
    parser = argparse.ArgumentParser(description="逐句播放英文录音并朗读中文。")
    parser.add_argument("--repeat", type=int, default=5, help="每句英文播放次数，默认 5")
    parser.add_argument("--first", type=int, default=1, help="起始句子编号，默认 1")
    parser.add_argument("--last", type=int, default=100, help="结束句子编号，默认 100")
    parser.add_argument("--voice", default="Tingting", help="中文朗读语音，默认 Tingting")
    parser.add_argument("--clear", action="store_true", help="使用清晰分词版录音")
    arguments = parser.parse_args()

    player = SentencePlayer(
        repeat=arguments.repeat,
        voice=arguments.voice,
        clear_speech=arguments.clear,
    )

    try:
        player.play(arguments.first, arguments.last)
    except KeyboardInterrupt:
        print("\n已停止播放。")
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
