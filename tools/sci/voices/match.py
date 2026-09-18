"""Match whisper transcripts of the 533 lines to the wiki/CD texts, then use the
run structure (consecutive numbers = one text list in order) to fill in the rest.

  python tools/sci/voices/match.py art/audio/voice

Reads transcripts.json, locs.json (CLASSIC_LOCATIONS dumped as JSON, see README) and
cd-texts.json (tools/sci/src/dump-text.ts) from that folder; writes labels.json and
runs-report.json there. Hand labels go in overrides.json, applied by build.py."""
import json, re, sys
from collections import Counter
from rapidfuzz import fuzz
S = sys.argv[1]
tr = {int(k): v for k, v in json.load(open(f"{S}/transcripts.json")).items()}
locs = json.load(open(f"{S}/locs.json"))
cdt = json.load(open(f"{S}/cd-texts.json"))

def norm(s):
    s = s.lower().replace("’", "'")
    s = re.sub(r"\(r\)|\(tm\)", "", s)
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

# candidates: (key, loc, group, index, text)
cands = []
for lid, L in locs.items():
    for i, g in enumerate(L["greetings"]):
        cands.append((lid, "greeting", i, g))
    for grp, qs in (L.get("quotes") or {}).items():
        for i, q in enumerate(qs):
            cands.append((lid, grp, i, q))
SKIP = {"Filler", "DUMMY", "Food"}
for tid, grp in [("232", "weekend"), ("215", "news"), ("700", "item"), ("108", "work")]:
    for i, t in enumerate(cdt[tid]):
        if t in SKIP or "%" in t: continue
        cands.append(("cd" + tid, grp, i, t.replace("\n", " ")))
cn = [norm(c[3]) for c in cands]

labels = {}
for n, t in sorted(tr.items()):
    q = norm(t["text"])
    best, bi = -1, None
    for i, c in enumerate(cn):
        # token_set_ratio ignores extra words; ratio penalises length mismatch. blend.
        s = 0.6 * fuzz.token_set_ratio(q, c) + 0.4 * fuzz.ratio(q, c)
        if s > best: best, bi = s, i
    lid, grp, idx, text = cands[bi]
    labels[n] = {"n": n, "transcript": t["text"], "logprob": t["logprob"], "score": round(best, 1),
                 "loc": lid, "group": grp, "index": idx, "text": text}

# runs of consecutive numbers
nums = sorted(tr)
runs, start, prev = [], nums[0], nums[0]
for n in nums[1:]:
    if n != prev + 1:
        runs.append((start, prev)); start = n
    prev = n
runs.append((start, prev))

# structural inference: within a run, confident matches vote for (loc, group, offset)
CONF = 78
report = []
for a, b in runs:
    votes = Counter()
    for n in range(a, b + 1):
        l = labels[n]
        if l["score"] >= CONF:
            votes[(l["loc"], l["group"], n - l["index"])] += 1
    report.append({"run": f"{a}-{b}", "len": b - a + 1, "votes": [(k, v) for k, v in votes.most_common(6)]})
    # assign by position for every (loc, group, offset) with >= 2 votes, in vote order,
    # only to lines not already confidently matched to something else
    for (lid, grp, off), v in votes.most_common():
        if v < 2: continue
        src = locs[lid]["greetings"] if grp == "greeting" else (locs[lid].get("quotes") or {}).get(grp) if lid in locs else None
        if src is None:
            tid = lid[2:]
            src = [None if (t in SKIP or "%" in t) else t for t in cdt[tid]]
        for i, text in enumerate(src):
            n = off + i
            if text is None or n < a or n > b: continue
            l = labels[n]
            if l["score"] >= CONF and (l["loc"], l["group"], l["index"]) != (lid, grp, i):
                continue  # a confident different match wins
            if l["score"] < CONF or (l["loc"], l["group"], l["index"]) == (lid, grp, i):
                fit = 0.6 * fuzz.token_set_ratio(norm(l["transcript"]), norm(text)) + 0.4 * fuzz.ratio(norm(l["transcript"]), norm(text))
                l.update({"loc": lid, "group": grp, "index": i, "text": text, "score": round(max(l["score"] if (l["loc"], l["group"], l["index"]) == (lid, grp, i) else 0, fit), 1), "by": "run"})
json.dump(labels, open(f"{S}/labels.json", "w"), indent=1)
json.dump(report, open(f"{S}/runs-report.json", "w"), indent=1)
for r in report:
    print(r["run"], r["len"], r["votes"][:4])
low = [l for l in labels.values() if l["score"] < CONF]
print("confident", len(labels) - len(low), "low", len(low))
