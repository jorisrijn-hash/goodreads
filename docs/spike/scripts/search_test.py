import json, urllib.parse, time, re
from fetch import get

TESTS = [
 # (query, expected title regex, expected author regex|None, category)
 ("the secret history", r"^the secret history$", r"tartt", "exact title"),
 ("secret history", r"^the secret history$", r"tartt", "partial title"),
 ("The Secre Histroy", r"^the secret history$", r"tartt", "TYPO (2 errors)"),
 ("donna tartt", None, r"tartt", "author"),
 ("dune", r"^dune$", r"herbert", "exact (short)"),
 ("Duen", r"^dune$", r"herbert", "TYPO (transposition)"),
 ("frank herbert", None, r"herbert", "author"),
 ("9780441013593", r"dune", r"herbert", "ISBN-13"),
 ("0441013597", r"dune", r"herbert", "ISBN-10"),
 ("harry potter and the philosophers stone", r"philosopher.s stone", r"rowling", "PUNCT (no apostrophe)"),
 ("Harry Potter and the Philosopher's Stone", r"philosopher.s stone", r"rowling", "exact w/ punct"),
 ("the hitchhikers guide to the galaxy", r"hitchhiker", r"adams", "PUNCT (no apostrophe)"),
 ("hitchikers guide galaxy", r"hitchhiker", r"adams", "TYPO + partial"),
 ("pride and prejudice", r"^pride and prejudice$", r"austen", "exact title"),
 ("pride and prejudise", r"^pride and prejudice$", r"austen", "TYPO"),
 ("gatsby", r"great gatsby", r"fitzgerald", "one-word partial"),
 ("the great gatsbi", r"great gatsby", r"fitzgerald", "TYPO"),
 ("1984", r"1984|nineteen eighty", r"orwell", "numeric title"),
 ("kafka on the shore", r"kafka on the shore", r"murakami", "exact title"),
 ("murakami", None, r"murakami", "author surname"),
 ("l'étranger", r"tranger|stranger", r"camus", "ACCENT (native)"),
 ("l'etranger", r"tranger|stranger", r"camus", "ACCENT (stripped)"),
 ("sapiens", r"sapiens", r"harari", "partial nonfiction"),
 ("clean code robert martin", r"clean code", r"martin", "title + author mixed"),
 ("to kill a mockingbrid", r"mockingbird", r"lee", "TYPO"),
 ("one hundred years of solitude", r"solitude", r"m.rquez|marquez", "exact title"),
]
FIELDS="key,title,author_name,first_publish_year,cover_i"
def rank_of(docs, tre, are):
    for i,d in enumerate(docs):
        t=(d.get("title") or "").strip().lower()
        a=" ".join(d.get("author_name") or []).lower()
        tok = (re.search(tre,t) is not None) if tre else True
        aok = (re.search(are,a) is not None) if are else True
        if tok and aok: return i+1
    return None

rows=[]
for q,tre,are,cat in TESTS:
    url=f"https://openlibrary.org/search.json?q={urllib.parse.quote(q)}&limit=20&fields={FIELDS}"
    d=get(url)
    docs=d.get("docs",[]) if d else []
    r=rank_of(docs,tre,are)
    top=(docs[0]["title"][:38] if docs else "—")
    rows.append((cat,q,r,len(docs),top))
    time.sleep(0.34)

print(f"{'category':<24}{'query':<42}{'rank':>6}  top result")
print("-"*118)
for cat,q,r,n,top in rows:
    rr = "MISS" if r is None else (f"#{r}")
    flag = "  " if (r==1) else ("~ " if (r and r<=5) else "! ")
    print(f"{flag}{cat:<22}{q[:40]:<42}{rr:>6}  {top}")

tot=len(rows); r1=sum(1 for *_ ,r,_,_ in [(c,q,r,n,t) for c,q,r,n,t in rows] if r==1)
r1=sum(1 for c,q,r,n,t in rows if r==1)
r5=sum(1 for c,q,r,n,t in rows if r and r<=5)
miss=sum(1 for c,q,r,n,t in rows if r is None)
print("-"*118)
print(f"  rank 1      : {r1}/{tot} = {100*r1/tot:.0f}%")
print(f"  top 5       : {r5}/{tot} = {100*r5/tot:.0f}%")
print(f"  not found   : {miss}/{tot} = {100*miss/tot:.0f}%")
typo=[(c,q,r) for c,q,r,n,t in rows if "TYPO" in c]
print(f"\n  TYPO queries: {len(typo)}   rank1={sum(1 for *_,r in typo if r==1)}  top5={sum(1 for *_,r in typo if r and r<=5)}  MISS={sum(1 for *_,r in typo if r is None)}")
for c,q,r in typo: print(f"     {'MISS' if r is None else '#'+str(r):>5}  {q}")
acc=[(c,q,r) for c,q,r,n,t in rows if "ACCENT" in c or "PUNCT" in c]
print(f"\n  PUNCT/ACCENT queries: {len(acc)}  rank1={sum(1 for *_,r in acc if r==1)}  MISS={sum(1 for *_,r in acc if r is None)}")
for c,q,r in acc: print(f"     {'MISS' if r is None else '#'+str(r):>5}  {q}")
json.dump(rows,open("search_results.json","w"))
