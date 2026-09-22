# Voice lines from the CD-ROM edition

The 1992 CD-ROM release of *Jones in the Fast Lane* has 533 spoken lines. They are extracted,
labelled and wired into the classic client: the clerk speaks the greeting the bubble shows, answers
each action (hired, refused, bought, rent paid…), and the weekend and news cards are read aloud.
This document records how the numbering works, how the labels were made, and what is left.

Labelled 2026-09-18 (transcribe-and-match, see below). Nothing is unresolved; a human has not yet
spot-checked the lines by ear.

## Where things are

- `Jones3x/CD/` — the installed CD-ROM edition (git-ignored, Activision copyright, never commit).
  `audio001.map` + `audio001.002` hold the speech; `resource.map` + `resource.001` the scripts,
  texts and 543 `sync` (lip-sync) resources.
- `tools/sci/src/voices.ts` — the extractor. Map entries are 10 bytes: number u16, **offset u32
  whose low 28 bits are the offset and top nibble a flag (always 2)**, size u32. The volume is
  23 MB, so bit 24 of the offset matters: the first extraction read only 24 bits and sliced lines
  516–665 and the 900s from 16 MB too early (they came out as other clerks' speech cut
  mid-sentence, which is what the old "flag 0x21" note was seeing). Fixed; the entries now tile the
  volume exactly. `src/dump-text.ts` writes the CD's text resources as JSON.
- `assets/sierra/source/voice/` — `ogg/line_NNN.ogg` (533 files, 11 MB), `manifest.json`, `transcripts.json`
  (whisper), `labels.json` (every line: transcript, label, match score), `overrides.json` (the hand
  labels), `cd-texts.json`, `locs.json` (the classic locations table as JSON, input to the
  matcher), `labels.html` (every line with player, transcript and label: the spot-check page),
  `index.html` (the plain audition page). `runs.html` is superseded by `labels.html`.
- `tools/sci/voices/` — `transcribe.py`, `match.py`, `build.py`: the pipeline (commands below).
- `assets/sierra/audio/voices.json` — the result the client loads; `assets/sierra/audio/voice/` the
  OGGs it serves (copied from `assets/sierra/source/voice/ogg`).
- `apps/client/src/audio/voices.ts` — pure: `greetingLine`, `quoteLine`, `quoteGroupsFor`
  (log event → quote groups), `refusalGroupFor` (sim refusal → group), `cardLine` (card text →
  line). `player.ts` has `speak(line | line[])` and `hush()`: one voice at a time, music ducked to
  5 % (about 26 dB down, stingers included) while a clerk talks, stingers wait for the line to end, silent while muted, a `voice` volume
  setting; `leave()` fades a place's own music (Hi-Tech U) out in 0.6 s when its window closes. `ClassicScreen.tsx` speaks the greeting when a window opens, the answer for every new
  log entry and every refusal while a window is open, and the weekend/news cards; closing the
  window hushes.

## The numbering

Consecutive numbers are one text list in order. Runs and what they are:

