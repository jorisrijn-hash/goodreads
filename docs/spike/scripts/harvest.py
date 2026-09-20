import json, time, urllib.parse, sys
from fetch import get

FIELDS = ",".join(["key","title","subtitle","author_name","author_key","first_publish_year",
  "cover_i","edition_count","number_of_pages_median","subject","language",
  "ratings_average","ratings_count","readinglog_count","want_to_read_count","ia","first_sentence","isbn"])

SUBJECTS = ["fiction","fantasy","science_fiction","mystery","thriller","romance","historical_fiction",
 "horror","biography","history","science","psychology","business","poetry","young_adult",
 "classics","memoir","self_help","travel","cookbooks","computers","philosophy"]

corpus = {}
def harvest(label, q, sort, limit=100):
    url = ("https://openlibrary.org/search.json?q=" + urllib.parse.quote(q)
           + f"&sort={sort}&limit={limit}&fields={FIELDS}")
    d = get(url)
    if not d: print(f"  FAIL {label}", flush=True); return
    new = 0
    for doc in d.get("docs", []):
        k = doc.get("key")
        if k and k not in corpus:
            doc["_bucket"] = label; corpus[k] = doc; new += 1
    print(f"  {label:<32} found={d.get('numFound',0):>9} ret={len(d.get('docs',[])):>3} new={new}", flush=True)
    time.sleep(0.4)

print("== A: popular per subject (readinglog sort) ==", flush=True)
for s in SUBJECTS: harvest(f"popular:{s}", f"subject:{s}", "readinglog", 100)
print("\n== B: 2018-2026 per subject ==", flush=True)
for s in SUBJECTS[:14]: harvest(f"recent:{s}", f"subject:{s} AND first_publish_year:[2018 TO 2026]", "readinglog", 50)
print("\n== C: 2023+ newest (known weak spot) ==", flush=True)
for s in ["fiction","fantasy","romance","thriller","mystery","science_fiction"]:
    harvest(f"new23:{s}", f"subject:{s} AND first_publish_year:[2023 TO 2026]", "new", 50)

json.dump(corpus, open("corpus.json","w"))
print(f"\nTOTAL UNIQUE WORKS: {len(corpus)}", flush=True)
