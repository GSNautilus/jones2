"""labels.json + overrides.json -> assets/sierra/audio/voices.json and
assets/sierra/source/voice/labels.html (every line with its transcript and label, for a spot-check).

  python tools/sci/voices/build.py assets/sierra/source/voice .
"""
import json, sys, html
S, root = sys.argv[1], sys.argv[2]
L = {int(k): v for k, v in json.load(open(f"{S}/labels.json")).items()}
over = json.load(open(f"{S}/overrides.json"))
for k, v in over.items():
    L[int(k)].update(v)
    L[int(k)]["by"] = "manual"
CONF = 78
greetings, quotes, unresolved, cards = {}, {}, [], {}
for n, l in sorted(L.items()):
    ok = l["score"] >= CONF or l.get("by") in ("manual", "run")
    if not ok or l["loc"].startswith("cd") and l["group"] in ("item", "work"):
        if not ok: unresolved.append(n)
        continue
    if l["loc"].startswith("cd"):
        cards.setdefault(l["group"], []).append({"line": n, "text": l["text"]})
        continue
    if l["group"] == "greeting":
        greetings.setdefault(l["loc"], {})[l["index"]] = n
    else:
        quotes.setdefault(l["loc"], {}).setdefault(l["group"], {})[l["index"]] = n
def dense(d):
    return [d[i] for i in sorted(d)]
out = {
    "rate": 11025,
    "greetings": {loc: dense(d) for loc, d in greetings.items()},
    "quotes": {loc: {g: dense(d) for g, d in gs.items()} for loc, gs in quotes.items()},
    "cards": cards,
    "unresolved": unresolved,
}
json.dump(out, open(f"{root}/assets/sierra/audio/voices.json", "w"), indent=1)
# a page: number, listen, transcript, label
rows = []
for n, l in sorted(L.items()):
    ok = l["score"] >= CONF or l.get("by") in ("manual", "run")
    lab = f"{l['loc']} / {l['group']} [{l['index']}]" if ok else "?"
    rows.append(f"<tr class='{'ok' if ok else 'no'}'><td>{n}</td><td><audio controls preload='none' src='ogg/line_{n:03d}.ogg'></audio></td>"
                f"<td>{html.escape(l['transcript'])}</td><td>{html.escape(lab)}</td><td>{html.escape(l['text'] if ok else '')}</td><td>{l['score']}</td></tr>")
page = f"""<!doctype html><meta charset="utf-8"><title>Jones voices — labels</title>
<style>body{{font:14px/1.4 system-ui,sans-serif;margin:24px;background:#1d1a24;color:#eee}}table{{border-collapse:collapse}}td,th{{padding:3px 8px;border-bottom:1px solid #444;vertical-align:top}}audio{{width:200px}}tr.no{{background:#3a2020}}</style>
<h1>533 spoken lines — whisper transcript and label</h1><p>Red rows are unresolved. Label = location / quote group [index into the wiki list]. The last column is the wiki/CD text the line was matched to.</p>
<table><tr><th>#</th><th>listen</th><th>whisper heard</th><th>label</th><th>matched text</th><th>score</th></tr>{''.join(rows)}</table>"""
open(f"{root}/assets/sierra/source/voice/labels.html", "w", encoding="utf-8").write(page)
print("greetings", {k: len(v) for k, v in out["greetings"].items()})
print("quotes", {k: {g: len(v) for g, v in gs.items()} for k, gs in out["quotes"].items()})
print("cards", {k: len(v) for k, v in cards.items()}); print("unresolved", len(unresolved), unresolved)
