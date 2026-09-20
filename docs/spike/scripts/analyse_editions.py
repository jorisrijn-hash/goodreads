import json, statistics
from collections import Counter
E = json.load(open("editions.json"))
missing = [x for x in E if not x["search"].get("number_of_pages_median")]
control = [x for x in E if x["search"].get("number_of_pages_median")]
print(f"EDITIONS SAMPLE: {len(E)} works  ({len(missing)} lacked work-level page count, {len(control)} control)\n")

def ed_fields(eds):
    return {
      "pages": sum(1 for e in eds if e.get("number_of_pages")),
      "isbn13": sum(1 for e in eds if e.get("isbn_13")),
      "isbn10": sum(1 for e in eds if e.get("isbn_10")),
      "covers": sum(1 for e in eds if e.get("covers")),
      "pubdate": sum(1 for e in eds if e.get("publish_date")),
      "lang": sum(1 for e in eds if e.get("languages")),
      "fmt": sum(1 for e in eds if e.get("physical_format")),
      "publisher": sum(1 for e in eds if e.get("publishers")),
    }
tot_eds=0; agg=Counter()
for x in E:
    eds = x["editions"].get("entries",[])
    tot_eds += len(eds)
    for k,v in ed_fields(eds).items(): agg[k]+=v
print(f"=== EDITION-LEVEL FIELD COMPLETENESS ({tot_eds} edition records) ===")
for k in ["pages","isbn13","isbn10","covers","pubdate","lang","fmt","publisher"]:
    print(f"  {k:<12}{agg[k]:>5}/{tot_eds} = {100*agg[k]/tot_eds:5.1f}%")

print("\n=== ★ CAN EDITIONS RECOVER A MISSING WORK-LEVEL PAGE COUNT? ===")
rec=0; vals=[]
for x in missing:
    eds=x["editions"].get("entries",[])
    ps=[e["number_of_pages"] for e in eds if isinstance(e.get("number_of_pages"),int) and 40<=e["number_of_pages"]<=2000]
    if ps: rec+=1; vals.append(int(statistics.median(ps)))
print(f"  works lacking page count      : {len(missing)}")
print(f"  recovered from editions       : {rec}/{len(missing)} = {100*rec/len(missing) if missing else 0:.1f}%")
if vals: print(f"  median recovered page count   : {statistics.median(vals):.0f}")
print(f"  -> effective page coverage if we do this: {89.3 + (100-89.3)*(rec/len(missing) if missing else 0):.1f}% (est. from 89.3% baseline)")

print("\n=== DEFAULT DISPLAY EDITION — is a good one findable? ===")
def score(e):
    s=0
    if e.get("covers"): s+=4
    if e.get("isbn_13"): s+=2
    if e.get("number_of_pages"): s+=2
    if e.get("languages") and any("eng" in (l.get("key","")) for l in e["languages"]): s+=3
    if e.get("publish_date"): s+=1
    if (e.get("physical_format") or "").lower() in ("paperback","hardcover"): s+=1
    return s
good=0; complete=Counter()
for x in E:
    eds=x["editions"].get("entries",[])
    if not eds: continue
    best=max(eds,key=score)
    if score(best)>=9: good+=1
    complete["cover"]+=1 if best.get("covers") else 0
    complete["isbn13"]+=1 if best.get("isbn_13") else 0
    complete["pages"]+=1 if best.get("number_of_pages") else 0
    complete["date"]+=1 if best.get("publish_date") else 0
n=len([x for x in E if x["editions"].get("entries")])
print(f"  works where a 'good' edition exists (score>=9): {good}/{n} = {100*good/n:.1f}%")
print(f"  best-edition field coverage:")
for k in ["cover","isbn13","pages","date"]:
    print(f"     {k:<8}{complete[k]:>4}/{n} = {100*complete[k]/n:5.1f}%")

print("\n=== EDITION LANGUAGE NOISE (why you must filter) ===")
langs=Counter()
for x in E:
    for e in x["editions"].get("entries",[]):
        for l in (e.get("languages") or []): langs[l.get("key","?").split("/")[-1]]+=1
print(f"  top edition languages: {', '.join(f'{l}:{n}' for l,n in langs.most_common(10))}")
eng=langs.get("eng",0); tot=sum(langs.values())
print(f"  english editions: {eng}/{tot} = {100*eng/tot:.1f}%  -> {100-100*eng/tot:.1f}% are translations we must exclude by default")

print("\n=== PHYSICAL FORMAT VALUES (free-text = messy) ===")
fmts=Counter()
for x in E:
    for e in x["editions"].get("entries",[]):
        f=(e.get("physical_format") or "").strip().lower()
        if f: fmts[f]+=1
print(f"  distinct format strings: {len(fmts)}")
print(f"  top: {', '.join(f'{f}:{n}' for f,n in fmts.most_common(8))}")
