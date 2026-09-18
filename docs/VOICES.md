# Voice lines from the CD-ROM edition — handoff

Brief for a new session or agent. Goal: label the 533 spoken lines extracted from the 1992
CD-ROM release of *Jones in the Fast Lane* and wire them into the classic client so the clerk
speaks the greeting shown in the bubble, plus the responses (hired, refused, bought, and so on).

Written 2026-09-18. State of play, what is known about the data, and three ways to label the
lines without listening to all 533 by hand.

## Where things are

- `Jones3x/CD/` — the installed CD-ROM edition (git-ignored, Activision copyright, never commit).
  `audio001.map` + `audio001.002` hold the speech; `cdaudio.map` is the same list in Redbook
  frames; `resource.map` + `resource.001` hold scripts, texts, views, and 543 `sync` resources
  (type 14) — lip-sync timing, one per spoken line.
- `tools/sci/` — the extractor workspace (`@jones2/sci`). `src/voices.ts` reads the audio map
  (10-byte entries: number u16, offset u24 + flag byte, size u32; terminator 0xFFFF) and slices
  raw 8-bit unsigned mono PCM out of the volume. `src/resources.ts` reads the map/volumes (both
  offset widths), `src/lzw1.ts` decompresses (the CD is all stored, method 0). `README.md` there
  has the commands. `src/probe-cd.ts` lists text resources and audio runs; `src/probe-snd.ts`
  the CD's music files.
- `art/audio/voice/` — the output: `ogg/line_NNN.ogg` (533 files, 11 MB, committed),
  `wav/` (git-ignored), `manifest.json` (number, file, seconds, flag), `index.html` (all lines)
  and `runs.html` (lines grouped by consecutive-number run, with a location picker per run).
- `apps/client/src/audio/` — the client's audio: `map.ts` (moments → sound numbers from
  `public/audio/names.json`), `events.ts` (player-log event → moment), `player.ts` (SFX, music
  rotation, stingers; one music element at a time). Speech is NOT wired yet.
- `packages/sim/src/content/classic/locations.ts` — the wiki's clerk quotes per location
  (`greetings: string[]`, `quotes: Record<string, string[]>`), extracted verbatim from
  `docs/original-rules.md`. These are the texts the lines should be matched to.

Re-extract if needed (PowerShell, repo root):

```powershell
npx tsx tools/sci/src/voices.ts "C:\Users\Nautilus\Projects\Jones 2\Jones3x\CD" art\audio\voice
```

## What is known about the 533 lines

- Numbers 10–991 with gaps. **Consecutive runs are one clerk or one kind of message**:
  `10-40 (31), 50-57 (8), 70-92 (23), 100-147 (48), 160-198 (39), 210, 220-222, 230-289 (60),
  300-324 (25), 330-357 (28), 370, 380-409 (30), 420-437 (18), 460-522 (63), 530-578 (49),
  590-593, 600, 610-665 (56)`, then five groups in the 900s with the same shape
  (`901, 903-905, 907-911` / `921…` / `941…` / `961…` / `981…`), likely per-player or
  per-apartment variants.
- Lines 516–665 and the 900s carry map flag `0x21` instead of `0x20`; the rest `0x20`. Unknown
  meaning (maybe a later recording batch); worth checking whether those sound different.
- **Sample rate is not stored.** 11025 Hz is assumed. Verify by ear on `index.html`: too deep
  and slow means the true rate is higher (22050), too high and fast means lower. Re-run
  `voices.ts` with the rate as the third argument if wrong.
- **Text exists on the CD only for some clerks.** Text resources (type 3) hold: 209 QT Clothing
  (31 strings), 210 Monolith (56), 205 Factory (8), 215 news headlines (65), 232 weekend events
  (62), 700 items/food (87), 231 (22, job titles?), plus UI strings. Run lengths match those
  counts exactly or nearly: **QT ↔ 10-40, Factory ↔ 50-57, Monolith ↔ 610-665, weekend ↔ 230-289,
  news ↔ 460-522, text 700 ↔ 100-147 + 160-198, text 231 ↔ 70-92.** Order within a run follows
  the text's order (non-spoken entries like "DUMMY"/"Filler"/format strings are skipped, which
  explains the small count differences).
- The greetings of Employment, Z-Mart, Socket City, Black's Market, Hi-Tech U, Bank, Pawn Shop
  and Rent Office appear in NO text or script string on the CD: they are speech-only. Their
  runs are among `300-324, 330-357, 380-409, 420-437, 530-578` and the singletons. The wiki
  (and therefore `classic/locations.ts`) has their texts, in what is very probably the game's
  own order: Employment 7 greetings, Z-Mart 11, Socket City 16, Black's 14, Hi-Tech U 22, Bank
  4+, etc. Each run = greetings first, then that clerk's responses (the wiki's other quote
  sections per location, e.g. "Pay Rent", "Extension Approved").

