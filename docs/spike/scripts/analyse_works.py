import json, statistics
from collections import Counter
c = json.load(open("corpus.json"))
docs = list(c.values())
N = len(docs)
def pct(n): return f"{n:>5} / {N} = {100*n/N:5.1f}%"
def has(d,k):
    v = d.get(k)
    return v not in (None, "", [], 0)

print(f"SAMPLE: {N} unique works\n")
print("=== WORK-LEVEL FIELD COMPLETENESS (from search.json) ===")
for f in ["title","subtitle","author_name","author_key","first_publish_year","cover_i",
          "number_of_pages_median","subject","language","edition_count","isbn",
          "ratings_average","ratings_count","readinglog_count","first_sentence","ia"]:
    print(f"  {f:<24} {pct(sum(1 for d in docs if has(d,f)))}")

print("\n=== BY BUCKET (completeness of the 4 fields that matter most) ===")
buckets = {}
for d in docs: buckets.setdefault(d["_bucket"].split(":")[0], []).append(d)
print(f"  {'bucket':<10}{'n':>6}{'cover':>9}{'pages':>9}{'subject':>9}{'year':>9}{'author':>9}")
for b, ds in sorted(buckets.items()):
    n=len(ds)
    f=lambda k: f"{100*sum(1 for d in ds if has(d,k))/n:5.1f}%"
    print(f"  {b:<10}{n:>6}{f('cover_i'):>9}{f('number_of_pages_median'):>9}{f('subject'):>9}{f('first_publish_year'):>9}{f('author_name'):>9}")

print("\n=== PAGE COUNTS ===")
pages = [d["number_of_pages_median"] for d in docs if has(d,"number_of_pages_median")]
print(f"  available      : {pct(len(pages))}")
if pages:
    pages.sort()
    print(f"  median         : {statistics.median(pages)}")
    print(f"  mean           : {statistics.mean(pages):.0f}")
    print(f"  p10 / p90      : {pages[len(pages)//10]} / {pages[9*len(pages)//10]}")
    print(f"  implausible <40: {sum(1 for p in pages if p<40)}  ({100*sum(1 for p in pages if p<40)/len(pages):.1f}% of available)")
    print(f"  implausible >2000: {sum(1 for p in pages if p>2000)}")
    print(f"  usable 40-2000 : {sum(1 for p in pages if 40<=p<=2000)} = {100*sum(1 for p in pages if 40<=p<=2000)/N:.1f}% of whole sample")
    print(f"  --- page-length filter buckets (of whole sample) ---")
    for lo,hi,lab in [(0,200,'short <200'),(200,400,'medium 200-400'),(400,600,'long 400-600'),(600,99999,'very long 600+')]:
        n=sum(1 for p in pages if lo<=p<hi); print(f"     {lab:<16}{n:>5}  ({100*n/N:4.1f}% of sample)")

print("\n=== PUBLICATION YEAR ===")
yrs=[d["first_publish_year"] for d in docs if has(d,"first_publish_year")]
if yrs:
    yrs.sort()
    print(f"  available      : {pct(len(yrs))}")
    print(f"  range          : {yrs[0]} .. {yrs[-1]}")
    for lo,hi,lab in [(0,1900,'pre-1900'),(1900,1980,'1900-1979'),(1980,2010,'1980-2009'),(2010,2020,'2010-2019'),(2020,2030,'2020+')]:
        n=sum(1 for y in yrs if lo<=y<hi); print(f"     {lab:<12}{n:>5} ({100*n/len(yrs):4.1f}%)")
    print(f"  suspicious >2026: {sum(1 for y in yrs if y>2026)}")

print("\n=== EDITION COUNT (work->edition fan-out) ===")
ec=[d.get("edition_count",0) for d in docs]
ec_s=sorted(ec)
print(f"  median editions/work : {statistics.median(ec)}")
print(f"  mean                 : {statistics.mean(ec):.1f}")
print(f"  p90 / max            : {ec_s[9*len(ec_s)//10]} / {max(ec)}")
print(f"  works with 1 edition : {sum(1 for e in ec if e==1)} ({100*sum(1 for e in ec if e==1)/N:.1f}%)")
print(f"  works with >20       : {sum(1 for e in ec if e>20)} ({100*sum(1 for e in ec if e>20)/N:.1f}%)")

print("\n=== AUTHORS ===")
na=[len(d.get("author_name",[]) or []) for d in docs]
print(f"  0 authors : {sum(1 for x in na if x==0)} ({100*sum(1 for x in na if x==0)/N:.1f}%)")
print(f"  1 author  : {sum(1 for x in na if x==1)} ({100*sum(1 for x in na if x==1)/N:.1f}%)")
print(f"  2+        : {sum(1 for x in na if x>1)} ({100*sum(1 for x in na if x>1)/N:.1f}%)")
allauth=Counter(a for d in docs for a in (d.get("author_name") or []))
print(f"  distinct authors in sample: {len(allauth)}")
print(f"  top: {', '.join(f'{a} ({n})' for a,n in allauth.most_common(6))}")

print("\n=== LANGUAGE ===")
langs=Counter(l for d in docs for l in (d.get("language") or []))
print(f"  works with language : {pct(sum(1 for d in docs if has(d,'language')))}")
print(f"  top langs: {', '.join(f'{l}:{n}' for l,n in langs.most_common(8))}")
eng=sum(1 for d in docs if 'eng' in (d.get('language') or []))
print(f"  includes 'eng'      : {pct(eng)}")

print("\n=== OPEN LIBRARY'S OWN RATINGS (not Goodreads) ===")
rc=[d["ratings_count"] for d in docs if has(d,"ratings_count")]
print(f"  works with any rating : {pct(len(rc))}")
if rc: print(f"  median rating count   : {statistics.median(rc)}   max: {max(rc)}")
print("  -> far too sparse to present as community ratings. Confirms: our own ratings only.")
