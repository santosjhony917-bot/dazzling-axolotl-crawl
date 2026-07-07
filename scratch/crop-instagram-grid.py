from PIL import Image
import argparse
import json
import os

parser = argparse.ArgumentParser()
parser.add_argument("--image", required=True)
parser.add_argument("--out", required=True)
parser.add_argument("--x1", type=int, required=True)
parser.add_argument("--y1", type=int, required=True)
parser.add_argument("--x2", type=int, required=True)
parser.add_argument("--y2", type=int, required=True)
parser.add_argument("--cols", type=int, default=4)
parser.add_argument("--limit", type=int, default=12)
parser.add_argument("--gap", type=int, default=2)
args = parser.parse_args()

os.makedirs(args.out, exist_ok=True)
im = Image.open(args.image).convert("RGB")
grid_w = args.x2 - args.x1 + 1
cell = grid_w // args.cols
rows = ((args.y2 - args.y1 + 1) + cell - 1) // cell

crops = []
count = 0
for row in range(rows):
    for col in range(args.cols):
        if count >= args.limit:
            break
        left = args.x1 + col * cell + args.gap
        top = args.y1 + row * cell + args.gap
        right = min(args.x1 + (col + 1) * cell - args.gap, args.x2)
        bottom = min(args.y1 + (row + 1) * cell - args.gap, args.y2)
        if right - left < 80 or bottom - top < 80:
            continue
        crop = im.crop((left, top, right, bottom))
        filename = f"post_{count+1:02d}_r{row+1}_c{col+1}.jpg"
        path = os.path.join(args.out, filename)
        crop.save(path, quality=92)
        crops.append({
            "index": count,
            "row": row + 1,
            "col": col + 1,
            "file": path.replace("\\", "/"),
            "box": [left, top, right, bottom],
        })
        count += 1
    if count >= args.limit:
        break

with open(os.path.join(args.out, "crops.json"), "w", encoding="utf-8") as f:
    json.dump({"source": args.image, "grid": [args.x1, args.y1, args.x2, args.y2], "cell": cell, "crops": crops}, f, indent=2)

print(json.dumps({"out": args.out, "cell": cell, "count": len(crops)}, indent=2))
