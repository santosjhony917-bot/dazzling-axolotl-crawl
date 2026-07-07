from PIL import Image
import sys

path = sys.argv[1]
im = Image.open(path).convert("RGB")
w, h = im.size
pix = im.load()

ys = []
xs = []
for y in range(500, h - 250):
    row_count = 0
    for x in range(120, w - 120):
        r, g, b = pix[x, y]
        mx = max(r, g, b)
        mn = min(r, g, b)
        # Colored/dark pixels; ignores white background and faint gray UI.
        if mx < 235 and (mx - mn > 18 or mx < 170):
            row_count += 1
    if row_count > 160:
        ys.append(y)

for x in range(120, w - 120):
    col_count = 0
    for y in range(500, h - 250):
        r, g, b = pix[x, y]
        mx = max(r, g, b)
        mn = min(r, g, b)
        if mx < 235 and (mx - mn > 18 or mx < 170):
            col_count += 1
    if col_count > 300:
        xs.append(x)

def segments(values, min_gap=4, min_len=20):
    if not values:
        return []
    out = []
    start = prev = values[0]
    for value in values[1:]:
        if value - prev > min_gap:
            if prev - start + 1 >= min_len:
                out.append((start, prev))
            start = value
        prev = value
    if prev - start + 1 >= min_len:
        out.append((start, prev))
    return out

print({
    "size": (w, h),
    "x_segments": segments(xs, 8, 20),
    "y_segments": segments(ys, 8, 20),
})