## Three ways to label without listening to everything

### 1. Transcribe with a speech recogniser, then match to the wiki texts (recommended)

The machine has an RTX 3060 (12 GB) and the `codex` conda env has `torch`, `librosa` and
`soundfile`; it lacks `whisper`/`faster-whisper`/`rapidfuzz` (install them: `pip install
faster-whisper rapidfuzz` in the env; `faster-whisper` downloads a model on first use).

Plan:
1. Load each `art/audio/voice/wav/line_NNN.wav`, resample 11025 → 16000 with `librosa`, run
   `faster-whisper` (`large-v3` or `medium.en`, GPU) with `language='en'`, keep the text and the
   average log-probability. Expect imperfect transcripts: the audio is 8-bit and the lines are
   short jokes with made-up names (ACNE Employment, Monolith Burger, Howie Fitzhugh).
2. Build the candidate text list: every greeting and quote in `classic/locations.ts` (tag each
   with location + quote group + index), plus the CD text resources' strings (dump them with
   `probe-cd.ts`, or extend it) for weekend/news/items.
3. Match each transcript to the best candidate with `rapidfuzz` (token-set ratio on lowercased,
   punctuation-stripped text). Accept ≥ 80; flag the rest.
4. **Exploit the run structure to fix the misses**: within a run, lines are in text order, so
   once a few confident matches anchor a run to a location's greeting list, the rest follow by
   position (line = run start + index). Report every run as "location, offset of greeting 0,
   count", and only the unresolved lines for a human.
5. Write the result to `apps/client/public/audio/voices.json`:
   ```json
   {
     "rate": 11025,
     "greetings": { "employment": [301, 302, 303, 304, 305, 306, 307], "zmart": [...] },
     "quotes": { "rent_office": { "Pay Rent": [345, 346], "Extension Approved": [347] } },
     "unresolved": [370, 600]
   }
   ```
   Keep line numbers, not filenames; `line_NNN.ogg` is derived.

Verification that does not need ears: every location in `CLASSIC_LOCATIONS` with N greetings
gets exactly N distinct line numbers; assigned numbers form contiguous runs; no line is used
twice; the total assigned plus unresolved equals 533. Then a human spot-checks two lines per
location on `runs.html`.

### 2. Structural inference alone (no recogniser)

Match run lengths to quote counts: the text-resource runs are already pinned (list above). For
the speech-only clerks, the wiki gives greeting counts; a run of length ≥ count whose first
`count` lines are the greetings is the hypothesis; distinguish clerks with equal counts by
listening to one line per run (`runs.html` dropdown). This is what `runs.html` is for and it
needs about 15 listens, not 533. Weaker than method 1 for the response quotes, whose order in
the run is a guess.

### 3. Script decompilation (most exact, most work)

The scripts (type 2, uncompressed) call the interpreter's audio kernel with the line numbers,
next to the text they show (for clerks with text) or the greeting index. Disassembling SCI1
scripts (SCI Companion on Windows does it) gives the exact number ↔ meaning table, including
which of the 900-series variants plays when. Worth it only if method 1 leaves many unresolved.

## Wiring into the client (after labelling)

- `player.ts`: add `speak(line: number)`: one voice element at a time (a new line cuts the old),
  volume from a new `voice` setting, music ducked to ~40% while speech plays and restored after
  (`timeupdate`/`ended`), never while muted. Stingers should not cut speech; queue them.
- `ClassicScreen.tsx`: when the window bubble shows greeting `i` of location `loc`
  (`menu.ts` → `greetingFor(loc, visit)` rotates by visit count), call
  `audio.speak(voices.greetings[loc][i])`. For outcome text (`say` in `buildLocationWindow`),
  map the sim's outcome to a quote group (`hired` → "Got the Job", `refused` → "No Openings",
  rent paid → "Pay Rent", …) and pick the line by the same rotation. Load `voices.json` once
  in `audio.load()`.
- Lip sync later: the `sync` resources give mouth timing per line; the portraits would need a
  mouth-open frame. Park it.
- Tests: pure `voiceLineFor(loc, greetingIndex)` and the ducking state machine with the
  fake-audio harness in `apps/client/test/audio/player.test.ts`.

## Legal note

Speech is Sierra/Activision copyright, extracted from the family's own copy for private play.
Do not publish the OGG files outside this repo's private use; never commit `Jones3x/`.
