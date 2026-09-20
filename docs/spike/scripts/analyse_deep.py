import json, re, statistics
from collections import Counter
D = json.load(open("works_deep.json"))
N = len(D)
def pct(n,tot=None): tot=tot or N; return f"{n:>4}/{tot} = {100*n/tot:5.1f}%"

def desc_text(w):
    d = w.get("description")
    if isinstance(d, dict): d = d.get("value")
    if not isinstance(d, str): return None
    d = d.strip()
    return d or None

print(f"DEEP SAMPLE: {N} works (100 popular / 40 recent / 40 new-2023+)\n")
print("=== DESCRIPTIONS (only on /works/*.json — NOT in search results) ===")
descs = [(x, desc_text(x["work"])) for x in D]
have = [(x,t) for x,t in descs if t]
print(f"  any description      : {pct(len(have))}")
lens = sorted(len(t) for _,t in have)
if lens:
    print(f"  median length        : {statistics.median(lens):.0f} chars")
    print(f"  <120 chars (stub)    : {pct(sum(1 for l in lens if l<120), len(lens))} of those that have one")
    print(f"  >=300 chars (usable) : {pct(sum(1 for l in lens if l>=300), len(lens))} of those that have one")
usable = [(x,t) for x,t in have if len(t)>=300]
print(f"  USABLE (>=300 chars) across whole sample : {pct(len(usable))}")
# contamination check
noise = sum(1 for _,t in have if re.search(r'(--|—)\s*(back cover|publisher|amazon)|\[?(source|from the)\b.*publisher', t, re.I))
print(f"  contains source/attribution boilerplate  : {pct(noise, len(have))} of those that have one")

by_b = {}
for x,t in descs: by_b.setdefault(x["search"]["_bucket"].split(":")[0], []).append(t)
print("  by bucket:")
for b, ts in sorted(by_b.items()):
    n=len(ts); a=sum(1 for t in ts if t); u=sum(1 for t in ts if t and len(t)>=300)
    print(f"     {b:<9} n={n:<4} any={100*a/n:5.1f}%   usable={100*u/n:5.1f}%")

print("\n=== SUBJECTS: RAW VOLUME ===")
subs = [x["work"].get("subjects") or [] for x in D]
cnt = [len(s) for s in subs]
print(f"  works with >=1 subject : {pct(sum(1 for s in subs if s))}")
print(f"  median subjects/work   : {statistics.median(cnt):.0f}   p90={sorted(cnt)[9*len(cnt)//10]}  max={max(cnt)}")

allsub = Counter(s.strip().lower() for sl in subs for s in sl)
print(f"  distinct subject strings in {N} works : {len(allsub)}")
print("\n=== SUBJECT NOISE ANALYSIS (the real question) ===")
NOISE_PAT = re.compile(r'\b(accessible book|protected daisy|in library|overdrive|internet archive|'
  r'large type|reading level|lending library|open library|nyt:|new york times|bestseller|'
  r'popular print disabled|kindle|audiobook|ebook|textbook)\b', re.I)
STRUCT_PAT = re.compile(r'^(fiction|nonfiction|non-fiction)\s*[,/-]\s*', re.I)
noise_terms = {s:n for s,n in allsub.items() if NOISE_PAT.search(s)}
print(f"  clearly-noise subject strings : {len(noise_terms)} distinct, {sum(noise_terms.values())} occurrences")
print(f"  top noise: {', '.join(f'{s}({n})' for s,n in sorted(noise_terms.items(), key=lambda x:-x[1])[:6])}")
struct = {s:n for s,n in allsub.items() if STRUCT_PAT.match(s)}
print(f"  BISAC-style 'Fiction, xxx' : {len(struct)} distinct, {sum(struct.values())} occurrences")
print(f"  top: {', '.join(f'{s}({n})' for s,n in sorted(struct.items(), key=lambda x:-x[1])[:5])}")
print(f"\n  top 25 subjects overall:")
for s,n in allsub.most_common(25): print(f"     {n:>4}  {s[:62]}")

print("\n=== CAN WE MAP SUBJECTS -> A CLEAN GENRE TAXONOMY? ===")
GENRE_MAP = {
 "fantasy":["fantasy","magic","wizard","dragons"],
 "science fiction":["science fiction","space","dystopia","time travel"],
 "mystery":["mystery","detective","crime","murder"],
 "thriller":["thriller","suspense","espionage"],
 "romance":["romance","love stories","romantic"],
 "horror":["horror","ghost","supernatural","vampire"],
 "historical fiction":["historical fiction","historical"],
 "biography":["biography","autobiography","memoir","personal narrative"],
 "history":["history","historic","civilization","war"],
 "science":["science","physics","biology","evolution","astronomy","mathematics"],
 "psychology":["psychology","psychological","mental health","cognition"],
 "business":["business","economics","management","entrepreneurship","finance"],
 "self help":["self-help","self help","conduct of life","success","personal growth","habit"],
 "poetry":["poetry","poems"],
 "young adult":["young adult","juvenile fiction","teen"],
 "children":["children","juvenile","picture book"],
 "philosophy":["philosophy","ethics","philosophical"],
 "technology":["computers","programming","software","technology","artificial intelligence","engineering"],
 "travel":["travel","description and travel","voyages"],
 "cooking":["cooking","cookery","recipes","food"],
 "classics":["classic","classics","english literature","american literature"],
 "fiction":["fiction","novel","literary"],
}
def map_genres(sl):
    got=set()
    low=[s.lower() for s in sl]
    for g,keys in GENRE_MAP.items():
        for s in low:
            if any(k in s for k in keys): got.add(g); break
    return got
mapped=[map_genres(s) for s in subs]
print(f"  works mapped to >=1 genre : {pct(sum(1 for m in mapped if m))}")
print(f"  works mapped to >=1 NON-generic genre (excl. bare 'fiction') :",
      pct(sum(1 for m in mapped if m-{'fiction'})))
mc=[len(m) for m in mapped]
print(f"  median genres/work: {statistics.median(mc):.0f}  max={max(mc)}")
gcount=Counter(g for m in mapped for g in m)
print("  genre distribution across sample:")
for g,n in gcount.most_common(): print(f"     {g:<20}{n:>4} ({100*n/N:4.1f}%)")
