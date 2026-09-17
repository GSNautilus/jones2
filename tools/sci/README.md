# tools/sci — sounds from the original game

Pulls the 34 sound resources out of a Sierra SCI game directory (the 1991
floppy release of *Jones in the Fast Lane*), turns them into standard MIDI
files, renders those to audio with a General MIDI soundfont, and writes an
audition page for naming them.

The game files are not in the repo and never will be (Sierra's copyright). The
tool reads them from wherever you keep them; the outputs under `art/audio/`
are ours to use privately.

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

## What is where

- `src/resources.ts` — the SCI0-layout map and volumes (6-byte map entries,
  8-byte resource headers).
- `src/lzw1.ts` — the LZW1 decompressor (compression method 2).
- `src/sound.ts` — the SCI1 sound resource: one track per device, 6-byte
  channel entries, 60 Hz deltas with 0xF8 = +240, running status, 0xFC = end.
- `src/midi.ts` — type 1 SMF writer at 60 PPQ / 1 s per quarter (one pulse =
  one SCI tick), and the MT-32 preset → General MIDI program map.
- `src/extract.ts`, `src/render.ts` — the two commands. `src/probe.ts` dumps
  parsed events for a sound number, for debugging.
- `art/audio/midi/*.mid` + `manifest.json`, `art/audio/ogg/*.ogg`,
  `art/audio/index.html` (audition page), `art/audio/names.json` (your names).

## Known limits

- MT-32 arrangement only. Sierra loaded custom timbres into the MT-32 from
  `patch.1`; those are approximated by the preset slot's GM equivalent.
- The AdLib arrangement (what a 1991 PC actually played) needs an OPL emulator
  and the `patch.3` bank; not done. Record it from DOSBox if wanted.
- Loop points and cue controllers in the streams are passed through as plain
  controllers, not interpreted.
