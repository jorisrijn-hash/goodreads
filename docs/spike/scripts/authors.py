import json, random, time
from fetch import get
D=json.load(open("works_deep.json"))
keys=[]
for x in D:
    for k in (x["search"].get("author_key") or []): keys.append(k)
random.seed(3)
keys=list(dict.fromkeys(keys)); sample=random.sample(keys,min(70,len(keys)))
print(f"fetching {len(sample)} authors...",flush=True)
out=[]
for i,k in enumerate(sample):
    a=get(f"https://openlibrary.org/authors/{k}.json")
    if a: out.append(a)
    time.sleep(0.34)
json.dump(out,open("authors.json","w"))
N=len(out)
def bio(a):
    b=a.get("bio")
    if isinstance(b,dict): b=b.get("value")
    return b if isinstance(b,str) and b.strip() else None
def pct(n): return f"{n:>3}/{N} = {100*n/N:5.1f}%"
print(f"\n=== AUTHOR RECORD COMPLETENESS ({N} authors) ===")
print(f"  name             {pct(sum(1 for a in out if a.get('name')))}")
print(f"  bio              {pct(sum(1 for a in out if bio(a)))}")
print(f"  bio >=200 chars  {pct(sum(1 for a in out if bio(a) and len(bio(a))>=200))}")
print(f"  birth_date       {pct(sum(1 for a in out if a.get('birth_date')))}")
print(f"  photo            {pct(sum(1 for a in out if a.get('photos')))}")
print(f"  alternate_names  {pct(sum(1 for a in out if a.get('alternate_names')))}")
print(f"  links            {pct(sum(1 for a in out if a.get('links')))}")
