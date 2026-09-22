# assets

`assets/sierra/` holds material from the original *Jones in the Fast Lane* (Sierra, 1990/1991 CD).
It is **gitignored and must never be committed**: the repository and the GitHub Pages site are
public (DESIGN decision log, 2026-09-22). Players get these files from a private Supabase Storage
bucket that only seated players can read.

- `sierra/audio/` — exactly what the client plays and the bucket holds: `ogg/sound_NNN.ogg`
  (effects and music), `voice/line_NNN.ogg` (the 533 CD voice lines), `names.json`,
  `voices.json`, `manifest.json`. The Vite dev server serves it at `/audio/`.
- `sierra/source/` — the extractor's working files: MIDI, renders, WAVs, transcripts, labels,
  audition pages. See `tools/sci/README.md`.
- `sierra/reference/` — screenshots of the original and the fan wiki's board map.
- `sierra/cd/` — the CD-ROM release zip itself (ignored even by this folder's own repository).

The folder is its own local git repository, so the hand labelling keeps its history. Do not add
a GitHub remote to it unless the repository there is private.

To rebuild it from your own copy of the game, run the `tools/sci` extractor (see its README).
