import json, re, unicodedata
# Faithful re-implementation of PostgreSQL pg_trgm semantics.
# pg_trgm: lowercase, split on non-alphanumerics, pad each word with 2 leading
# spaces + 1 trailing space, extract 3-grams, similarity = |A n B| / |A u B|.
def unaccent(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
def trigrams(s):
    s = unaccent(s).lower()
    words = [w for w in re.split(r"[^a-z0-9]+", s) if w]
    out=set()
    for w in words:
        p = "  " + w + " "
        for i in range(len(p)-2): out.add(p[i:i+3])
    return out
def similarity(a,b):
    A,B = trigrams(a), trigrams(b)
    if not A or not B: return 0.0
    return len(A&B)/len(A|B)

corpus = json.load(open("corpus.json"))
titles = []
seen=set()
for d in corpus.values():
    t=(d.get("title") or "").strip()
    a=", ".join(d.get("author_name") or [])
    if t and (t.lower(),a.lower()) not in seen:
        seen.add((t.lower(),a.lower())); titles.append((t,a))
# add the canonical targets so the corpus definitely contains them
for t,a in [("The Secret History","Donna Tartt"),("Dune","Frank Herbert"),
            ("Pride and Prejudice","Jane Austen"),("To Kill a Mockingbird","Harper Lee"),
            ("Kafka on the Shore","Haruki Murakami"),("One Hundred Years of Solitude","Gabriel García Márquez"),
            ("The Great Gatsby","F. Scott Fitzgerald")]:
    if (t.lower(),a.lower()) not in seen: titles.append((t,a)); seen.add((t.lower(),a.lower()))
print(f"local corpus: {len(titles)} distinct title/author pairs\n")

QUERIES = [
 ("The Secre Histroy","The Secret History"),
 ("Duen","Dune"),
 ("pride and prejudise","Pride and Prejudice"),
 ("to kill a mockingbrid","To Kill a Mockingbird"),
 ("the great gatsbi","The Great Gatsby"),
 ("hitchikers guide galaxy","The Hitchhiker's Guide to the Galaxy"),
 ("kafka on the shore","Kafka on the Shore"),
 ("one hundred years of solitude","One Hundred Years of Solitude"),
 ("l'etranger","L'Étranger"),
 ("harry poter philosphers stone","Harry Potter and the Philosopher's Stone"),
 ("sapiens","Sapiens"),
 ("clean code","Clean Code"),
]
PG_DEFAULT = 0.3
print(f"{'query':<34}{'rank':>6}{'sim':>7}  best local match")
print("-"*104)
r1=r5=miss=0
for q, expect in QUERIES:
    scored = sorted(((similarity(q,t), t, a) for t,a in titles), key=lambda x:-x[0])
    rank=None
    for i,(s,t,a) in enumerate(scored[:50]):
        if t.strip().lower()==expect.strip().lower(): rank=i+1; break
    best=scored[0]
    tag = "  " if rank==1 else ("~ " if rank and rank<=5 else "! ")
    rr = "MISS" if rank is None else f"#{rank}"
    print(f"{tag}{q:<32}{rr:>6}{best[0]:>7.2f}  {best[1][:44]}  — {best[2][:24]}")
    if rank==1: r1+=1
    if rank and rank<=5: r5+=1
    if rank is None: miss+=1
print("-"*104)
n=len(QUERIES)
print(f"  rank 1: {r1}/{n} = {100*r1/n:.0f}%    top 5: {r5}/{n} = {100*r5/n:.0f}%    miss: {miss}/{n}")

print(f"\n=== SIMILARITY SCORES FOR THE 4 QUERIES OPEN LIBRARY MISSED ===")
print(f"  (pg_trgm default threshold = {PG_DEFAULT}; set_limit() tunes it)")
for q,expect in QUERIES[:5]:
    s=similarity(q,expect)
    verdict = "PASSES default" if s>=PG_DEFAULT else f"needs set_limit({s-0.02:.2f})"
    print(f"  {q:<30} vs {expect:<34} sim={s:.3f}  {verdict}")