| lines | what | count |
|---|---|---|
| 10–18, 19–39, 40 | QT Clothing greetings, "Bought an Item", not enough cash | 9 + 21 + 1 |
| 50–57 | Factory greetings | 8 |
| 70–77, 78–85, 86–92 | Pawn Shop greetings, thanks, refusals/offer | 8 + 8 + 7 |
| 100–115, 116–146, 147 | Socket City greetings, bought, not enough cash | 16 + 31 + 1 |
| 160–167, 168–172, 173–177, 178–182 | Rent Office greetings, renting security, renting low-cost, pay rent | 8 + 5 + 5 + 5 |
| 183–198 | Rent Office: not enough cash, extension approved (184, 186) / rejected (185, 187–190), no extension needed, already live here, prepaid rent, "your decision", pay promptly | 16 |
| 210, 370 | "No time is left to relax" (Low-Cost, Security) | 2 |
| 220–222 | Broker: T-bill fee, no shares, not enough cash | 3 |
| 230–289 | the 60 weekend texts (CD text 232, in order) | 60 |
| 300–309, 310–324 | Bank greetings; not enough cash, deposit/withdraw, loan offers/approved/rejected, no time | 10 + 15 |
| 330–340, 341–356, 357 | Z-Mart greetings, bought, not enough cash | 11 + 16 + 1 |
| 380–401, 402–409 | Hi-Tech U greetings; no time, enrol first, no more classes, enrolled, offer, pick a class, declined, not enough cash | 22 + 8 |
| 420–437 | Employment: asking less/same, raise approved/rejected, got the job, closing, greetings (426–432), not hired + three reasons, no openings | 18 |
| 460–522 | the 63 headlines (CD text 215, in order) | 63 |
| 530–544, 545–576, 577, 578 | Black's Market greetings (15: the wiki has 14), bought, not enough cash, no time for the paper | 49 |
| 590–593 | the four goal explanations (Wealth, Happiness, Education, Career) | 4 |
| 600 | "Thank you for playing… play another game?" | 1 |
| 610–629, 630–664, 665 | Monolith greetings, bought, not enough cash | 20 + 35 + 1 |
| 900 + n, 920 + n, 940 + n, 960 + n, 980 + n | per-workplace work messages: not dressed, fired, work habits, no time to work, wages garnished; n = the location index in CD text 700 (1 Rent Office, 3 Black's, 4 Bank, 5 Factory, 7 Hi-Tech U, 8 Socket City, 9 QT, 10 Monolith, 11 Z-Mart) | 45 |

`voices.json` keys the greetings by location id (index = the wiki's greeting index) and the
responses by location id and group name: the wiki's subheadings where it has them ("Bought an
Item", "Pay Rent", "Extension Approved"…) and the CD's own groups otherwise ("Got the Job", "No
Openings", "Not Enough Cash", "No Time to Work", "Fired", "Thanks"…). Cards carry their text so
the client can find the line for whatever the card shows.

## Speech that differs from the text

Seven lines were recorded with a different joke from the on-screen text (position in the run is
unambiguous; the transcript is confident). The bubble shows the wiki text, the voice says:

| line | shown | spoken |
|---|---|---|
| 14 | QT greeting 4: "open 24 hours...we never clothes!" | "…where you're sure to find something that suits you." |
| 26 | QT bought 7: "You can't go wong at QT." | "Dress for success with our expert advice." |
| 383 | Hi-Tech U greeting 3: "never be bored of education" | "A chalk mark on your blackboard of success." |
| 386 | Hi-Tech U greeting 6: "genuine cheepskin" | "Where we prepare you for yesterday, tomorrow." |
| 431 | Employment greeting 5: "your resume zits in our files" | "…where you can always spot a winner." |
| 542, 543 | Black's greetings 12, 13: "the grosser grocer", "Hole Milk" | "Our prunes will eliminate all your problems.", "the store with a little cheesecake." |
| 560 | Black's bought 15: "Next time, give peas a chance!" | "Remember, we're always at your disposal." |

Black's Market has a 15th greeting with no wiki text, line 544 ("Mr. Schwader to six for check
approval"), kept under `quotes.blacks_market["Extra Greeting"]` and never played. The weekend
"baking oatmeal cookies" text differs by one word between the wiki and the CD; `cardLine`
tolerates that. Decide later whether the bubble texts should follow the recordings.

## How the labels were made (reproducible)

1. Extract: `npx tsx tools/sci/src/voices.ts "…\Jones3x\CD" art\audio\voice` (wav + ogg + manifest).
2. Transcribe with faster-whisper `large-v3` on the GPU (`codex` env; `pip install faster-whisper
   rapidfuzz`): `python tools\sci\voices\transcribe.py art\audio\voice\transcripts.json`. About
   9 minutes for all 533; pass a comma-separated list of numbers as the third argument to redo a
   few. Transcripts are near-perfect: the 8-bit audio is clean and the actor enunciates.
3. Match: `python tools\sci\voices\match.py art\audio\voice`. Candidates are every greeting and
   quote in `classic/locations.ts` (dumped to `locs.json`) plus the CD text resources 232, 215,
   700, 108 (`cd-texts.json`). Score = 0.6 × token-set ratio + 0.4 × plain ratio; ≥ 78 is
   confident. Within each run, confident matches vote for (list, offset) and the rest of the list
   is assigned by position. 456 of 533 matched outright; the position rule and the transcripts
   settled the rest.
4. Hand labels for the lines the wiki has no text for (pawn, bank, university, employment, rent
   office refusals, goals, work messages) are in `overrides.json`, written from the transcripts.
5. Build: `python tools\sci\voices\build.py art\audio\voice .` writes `voices.json` and
   `labels.html`.

`apps/client/test/audio/voices-file.test.ts` checks the file: every line used exactly once,
nothing unresolved, greeting counts equal the wiki's, greeting runs contiguous, every wiki quote
group fully voiced.

## Still to do

- A human listens to two lines per location on `labels.html` (the labels are by transcript and
  position, not by ear).
- Play a week with sound on: check the ducking level, that the answer lines fit the outcome texts,
  and whether the reasons after "Sorry, you didn't get the job…" (433 then 434–436) sound right in
  sequence.
- Not wired: goal explanations (590–593) on the GOALS screen, "play another game?" (600), the
  work-habits warning and garnish lines (the sim has no such events yet), the bank's loan-offer
  lines (the sim has no confirm step), the Pawn Shop's item-specific refusals.
- Lip sync from the `sync` resources; the portraits need a mouth-open frame.

## Legal note

Speech is Sierra/Activision copyright, extracted from the family's own copy for private play.
Do not publish the OGG files outside this repo's private use; never commit `Jones3x/`.
