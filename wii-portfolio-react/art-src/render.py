"""Render the channel art scenes to images with headless Edge.

    python art-src/render.py              # all scenes -> art-src/out/ for review
    python art-src/render.py overtone     # one scene
    python art-src/render.py --publish    # also write into public/

Most scenes are pixel art (pixel.js): the page paints each frame at its
native size (320x180 for the DS scenes, 240x135 for the 8-bit ones, 384x216
for BetterPoster, the Mega Drive's own pixel size) and this scales the
frames up by a whole number with nearest-neighbour, to at least the width
below, into looping lossless animated WebP:
    tile     -> public/channelart/<id>/channel.webp               (1280 wide)
    expanded -> public/assets/channels/<id>/video.webp            (1920 wide)
    mobile   -> public/assets/channels/<id>/video-mobile.webp     (1080 wide)
The mobile version comes from the same page loaded with ?v=tall.

Overtone is painted at full size instead (1920x1080, or 1080x1920 tall) on
a swirling background that does not compress losslessly, so its frames are
resized smoothly to each width and saved as lossy WebP.

The Mii Channel's phone art is the one exception: it is the original Mii
Channel image (public/assets/channels/mii/video.jpg) rearranged for a tall
screen, see compose_mii().
"""
import base64
import html
import io
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / 'public'
OUT = HERE / 'out'
EDGE = Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
EDGE_FLAGS = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files']

# The images each scene makes. GitHub and LinkedIn keep their logo tiles in
# the menu.
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
}
# scenes painted at full size rather than as pixel art
SMOOTH = {'overtone'}
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


def save_animation(frames, width, path, delay, smooth=False):
    if smooth:
        size = (width, round(frames[0].height * width / frames[0].width))
        out = [f.convert('RGB') if f.size == size else f.convert('RGB').resize(size, Image.LANCZOS) for f in frames]
        out[0].save(path, save_all=True, append_images=out[1:], duration=delay, loop=0, quality=75, method=6)
        return
    scale = -(-width // frames[0].width)
    big = [f.resize((f.width * scale, f.height * scale), Image.NEAREST) for f in frames]
    big[0].save(path, save_all=True, append_images=big[1:], duration=delay, loop=0, lossless=True, quality=100, method=4)


def review(frames, name):
    """Contact sheet of every frame, plus the first frame at full size, for checking the art."""
    w, h = frames[0].size
    if max(w, h) > 640:
        # painted at full size: frame 0 as it is, and smaller frames for the sheet
        frames[0].save(OUT / f'{name}-pixel.png')
        k = 640 / max(w, h)
        frames = [f.resize((round(w * k), round(h * k)), Image.LANCZOS) for f in frames]
        w, h = frames[0].size
    else:
        big = 1920 // max(w, h)
        frames[0].resize((w * big, h * big), Image.NEAREST).save(OUT / f'{name}-pixel.png')
    k = 640 // max(w, h) or 1
    cols = 4
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * w * k + (cols - 1) * 8, rows * h * k + (rows - 1) * 8), (40, 40, 40, 255))
    for i, f in enumerate(frames):
        sheet.paste(f.resize((w * k, h * k), Image.NEAREST), ((i % cols) * (w * k + 8), (i // cols) * (h * k + 8)))
    sheet.save(OUT / f'{name}-frames.png')


def render(scene, publish):
    kinds = SCENES[scene]
    wide = [k for k in kinds if k != 'mobile']
    if wide:
        frames, delay = pixel_frames(scene)
        review(frames, scene)
        for kind in wide if publish else []:
            width, path = OUTPUTS[kind]
            save_animation(frames, width, path(scene), delay, scene in SMOOTH)
    if 'mobile' in kinds:
        frames, delay = pixel_frames(scene, 'tall')
        review(frames, f'{scene}-tall')
        if publish:
            width, path = OUTPUTS['mobile']
            save_animation(frames, width, path(scene), delay, scene in SMOOTH)


def compose_mii(publish):
    """The original Mii Channel art, rebuilt for a tall screen: the title
    stacked over two lines with its reflection, the crowd along the bottom."""
    src = Image.open(PUBLIC / 'assets' / 'channels' / 'mii' / 'video.jpg').convert('RGB')
    W, H = 1080, 1920
    out = Image.new('RGB', (W, H), 'white')
    up = lambda im, s: im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)

    # the crowd, from just below the original title's reflection, fading in
    s = 1.7
    cw = round(W / s)
    cx = (src.width - cw) // 2
    crowd = up(src.crop((cx, 290, cx + cw, src.height)), s).filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=2))
    cy = H - crowd.height
    mask = Image.new('L', crowd.size, 255)
    mask.paste(Image.linear_gradient('L').resize((W, 140)), (0, 0))
    out.paste(crowd, (0, cy), mask)

    # "Mii" over "Channel", centred in the space above
    top = (cy - 700) // 2
    for box, scale, y, reflect in [((140, 95, 370, 250), 2.2, top, False), ((411, 95, 1020, 250), 1.62, top + 368, True)]:
        word = up(src.crop(box), scale)
        x = (W - word.width) // 2
        out.paste(word, (x, y))
        if reflect:
            h = round(word.height * 0.42)
            mirror = word.crop((0, word.height - h, word.width, word.height)).transpose(Image.FLIP_TOP_BOTTOM)
            fade = Image.linear_gradient('L').resize((word.width, h)).point(lambda v: int((255 - v) * 0.28))
            out.paste(Image.composite(mirror, Image.new('RGB', mirror.size, 'white'), fade), (x, y + word.height))

    out.save(OUT / 'mii-tall-pixel.png')
    if publish:
        out.save(PUBLIC / 'assets' / 'channels' / 'mii' / 'video-mobile.webp', quality=85, method=6)


# phone art built from existing images rather than drawn by a scene page
COMPOSED = {'mii': compose_mii}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    publish = '--publish' in sys.argv
    OUT.mkdir(exist_ok=True)
    for scene in args or [*SCENES, *COMPOSED]:
        COMPOSED[scene](publish) if scene in COMPOSED else render(scene, publish)
        print(f'{scene}: done{" (published)" if publish else ""}')


if __name__ == '__main__':
    main()
