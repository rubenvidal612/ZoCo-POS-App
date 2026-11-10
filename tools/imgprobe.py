from PIL import Image
im = Image.open(r"C:\ZOCOPOS 2.0\captures\400-kyte-vender.png").convert("RGB")
w,h = im.size
print("size", w, h)
for k,(x,y) in {"sidebar":(120,420),"bg":(700,900),"card":(390,300),"cart":(1200,700),"topbar":(700,20)}.items():
    if x<w and y<h: print(k, im.getpixel((x,y)))
row=300
runs=[]; prev=None; start=200
for x in range(200, w-10):
    c=im.getpixel((x,row))
    if c!=prev:
        if prev is not None and x-start>30: runs.append((start,x,prev))
        prev=c; start=x
print("runs:", runs[:14])
col=400
vr=[]; prev=None; start=120
for y in range(120, h-10):
    c=im.getpixel((col,y))
    if c!=prev:
        if prev is not None and y-start>20: vr.append((start,y,prev))
        prev=c; start=y
print("vruns:", vr[:10])
