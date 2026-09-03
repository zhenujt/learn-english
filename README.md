# Practical English Grammar for Adult Beginners

This is the English-review companion to [the Chinese main textbook](README.zh.md). Study the numbered Chinese lessons first, then use the matching English file to explain the same rule without translation. The course moves from simple sentences to workplace communication and formal writing.

- `01-foundations`: sentence building and everyday communication
- `02-intermediate`: clauses, voice, and connected information
- `03-advanced`: hypothesis, emphasis, concise formal writing

Every lesson contains a definition, a core formula, common mistakes, progressive examples, and a self-check with answers.# learn-english

## Document audio

The docs site shows an audio panel below every Markdown title. Generated recordings read each available Chinese prompt once, followed by the matching English example three times with the slow `en-US-MichelleNeural` voice.

Generate one document after installing `edge-tts` and FFmpeg:

```sh
npm --prefix docs-site run audio:document -- "path/to/lesson.zh.md"
```

Generate every eligible document incrementally:

```sh
npm --prefix docs-site run audio:all
```

Speech segments are cached in `docs-site/.audio-cache`, and finished MP3 files are written to `docs-site/public/audio/documents`.
