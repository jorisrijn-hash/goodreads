def lin(c):
    c=c/255
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(h):
    h=h.lstrip('#'); r,g,b=(int(h[i:i+2],16) for i in (0,2,4))
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def ratio(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
IV='#F4F0E7'
# candidate muted ink (warm grey) and border tokens
for name,hexv in [('Ink-70 #5C574E','#5C574E'),('Ink-60 #6E685D','#6E685D'),('Ink-50 #837C6F','#837C6F'),
                  ('Border #D8CEBD','#D8CEBD'),('Border-strong #BFB3A0','#BFB3A0')]:
    print(f"{name:<22} on Ivory = {ratio(hexv,IV):>5.2f}")
