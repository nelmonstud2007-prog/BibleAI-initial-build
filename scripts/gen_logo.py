#!/usr/bin/env python3
"""Generate SVG logo wrapper and favicon from the PNG logo."""
from PIL import Image
import base64
import os

# Read the PNG
png_path = "/home/ubuntu/BibleAI/src/assets/logo-icon.png"
img = Image.open(png_path)

# Create favicon sizes
favicon_sizes = [16, 32, 48, 64, 128, 192, 512]
for size in favicon_sizes:
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(f"/home/ubuntu/BibleAI/public/favicon-{size}.png")

# Save main favicon
img.resize((32, 32), Image.LANCZOS).save("/home/ubuntu/BibleAI/public/favicon.png")

# Create SVG that embeds the PNG as base64 (scalable wrapper)
with open(png_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,{b64}" x="0" y="0" width="512" height="512"/>
</svg>'''

with open("/home/ubuntu/BibleAI/src/assets/logo-icon.svg", "w") as f:
    f.write(svg_content)

# Also copy to public
with open("/home/ubuntu/BibleAI/public/logo-icon.svg", "w") as f:
    f.write(svg_content)

print("Logo files generated successfully!")
print(f"Favicon sizes: {favicon_sizes}")
