def lin(c):
    c=c/255
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(h):
    h=h.lstrip('#'); r,g,b=(int(h[i:i+2],16) for i in (0,2,4))
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def ratio(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
P={'Ivory':'#F4F0E7','Paper':'#E9E1D4','Ink':'#191815','Forest':'#26382F','Burgundy':'#63352F'}
bgs=['Ivory','Paper']; fgs=['Ink','Forest','Burgundy']
print(f"{'pair':<22}{'ratio':>7}  AA-body  AA-large")
for b in bgs:
    for f in fgs:
        r=ratio(P[f],P[b])
        print(f"{f+' on '+b:<22}{r:>7.2f}  {'PASS' if r>=4.5 else 'FAIL':<8} {'PASS' if r>=3 else 'FAIL'}")
for b in ['Forest','Burgundy','Ink']:
    for f in ['Ivory','Paper']:
        r=ratio(P[f],P[b])
        print(f"{f+' on '+b:<22}{r:>7.2f}  {'PASS' if r>=4.5 else 'FAIL':<8} {'PASS' if r>=3 else 'FAIL'}")
print()
print("UI/border 3:1 checks")
for pair in [('Forest','Ivory'),('Burgundy','Ivory'),('Paper','Ivory'),('Burgundy','Forest')]:
    r=ratio(P[pair[0]],P[pair[1]])
    print(f"  {pair[0]} vs {pair[1]:<10}{r:>7.2f}  {'PASS' if r>=3 else 'FAIL'}")
