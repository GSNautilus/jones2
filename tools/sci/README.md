# tools/sci — sounds from the original game

Pulls the 34 sound resources out of a Sierra SCI game directory (the 1991
floppy release of *Jones in the Fast Lane*), turns them into standard MIDI
files, renders those to audio with a General MIDI soundfont, and writes an
audition page for naming them.

The game files are not in the repo and never will be (Sierra's copyright). The
tool reads them from wherever you keep them. Everything it writes lands under `assets/sierra/`,
which is gitignored: the repo is public, and these outputs are Sierra's material too. They reach
players only through the private Supabase bucket (see `assets/README.md`).

## Run (PowerShell, from the repo root)

```powershell
npx tsx tools/sci/src/extract.ts "<folder holding RESOURCE.MAP>" art\audio\midi
npx tsx tools/sci/src/render.ts art\audio\midi art\audio
Start-Process art\audio\index.html
```

`extract.ts` takes an optional third argument for the device track: `mt32`
(default), `adlib`, `pcspeaker`, `tandy`, `cms`. `render.ts` takes an optional
third argument for the soundfont; the default is
`tools/sci/soundfont/MuseScore_General.sf3` (git-ignored; download it from
https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/). Rendering
needs `ffmpeg` on the PATH for the OGG encode.

## The CD edition (Jones3x/CD, git-ignored)

The 1992 CD-ROM release adds what the floppy lacks:

- **Speech.** `audio001.map` (10-byte entries: number u16, offset u32 whose low 28 bits are the
  offset and top nibble a flag, size u32) into `audio001.002`, raw 8-bit unsigned mono PCM at
  11025 Hz (not stored; confirmed by transcription); `cdaudio.map` is the same list in Redbook
  frames. 533 lines, 34 minutes. `voices.ts` writes them out:

  ```powershell
  npx tsx tools/sci/src/voices.ts "C:\Users\Nautilus\Projects\Jones 2\Jones3x\CD" art\audio\voice
  Start-Process art\audio\voice\labels.html
  ```

  The lines are labelled (which clerk, which greeting or response) in
  `assets/sierra/audio/voices.json`; `voices/` holds the transcribe-and-match pipeline that
  produced it and `docs/VOICES.md` explains the numbering. `labels.html` lists every line with its
  transcript and label for a spot-check by ear. The `sync` resources (type 14, one per line) are
  lip-sync data for the portraits, not used yet.
- **General MIDI music.** The CD ships the sounds as `NNNN.snd` patch files (1000 + number) with a
  GM track, so `extract.ts` run on the CD directory with `gm` layers better arrangements over the
  floppy set (sound 100 exists only on the floppy).

## What is where

- `src/resources.ts` — the SCI0-layout map and volumes (6-byte map entries,
  8-byte resource headers).
- `src/lzw1.ts` — the LZW1 decompressor (compression method 2).
- `src/sound.ts` — the SCI1 sound resource: one track per device, 6-byte
  channel entries, 60 Hz deltas with 0xF8 = +240, running status, 0xFC = end.
- `src/midi.ts` — type 1 SMF writer at 60 PPQ / 1 s per quarter (one pulse =
  one SCI tick), and the MT-32 preset → General MIDI program map.
- `src/extract.ts`, `src/render.ts`, `src/voices.ts` — the commands. `src/probe*.ts` dump
  parsed events, the CD's text resources and the .snd files, for debugging; `src/dump-text.ts`
  writes the CD's text resources as JSON.
- `voices/transcribe.py`, `match.py`, `build.py` — the speech labelling pipeline (Python, `codex`
  env with `faster-whisper` and `rapidfuzz`): whisper transcripts → fuzzy match to the wiki and CD
  texts → run-structure inference → `overrides.json` hand labels → `voices.json` + `labels.html`.
- `assets/sierra/source/midi/*.mid` + `manifest.json`, `assets/sierra/source/ogg/*.ogg`,
  `assets/sierra/source/index.html` (audition page), `assets/sierra/source/names.json` (your names).

## Known limits

- MT-32 arrangement only. Sierra loaded custom timbres into the MT-32 from
  `patch.1`; those are approximated by the preset slot's GM equivalent.
- The AdLib arrangement (what a 1991 PC actually played) needs an OPL emulator
  and the `patch.3` bank; not done. Record it from DOSBox if wanted.
- Loop points and cue controllers in the streams are passed through as plain
  controllers, not interpreted.
