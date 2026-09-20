import json, random, subprocess, time, concurrent.futures as cf
c=json.load(open("corpus.json")); docs=list(c.values())
random.seed(11)
strata={}
for d in docs: strata.setdefault(d["_bucket"].split(":")[0],[]).append(d)
sample = random.sample(strata["popular"],80)+random.sample(strata["recent"],40)+random.sample(strata["new23"],40)
UA="goodreads-casestudy-spike/0.1 (jorisvrr@gmail.com)"
def check(d):
    cid=d.get("cover_i")
    if not cid: return {"bucket":d["_bucket"].split(":")[0],"has_id":False}
    url=f"https://covers.openlibrary.org/b/id/{cid}-L.jpg"
    p=subprocess.run(["curl","-sS","-L","--max-time","30","-A",UA,"-o","/dev/null",
                      "-w","%{http_code} %{size_download} %{time_total}",url],capture_output=True,text=True)
    try: code,size,t=p.stdout.split()
    except: return {"bucket":d["_bucket"].split(":")[0],"has_id":True,"code":"ERR","size":0,"t":0}
    return {"bucket":d["_bucket"].split(":")[0],"has_id":True,"code":code,"size":int(size),"t":float(t)}
print(f"checking {len(sample)} covers over HTTP...",flush=True)
with cf.ThreadPoolExecutor(max_workers=4) as ex:
    res=list(ex.map(check,sample))
json.dump(res,open("covers.json","w"))

N=len(res)
hid=[r for r in res if r["has_id"]]
ok=[r for r in hid if r.get("code")=="200" and r.get("size",0)>2000]
tiny=[r for r in hid if r.get("code")=="200" and 0<r.get("size",0)<=2000]
bad=[r for r in hid if r.get("code")!="200"]
print(f"\n=== COVER AVAILABILITY (real HTTP, -L size) ===")
print(f"  sample                      : {N}")
print(f"  has cover_i in metadata     : {len(hid)}/{N} = {100*len(hid)/N:.1f}%")
print(f"  HTTP 200 + real image       : {len(ok)}/{N} = {100*len(ok)/N:.1f}%  (end-to-end usable)")
print(f"  HTTP 200 but <=2KB (placeholder/blank): {len(tiny)}")
print(f"  non-200                     : {len(bad)}")
if ok:
    sizes=sorted(r["size"] for r in ok); times=sorted(r["t"] for r in ok)
    print(f"  size  median={sizes[len(sizes)//2]/1024:.0f}KB  p90={sizes[9*len(sizes)//10]/1024:.0f}KB  max={max(sizes)/1024:.0f}KB")
    print(f"  fetch median={times[len(times)//2]:.2f}s  p90={times[9*len(times)//10]:.2f}s")
print("\n  by bucket (end-to-end usable cover):")
for b in ["popular","recent","new23"]:
    bs=[r for r in res if r["bucket"]==b]
    bo=[r for r in bs if r["has_id"] and r.get("code")=="200" and r.get("size",0)>2000]
    print(f"     {b:<9} {len(bo):>3}/{len(bs):<3} = {100*len(bo)/len(bs):5.1f}%")
