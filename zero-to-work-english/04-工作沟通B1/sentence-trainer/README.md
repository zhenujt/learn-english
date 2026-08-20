# Sentence Trainer for Software English

A mobile-first, installable learning app for memorizing 100 practical software workplace sentence pairs. It combines active recall, sentence patterns, tense notes, vocabulary parts of speech, Chinese translations, and two pronunciation modes.

## Learning Flow

1. Read the Chinese prompt and say the English pair aloud before revealing it.
2. Check the sentence pattern, tense, phrase chunks, and vocabulary.
3. Shadow the clear, word-separated recording, then repeat the natural connected recording without looking.
4. Grade the recall as **Forgot**, **Hard**, or **Remembered**. The local scheduler decides when the card returns.
5. Replace the variable phrase in the pattern and create a sentence from your own work.

Study progress is always cached on the device in `localStorage`. When Supabase is configured, email/password accounts and review-progress synchronization are enabled; offline use continues to work and sync resumes after login and a successful network request.

## Cloud Login and Sync

The app supports email/password registration, login, logout, password-reset email, and a password-update screen opened from the reset link. Supabase is optional: without its public browser settings, the app stays in local-only mode.

1. Create a Supabase project and enable **Authentication > Providers > Email**.
2. In Supabase **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). Row Level Security ensures each account can access only its own review rows.
3. In Supabase **Authentication > URL Configuration**, add the deployed URL to **Redirect URLs**:

	`https://zhenujt.github.io/learn-english/`

4. Copy `.env.example` to `.env.local` for local testing and fill in the Supabase project URL and browser `anon` key. Never use or commit a `service_role` key.
5. In the GitHub repository, add these Actions secrets under **Settings > Secrets and variables > Actions**:

	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`

The Pages workflow injects these two public values during the build. After the next push, users can register or log in from the account button. Existing local progress is merged with cloud progress by the most recent card update.

## Commands

```bash
npm install
npm run generate
npm run dev
npm run lint
npm run build
npm run preview
```

`npm run generate` reads the parent course Markdown, creates `src/data/cards.json`, copies both audio sets into `public/audio`, and creates the app icons. The course Markdown remains the source of truth.

## Phone Installation

- **Android:** Open the deployed site in Chrome, open the browser menu, and choose **Install app** or **Add to Home screen**.
- **iPhone:** Open the deployed site in Safari, tap **Share**, then choose **Add to Home Screen**.

The local network development address is suitable for testing on a phone while the computer and phone share a network. Permanent installation and reliable offline service-worker behavior require an HTTPS deployment, except on `localhost`.

## Private Native iOS App

The `ios/` directory contains a Capacitor wrapper for installing the trainer directly on a personal iPhone without publishing it to the App Store. All cards and 200 MP3 files are bundled inside the app, so neither a web server nor HTTPS is required after installation.

Requirements:

- A Mac with the full Xcode application installed.
- An Apple ID added under **Xcode > Settings > Accounts**.
- An iPhone connected to the Mac by cable for the first installation.

Build and install:

1. Run `npm run ios:open` to build the web app, synchronize native resources, and open the Xcode workspace.
2. In Xcode, select the **App** target and open **Signing & Capabilities**.
3. Select your personal development team and keep the bundle identifier unique.
4. Select the connected iPhone as the run destination and press **Run**.
5. If iOS requests it, enable **Developer Mode** and trust the developer profile in device settings.

A free Apple ID usually requires the app to be signed again after seven days. A paid Apple Developer membership provides longer-lived signing. After changing cards, audio, or interface code, run `npm run ios:open` again and install the updated build from Xcode.

## Offline Content

The production service worker precaches the interface, all 100 cards, and 200 MP3 files. The two audio modes are:

- Natural connected speech generated with Jenny at 15% slower than the base rate.
- Clear word-separated speech with short pauses for first-pass shadowing.

## Anki Deck

`句练-软件工作英语.apkg` contains 100 active-recall cards and both offline audio tracks. Each card starts with the Chinese question-and-response prompt. Its answer shows the English pair, natural and clear recordings, patterns, tense, chunks, and vocabulary parts of speech.

Rebuild the deck after changing the source content:

```bash
python3 -m pip install -r requirements-anki.txt
npm run anki:build
```

Import the APKG into Anki on a computer and synchronize it through AnkiWeb, or open the APKG directly with AnkiMobile/AnkiDroid. AnkiMobile on iPhone is a paid App Store application; AnkiWeb synchronization is free. Enable FSRS in Anki's deck options and grade cards according to actual recall instead of familiarity. Cards, scheduling history, and audio then synchronize through the Anki account.
