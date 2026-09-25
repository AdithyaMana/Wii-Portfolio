"""Render the channel art scenes to images with headless Edge.

    python art-src/render.py              # all scenes -> art-src/out/ for review
    python art-src/render.py overtone     # one scene
    python art-src/render.py --publish    # also write into public/

Wii-style scenes (SVG, lib.js):
    expanded -> public/assets/channels/<id>/video.jpg      (1920x1080)
    tile     -> public/channelart/<id>/channel.webp        (1280x720, transparent)

DS pixel scenes (canvas, pixel.js), drawn at 320x180 and scaled up with
nearest-neighbour into looping animated WebP:
    expanded -> public/assets/channels/<id>/video.webp     (6x, 1920x1080)
    tile     -> public/channelart/<id>/channel.webp        (4x, 1280x720)
"""
import base64
import html
import io
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / 'public'
OUT = HERE / 'out'
EDGE = Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
SCENES = ['overtone', 'betterposter', 'icca-report']
PIXEL_SCENES = ['resume', 'research-agent', 'credit-survey']
SIZES = {'expanded': (1920, 1080), 'tile': (1280, 720)}
EDGE_FLAGS = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files']


def shoot(scene, mode):
    w, h = SIZES[mode]
    png = OUT / f'{scene}-{mode}.png'
    url = (HERE / f'{scene}.html').as_uri() + f'?v={mode}'
    subprocess.run([
        str(EDGE), *EDGE_FLAGS, '--hide-scrollbars', '--force-device-scale-factor=1',
        '--default-background-color=00000000', '--virtual-time-budget=4000',
        f'--window-size={w},{h}', f'--screenshot={png}', url,
    ], check=True, capture_output=True)
    return png


def render_vector(scene, publish):
    exp = Image.open(shoot(scene, 'expanded')).convert('RGB')
    tile = Image.open(shoot(scene, 'tile')).convert('RGBA')
    exp.save(OUT / f'{scene}-video.jpg', quality=90, optimize=True, progressive=True)
    tile.save(OUT / f'{scene}-channel.webp', quality=90, method=6)
    if publish:
        exp.save(PUBLIC / 'assets' / 'channels' / scene / 'video.jpg', quality=90, optimize=True, progressive=True)
        tile.save(PUBLIC / 'channelart' / scene / 'channel.webp', quality=90, method=6)


def pixel_frames(scene):
    """The page leaves its frames as PNG data URLs in <pre id="out">."""
    res = subprocess.run([
        str(EDGE), *EDGE_FLAGS, '--virtual-time-budget=10000', '--dump-dom', (HERE / f'{scene}.html').as_uri(),
    ], check=True, capture_output=True)
    dom = res.stdout.decode('utf-8', 'replace')
    found = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    data = json.loads(html.unescape(found.group(1)) if found and found.group(1).strip() else '{"error": "no output"}')
    if 'error' in data:
        raise SystemExit(f'{scene}: {data["error"]}')
    frames = [Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGBA') for url in data['frames']]
    return frames, data['delay']


def save_animation(frames, scale, path, delay):
    big = [f.resize((f.width * scale, f.height * scale), Image.NEAREST) for f in frames]
    big[0].save(path, save_all=True, append_images=big[1:], duration=delay, loop=0, lossless=True, quality=100, method=4)


def render_pixel(scene, publish):
    frames, delay = pixel_frames(scene)
    # contact sheet of every frame at 2x, for reviewing the animation
    cols = 4
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * 640 + (cols - 1) * 8, rows * 360 + (rows - 1) * 8), (40, 40, 40, 255))
    for i, f in enumerate(frames):
        sheet.paste(f.resize((640, 360), Image.NEAREST), ((i % cols) * 648, (i // cols) * 368))
    sheet.save(OUT / f'{scene}-frames.png')
    frames[0].resize((1920, 1080), Image.NEAREST).save(OUT / f'{scene}-pixel.png')
    if publish:
        save_animation(frames, 6, PUBLIC / 'assets' / 'channels' / scene / 'video.webp', delay)
        save_animation(frames, 4, PUBLIC / 'channelart' / scene / 'channel.webp', delay)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    publish = '--publish' in sys.argv
    OUT.mkdir(exist_ok=True)
    for scene in args or SCENES + PIXEL_SCENES:
        (render_pixel if scene in PIXEL_SCENES else render_vector)(scene, publish)
        print(f'{scene}: done{" (published)" if publish else ""}')


if __name__ == '__main__':
    main()
