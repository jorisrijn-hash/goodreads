import json, random, time
from fetch import get
c = json.load(open("corpus.json"))
docs = list(c.values())
random.seed(42)
# stratified: 100 popular, 40 recent, 40 new23
strata = {}
for d in docs: strata.setdefault(d["_bucket"].split(":")[0], []).append(d)
sample = (random.sample(strata["popular"],100) + random.sample(strata["recent"],40)
          + random.sample(strata["new23"],40))
print(f"deep sample: {len(sample)} works", flush=True)
out=[]
for i,d in enumerate(sample):
    w = get(f"https://openlibrary.org{d['key']}.json")
    if w: out.append({"search":d,"work":w})
    if i%25==0: print(f"  {i}/{len(sample)}", flush=True)
    time.sleep(0.34)
json.dump(out, open("works_deep.json","w"))
print(f"fetched {len(out)}", flush=True)
