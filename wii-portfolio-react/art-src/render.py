"""Render the channel art scenes to images with headless Edge.

    python art-src/render.py              # all scenes -> art-src/out/ for review
    python art-src/render.py overtone     # one scene
    python art-src/render.py --publish    # also write into public/

Every scene is pixel art (pixel.js): the page paints each frame at its
native size (320x180 for the DS scenes, 240x135 for the 8-bit ones) and this
scales the frames up by a whole number with nearest-neighbour, to at least
the width below, into looping animated WebP:
    tile     -> public/channelart/<id>/channel.webp               (1280 wide)
    expanded -> public/assets/channels/<id>/video.webp            (1920 wide)
    mobile   -> public/assets/channels/<id>/video-mobile.webp     (1080 wide)
The mobile version comes from the same page loaded with ?v=tall.
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
EDGE_FLAGS = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files']

# The images each scene makes. GitHub and LinkedIn keep their logo tiles in
# the menu, and the Mii only needs a phone version.
SCENES = {
    'resume': ('tile', 'expanded', 'mobile'),
    'research-agent': ('tile', 'expanded', 'mobile'),
    'credit-survey': ('tile', 'expanded', 'mobile'),
    'credit-website': ('tile', 'expanded', 'mobile'),
    'tuftes-razor': ('tile', 'expanded', 'mobile'),
    'overtone': ('tile', 'expanded', 'mobile'),
    'betterposter': ('tile', 'expanded', 'mobile'),
    'icca-report': ('tile', 'expanded', 'mobile'),
    'github': ('expanded', 'mobile'),
    'linkedin': ('expanded', 'mobile'),
    'mii': ('mobile',),
}
# minimum output width and path for each kind of image
OUTPUTS = {
    'tile': (1280, lambda s: PUBLIC / 'channelart' / s / 'channel.webp'),
    'expanded': (1920, lambda s: PUBLIC / 'assets' / 'channels' / s / 'video.webp'),
    'mobile': (1080, lambda s: PUBLIC / 'assets' / 'channels' / s / 'video-mobile.webp'),
}


def pixel_frames(scene, view=''):
    """The page leaves its frames as PNG data URLs in <pre id="out">."""
    url = (HERE / f'{scene}.html').as_uri() + (f'?v={view}' if view else '')
    res = subprocess.run([
        str(EDGE), *EDGE_FLAGS, '--virtual-time-budget=10000', '--dump-dom', url,
    ], check=True, capture_output=True)
    dom = res.stdout.decode('utf-8', 'replace')
    found = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    data = json.loads(html.unescape(found.group(1)) if found and found.group(1).strip() else '{"error": "no output"}')
    if 'error' in data:
        raise SystemExit(f'{scene}: {data["error"]}')
    frames = [Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGBA') for url in data['frames']]
    return frames, data['delay']


def save_animation(frames, width, path, delay):
    scale = -(-width // frames[0].width)
    big = [f.resize((f.width * scale, f.height * scale), Image.NEAREST) for f in frames]
    big[0].save(path, save_all=True, append_images=big[1:], duration=delay, loop=0, lossless=True, quality=100, method=4)


def review(frames, name):
    """Contact sheet of every frame, plus the first frame blown up, for checking the art."""
    w, h = frames[0].size
    k = 640 // max(w, h) or 1
    cols = 4
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * w * k + (cols - 1) * 8, rows * h * k + (rows - 1) * 8), (40, 40, 40, 255))
    for i, f in enumerate(frames):
        sheet.paste(f.resize((w * k, h * k), Image.NEAREST), ((i % cols) * (w * k + 8), (i // cols) * (h * k + 8)))
    sheet.save(OUT / f'{name}-frames.png')
    frames[0].resize((w * (1920 // max(w, h)), h * (1920 // max(w, h))), Image.NEAREST).save(OUT / f'{name}-pixel.png')


def render(scene, publish):
    kinds = SCENES[scene]
    wide = [k for k in kinds if k != 'mobile']
    if wide:
        frames, delay = pixel_frames(scene)
        review(frames, scene)
        for kind in wide if publish else []:
            width, path = OUTPUTS[kind]
            save_animation(frames, width, path(scene), delay)
    if 'mobile' in kinds:
        frames, delay = pixel_frames(scene, 'tall')
        review(frames, f'{scene}-tall')
        if publish:
            width, path = OUTPUTS['mobile']
            save_animation(frames, width, path(scene), delay)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    publish = '--publish' in sys.argv
    OUT.mkdir(exist_ok=True)
    for scene in args or SCENES:
        render(scene, publish)
        print(f'{scene}: done{" (published)" if publish else ""}')


if __name__ == '__main__':
    main()
