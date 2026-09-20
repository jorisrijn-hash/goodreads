import json, random, re
from collections import Counter
D=json.load(open("works_deep.json"))
# Precision-first mapping: exact/near-exact subject strings only, not greedy substrings.
RULES = {
 "fantasy":[r"^fantasy( fiction)?$", r"^fiction, fantasy"],
 "science fiction":[r"^science fiction$", r"^fiction, science fiction", r"^science fiction,"],
 "mystery":[r"^mystery", r"detective and mystery stories", r"^fiction, mystery"],
 "thriller":[r"^thriller", r"^suspense", r"^fiction, thriller"],
 "romance":[r"^romance", r"^love stories$", r"^fiction, romance"],
 "horror":[r"^horror", r"^fiction, horror"],
 "historical fiction":[r"^historical fiction$", r"^fiction, historical"],
 "biography":[r"^biography$", r"^autobiography$", r"^memoir", r"biography$"],
 "history":[r"^history$", r"^world war", r"^united states -- history"],
 "science":[r"^science$", r"^physics$", r"^biology$", r"^astronomy$", r"^evolution"],
 "psychology":[r"^psychology$", r"^psychological", r"^mental health"],
 "business":[r"^business", r"^economics$", r"^management$", r"^success in business"],
 "self help":[r"^self-help", r"^conduct of life$", r"^self-actualization"],
 "poetry":[r"^poetry$", r"^american poetry$", r"^english poetry$", r"^poems"],
 "young adult":[r"^young adult", r"^juvenile fiction$"],
 "children":[r"^children's", r"^juvenile literature$", r"^picture books"],
 "philosophy":[r"^philosophy$", r"^ethics$"],
 "technology":[r"^computers?$", r"^computer programming$", r"^programming", r"^artificial intelligence$", r"^software"],
 "travel":[r"^travel$", r"description and travel$"],
 "cooking":[r"^cooking", r"^cookery", r"^recipes"],
 "classics":[r"^classical literature$", r"^english literature$", r"^american literature$"],
}
NOISE=re.compile(r"\b(accessible book|protected daisy|in library|overdrive|internet archive|large type|reading level|lending library|open library staff|nyt:|new york times|bestseller|long now manual)\b",re.I)
def clean(sl): return [s for s in sl if not NOISE.search(s)]
def mapg(sl):
    got=set()
    for s in [x.strip().lower() for x in sl]:
        for g,pats in RULES.items():
            if any(re.search(p,s) for p in pats): got.add(g)
    return got
N=len(D)
res=[]
for x in D:
    subs=x["work"].get("subjects") or []
    cl=clean(subs)
    res.append((x["search"]["title"], mapg(cl), len(subs), len(cl)))
mapped=sum(1 for _,g,_,_ in res if g)
print(f"=== PRECISION-FIRST GENRE MAPPING ({N} works) ===")
print(f"  noise removal: {sum(r[2] for r in res)} raw subjects -> {sum(r[3] for r in res)} clean ({100*sum(r[3] for r in res)/sum(r[2] for r in res):.0f}% kept)")
print(f"  works mapped to >=1 genre : {mapped}/{N} = {100*mapped/N:.1f}%")
g=Counter(x for _,gs,_,_ in res for x in gs)
print(f"  median genres/work: {sorted(len(gs) for _,gs,_,_ in res)[N//2]}")
print(f"  distribution: {', '.join(f'{k}:{v}' for k,v in g.most_common(12))}")
print(f"\n  --- spot check: 14 random works, mapped genres ---")
random.seed(5)
for t,gs,_,_ in random.sample(res,14):
    print(f"    {t[:44]:<46} -> {', '.join(sorted(gs)) if gs else '(NONE)'}")
