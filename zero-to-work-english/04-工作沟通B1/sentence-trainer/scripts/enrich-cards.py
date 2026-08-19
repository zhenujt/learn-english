import json
import sys
from pathlib import Path
from typing import Any

PROJECT_DIRECTORY = Path(__file__).resolve().parent.parent
CARDS_PATH = PROJECT_DIRECTORY / "src" / "data" / "cards.json"
sys.path.insert(0, str(PROJECT_DIRECTORY))

from course_vocabulary import CourseVocabulary


class WebVocabularyEnricher:
    """Add complete vocabulary metadata to generated web course cards."""

    def enrich(self) -> None:
        """Replace summary vocabulary with every sentence word and its phonetics."""
        cards: list[dict[str, Any]] = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
        known_vocabulary = {
            item["word"].lower(): item
            for card in cards
            for item in card["grammar"]["vocabulary"]
        }

        for card in cards:
            card["grammar"]["vocabulary"] = [
                self._entry(word, known_vocabulary)
                for word in CourseVocabulary.tokenize(card)
            ]

        CARDS_PATH.write_text(
            f"{json.dumps(cards, ensure_ascii=False, indent=2)}\n",
            encoding="utf-8",
        )
        print(f"Enriched {len(cards)} cards with complete vocabulary phonetics.")

    @staticmethod
    def _entry(
        word: str,
        known_vocabulary: dict[str, dict[str, str]],
    ) -> dict[str, str]:
        part_of_speech, meaning = CourseVocabulary.metadata(word, known_vocabulary)
        american_ipa, british_ipa, kk = CourseVocabulary.phonetics(word)
        return {
            "word": word,
            "partOfSpeech": part_of_speech,
            "meaning": meaning,
            "americanIpa": american_ipa,
            "britishIpa": british_ipa,
            "kk": kk,
        }


if __name__ == "__main__":
    WebVocabularyEnricher().enrich()