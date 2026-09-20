import json, subprocess, time, sys
UA = "goodreads-casestudy-spike/0.1 (jorisvrr@gmail.com)"
def get(url, tries=3):
    for a in range(tries):
        p = subprocess.run(["curl","-sS","--compressed","--max-time","60","-A",UA,url],
                           capture_output=True, text=True)
        if p.returncode==0 and p.stdout.strip():
            try: return json.loads(p.stdout)
            except Exception as e: sys.stderr.write(f"  parse err: {e}\n")
        time.sleep(2)
    return None
