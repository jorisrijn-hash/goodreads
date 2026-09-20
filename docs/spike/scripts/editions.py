import json, random, time
from fetch import get
D = json.load(open("works_deep.json"))
random.seed(7)
# prioritise works MISSING page count, to test recovery; plus a control group
missing = [x for x in D if not x["search"].get("number_of_pages_median")]
haveit  = [x for x in D if x["search"].get("number_of_pages_median")]
sample = missing[:35] + random.sample(haveit, 35)
print(f"editions sample: {len(sample)} works ({len(missing[:35])} missing pages, 35 control)", flush=True)
out=[]
for i,x in enumerate(sample):
    e = get(f"https://openlibrary.org{x['search']['key']}/editions.json?limit=50")
    if e: out.append({"key":x["search"]["key"],"search":x["search"],"editions":e})
    if i%20==0: print(f"  {i}/{len(sample)}", flush=True)
    time.sleep(0.34)
json.dump(out, open("editions.json","w"))
print(f"fetched {len(out)}", flush=True)
