"""Transcribe the extracted voice lines with faster-whisper (GPU).

  python tools/sci/voices/transcribe.py assets/sierra/source/voice/transcripts.json [model] [only: 516,517,...]

Reads assets/sierra/source/voice/wav/line_NNN.wav (run tools/sci/src/voices.ts first), resamples
11025 -> 16000, and writes {number: {text, logprob, no_speech, seconds, sr}}. With a
list of numbers it re-does only those and merges into the existing file. Needs the
`codex` conda env plus `pip install faster-whisper rapidfuzz`.
"""
import json, sys, glob, os, time
import numpy as np, soundfile as sf, librosa
from faster_whisper import WhisperModel
root = "assets/sierra/source/voice/wav"
out = sys.argv[1]
model_name = sys.argv[2] if len(sys.argv) > 2 else "large-v3"
model = WhisperModel(model_name, device="cuda", compute_type="float16")
prompt = ("Jones in the Fast Lane. Welcome to ACNE Employment. Welcome to Monolith Burger. Welcome to Z-Mart. "
          "Welcome to QT Clothing. Welcome to Socket City. Welcome to Black's Market. Welcome to Hi-Tech U. "
          "Welcome to the Pacific International Grand Gratuity Yield P.I.G.G.Y. Bank. Welcome to the Pawn Shop. "
          "Welcome to the Rent Office. Welcome to the Factory. Howie Fitzhugh, Monny the Burger Clown, Wild Willy.")
res = {}
t0 = time.time()
files = sorted(glob.glob(os.path.join(root, "line_*.wav")))
only = set(int(x) for x in sys.argv[3].split(",")) if len(sys.argv) > 3 else None
if only is not None:
    files = [f for f in files if int(os.path.basename(f)[5:8]) in only]
    if os.path.exists(out): res = {int(k): v for k, v in json.load(open(out)).items()}
for i, f in enumerate(files):
    n = int(os.path.basename(f)[5:8])
    y, sr = sf.read(f, dtype="float32")
    if y.ndim > 1: y = y.mean(axis=1)
    y16 = librosa.resample(y, orig_sr=sr, target_sr=16000)
    segs, info = model.transcribe(y16, language="en", beam_size=5, best_of=5, initial_prompt=prompt,
                                  condition_on_previous_text=False, vad_filter=False, temperature=0.0)
    segs = list(segs)
    text = " ".join(s.text.strip() for s in segs)
    lp = float(np.mean([s.avg_logprob for s in segs])) if segs else -9.0
    ns = float(np.mean([s.no_speech_prob for s in segs])) if segs else 1.0
    res[n] = {"text": text, "logprob": round(lp, 3), "no_speech": round(ns, 3), "seconds": round(len(y) / sr, 2), "sr": sr}
    if i % 25 == 0: print(i, n, round(time.time() - t0), text[:80], flush=True)
json.dump(res, open(out, "w"), indent=1)
print("done", len(res), round(time.time() - t0), "s")
