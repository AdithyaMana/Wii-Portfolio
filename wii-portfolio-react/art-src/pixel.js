// Pixel-art toolkit for the Nintendo DS style channel art. Scenes paint
// every frame at a native 320x180 into an RGBA buffer; render.py reads the
// frames back and scales them up with nearest-neighbour, so each art pixel
// stays a crisp square.

const PW = 320;
const PH = 180;

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayer = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;

const rgbaCache = {};
function rgba(c) {
    if (Array.isArray(c)) return c;
    if (rgbaCache[c]) return rgbaCache[c];
    let h = c.slice(1);
    if (h.length === 3) h = [...h].map(ch => ch + ch).join('');
    const v = [0, 2, 4, 6].map(i => (i < h.length ? parseInt(h.slice(i, i + 2), 16) : 255));
    return (rgbaCache[c] = v);
}

// Brightness shift for a colour: k < 1 darkens, k > 1 lightens towards white
function shade(c, k) {
    const [r, g, b] = rgba(c);
    const f = v => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
    return '#' + [r, g, b].map(v => f(v).toString(16).padStart(2, '0')).join('');
}

// Seeded randomness so every render comes out identical
function rng(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// 1-bit coverage map, used for text and logos so they can be outlined
class Mask {
    constructor(w, h) { this.w = w; this.h = h; this.a = new Uint8Array(w * h); }
    get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : 0; }
    set(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y * this.w + x] = 1; }
    grow(diagonal = true) {
        const m = new Mask(this.w, this.h);
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (!this.get(x, y)) continue;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (diagonal || !dx || !dy) m.set(x + dx, y + dy);
                    }
                }
            }
        }
        return m;
    }
    bbox() {
        let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (!this.get(x, y)) continue;
                x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            }
        }
        return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }
}

class Pix {
    constructor(w = PW, h = PH) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }

    set(x, y, c) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const [r, g, b, a] = rgba(c), i = (y * this.w + x) * 4, d = this.d;
        if (a === 255) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; return; }
        const k = a / 255;
        d[i] = d[i] + (r - d[i]) * k; d[i + 1] = d[i + 1] + (g - d[i + 1]) * k; d[i + 2] = d[i + 2] + (b - d[i + 2]) * k;
        d[i + 3] = Math.min(255, d[i + 3] + a * (1 - d[i + 3] / 255));
    }

    rect(x, y, w, h, c) {
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    }

    // 1px outline, optionally with the corner pixels knocked out
    box(x, y, w, h, c, round = false) {
        for (let i = x; i < x + w; i++) {
            if (round && (i === x || i === x + w - 1)) continue;
            this.set(i, y, c); this.set(i, y + h - 1, c);
        }
        for (let j = y + 1; j < y + h - 1; j++) { this.set(x, j, c); this.set(x + w - 1, j, c); }
    }

    // Filled rectangle with pixel-rounded corners (radius 1 or 2)
    panel(x, y, w, h, fill, r = 1) {
        for (let j = 0; j < h; j++) {
            let inset = 0;
            if (r >= 2) inset = j === 0 || j === h - 1 ? 2 : j === 1 || j === h - 2 ? 1 : 0;
            else if (r === 1) inset = j === 0 || j === h - 1 ? 1 : 0;
            for (let i = x + inset; i < x + w - inset; i++) this.set(i, y + j, fill);
        }
    }

    // Panel with a 1px outline that follows the rounded corners
    frame(x, y, w, h, fill, line, r = 1) {
        this.panel(x, y, w, h, line, r);
        this.panel(x + 1, y + 1, w - 2, h - 2, fill, Math.max(0, r - 1));
    }

    line(x0, y0, x1, y1, c) {
        let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
        for (;;) {
            this.set(x0, y0, c);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
    }

    thick(x0, y0, x1, y1, w, c) {
        const r = (w - 1) / 2;
        for (let oy = -Math.floor(r); oy <= Math.ceil(r); oy++) {
            for (let ox = -Math.floor(r); ox <= Math.ceil(r); ox++) this.line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, c);
        }
    }

    disc(cx, cy, r, c) {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) this.set(cx + x, cy + y, c);
        }
    }

    ring(cx, cy, r, c) {
        const inner = (r - 1) * (r - 1) + (r - 1) * 0.8, outer = r * r + r * 0.8;
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                const d = x * x + y * y;
                if (d <= outer && d > inner) this.set(cx + x, cy + y, c);
            }
        }
    }

    // Ordered-dither blend of two colours: f=0 all c1, f=1 all c2
    dither(x, y, w, h, c1, c2, f) {
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, bayer(i, j) < f ? c2 : c1);
    }

    // Vertical gradient through evenly spaced colours, dithered between them
    vgrad(x, y, w, h, colors) {
        for (let j = 0; j < h; j++) {
            const t = (j / Math.max(1, h - 1)) * (colors.length - 1), k = Math.min(colors.length - 2, Math.floor(t)), f = t - k;
            for (let i = x; i < x + w; i++) this.set(i, y + j, bayer(i, y + j) < f ? colors[k + 1] : colors[k]);
        }
    }

    mask(m, c, ox = 0, oy = 0) {
        const fn = typeof c === 'function' ? c : null;
        for (let y = 0; y < m.h; y++) {
            for (let x = 0; x < m.w; x++) if (m.a[y * m.w + x]) this.set(ox + x, oy + y, fn ? fn(x, y) : c);
        }
    }

    // rows: array of equal-length strings; pal maps characters to colours ('.' is clear)
    sprite(rows, pal, x, y, { flip = false, scale = 1 } = {}) {
        const w = rows[0].length;
        rows.forEach((row, j) => {
            if (row.length !== w) throw new Error(`sprite row ${j} is ${row.length} wide, expected ${w}: "${row}"`);
            for (let i = 0; i < w; i++) {
                const ch = row[flip ? w - 1 - i : i];
                if (ch === '.' || ch === ' ') continue;
                if (!(ch in pal)) throw new Error(`sprite colour "${ch}" is not in the palette`);
                for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) this.set(x + i * scale + sx, y + j * scale + sy, pal[ch]);
            }
        });
        return { w: w * scale, h: rows.length * scale };
    }

    toDataURL() {
        const c = document.createElement('canvas');
        c.width = this.w; c.height = this.h;
        c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
        return c.toDataURL('image/png');
    }
}

// Scale2x (AdvMAME2x): doubles a sprite and rounds off its diagonals so it
// still looks hand-drawn at the larger size
function scale2x(rows) {
    const h = rows.length, w = rows[0].length;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x]);
    const out = [];
    for (let y = 0; y < h; y++) {
        let top = '', bottom = '';
        for (let x = 0; x < w; x++) {
            const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
            top += (C === A && C !== D && A !== B ? A : P) + (A === B && A !== C && B !== D ? B : P);
            bottom += (D === C && D !== B && C !== A ? C : P) + (B === D && B !== A && D !== C ? D : P);
        }
        out.push(top, bottom);
    }
    return out;
}

// 5x7 bitmap font, uppercase plus the punctuation the scenes need
const FONT = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    ',': ['..', '..', '..', '..', '.#', '.#', '#.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    ':': ['.', '#', '.', '.', '.', '#', '.'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '-': ['....', '....', '....', '####', '....', '....', '....'],
    '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
    '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
    '▶': ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
    '▼': ['.......', '.......', '#######', '.#####.', '..###..', '...#...', '.......'],
};

// 10x10 one-colour icons, drawn white on coloured badges
const ICONS = {
    bulb: ['...####...', '..#....#..', '.#......#.', '.#......#.', '.#......#.', '..#....#..', '...#..#...', '...####...', '...####...', '....##....'],
    database: ['..######..', '.#......#.', '.########.', '.#......#.', '.#......#.', '.########.', '.#......#.', '.#......#.', '..######..', '..........'],
    chart: ['....##....', '....##....', '....##.##.', '....##.##.', '.##.##.##.', '.##.##.##.', '.##.##.##.', '.##.##.##.', '##########', '..........'],
    dollar: ['.....#....', '...#####..', '..#..#....', '..#..#....', '...####...', '.....#..#.', '.....#..#.', '..#####...', '.....#....', '..........'],
    magnifier: ['.####.....', '#....#....', '#....#....', '#....#....', '#....#....', '.#####....', '.....##...', '......##..', '.......##.', '........##'],
    flask: ['..######..', '...#..#...', '...#..#...', '..#....#..', '.#......#.', '.########.', '##########', '##########', '.########.', '..........'],
    checklist: ['...####...', '.########.', '.#......#.', '.#.#.##.#.', '.#......#.', '.#.#.##.#.', '.#......#.', '.#.#.##.#.', '.#......#.', '.########.'],
    cube: ['....##....', '..##..##..', '##......##', '#.##..##.#', '#...##...#', '#...##...#', '#...##...#', '.##.##.##.', '...####...', '..........'],
    code: ['..........', '......#...', '......#...', '..#..#.#..', '.#...#..#.', '#....#...#', '.#..#...#.', '..#.#..#..', '....#.....', '..........'],
    person: ['...##...#.', '..####.###', '..####..#.', '...##.....', '..........', '.######...', '########..', '########..', '########..', '..........'],
    shield: ['.########.', '.#......#.', '.#....#.#.', '.#...#..#.', '.##.#...#.', '.#.#....#.', '..#....#..', '...#..#...', '....##....', '..........'],
    pie: ['...####...', '.##..####.', '.#...####.', '#....#####', '#....#####', '#........#', '#........#', '.#......#.', '.##....##.', '...####...'],
    pencil: ['........#.', '.......###', '......###.', '.....###..', '....###...', '...###....', '..###.....', '.###......', '.##.......', '#.........'],
    review: ['.........#', '........##', '.......##.', '......##..', '....#.#...', '...#......', '#.#.......', '.#........', '..........', '..........'],
    gamepad: ['..........', '..........', '..######..', '.#.######.', '#...###.##', '##.#####.#', '##########', '###....###', '##......##', '..........'],
    headset: ['..........', '..........', '..........', '.########.', '##########', '#...##...#', '#...##...#', '##########', '.###..###.', '..........'],
    robot: ['....##....', '....##....', '.########.', '#........#', '#.##..##.#', '#.##..##.#', '#........#', '#..####..#', '.########.', '..........'],
    chat: ['..........', '.########.', '##########', '##.#.#.###', '##########', '.########.', '..##......', '.#........', '..........', '..........'],
};

function icon(p, name, x, y, color = '#fff', scale = 1) {
    p.sprite(ICONS[name], { '#': color }, x, y, { scale });
}

function textMask(str, { scale = 1, spacing = 1, pad = 3 } = {}) {
    const glyphs = [...str].map(ch => {
        const g = FONT[ch];
        if (!g) throw new Error(`font has no glyph for "${ch}"`);
        return g;
    });
    const w = glyphs.reduce((s, g, i) => s + g[0].length * scale + (i ? spacing * scale : 0), 0);
    const h = 7 * scale;
    const m = new Mask(w + pad * 2, h + pad * 2);
    let cx = pad;
    glyphs.forEach(g => {
        g.forEach((row, j) => [...row].forEach((ch, i) => {
            if (ch !== '#') return;
            for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) m.set(cx + i * scale + sx, pad + j * scale + sy);
        }));
        cx += (g[0].length + spacing) * scale;
    });
    return { m, w, h, pad };
}

// Bitmap text; (x, y) is the top-left of the first letter. shadow is the
// DS dialogue style: one pixel right, down and diagonal.
function text(p, str, x, y, { color = '#fff', outline, shadow, scale = 1, spacing = 1, anchor = 'left' } = {}) {
    const { m, w, pad } = textMask(str, { scale, spacing });
    const ox = (anchor === 'center' ? Math.round(x - w / 2) : anchor === 'right' ? x - w : x) - pad, oy = y - pad;
    if (outline) p.mask(m.grow(true), outline, ox, oy);
    if (shadow) [[1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => p.mask(m, shadow, ox + dx, oy + dy));
    p.mask(m, color, ox, oy);
    return w;
}

function textWidth(str, scale = 1, spacing = 1) {
    return textMask(str, { scale, spacing }).w;
}

// Chunky title logo from a real font: rasterise, snap to 1-bit, then build
// it back up with banded colour, a bevel and outlines like a DS title card.
const logoCache = {};
function logoMask(str, { size, font = 'Rubik', weight = 700, spacing = 0, threshold = 110, dotGap = 0 }) {
    const key = [str, size, font, weight, spacing, threshold, dotGap].join('|');
    if (logoCache[key]) return logoCache[key];
    // with dotGap, each i is drawn dotless and gets its own dot further up,
    // because at small sizes the outline swallows the gap and it reads as I
    const shown = dotGap ? str.replace(/i/g, 'ı') : str;
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    const css = `${weight} ${size}px ${font}`;
    ctx.font = css;
    ctx.letterSpacing = `${spacing}px`;
    const m = ctx.measureText(shown), pad = 6 + dotGap * 2;
    c.width = Math.ceil(m.width) + pad * 2 + Math.abs(spacing) * str.length;
    c.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2;
    ctx.font = css;
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(shown, pad, pad + Math.ceil(m.actualBoundingBoxAscent));
    const img = ctx.getImageData(0, 0, c.width, c.height).data, mask = new Mask(c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (img[(y * c.width + x) * 4 + 3] >= threshold) mask.set(x, y);
    const baseline = pad + Math.ceil(m.actualBoundingBoxAscent) - 1;
    mask.box = mask.bbox();
    if (dotGap) {
        [...str].forEach((ch, k) => {
            if (ch !== 'i') return;
            const x0 = Math.floor(pad + ctx.measureText(shown.slice(0, k)).width);
            const x1 = Math.ceil(pad + ctx.measureText(shown.slice(0, k + 1)).width);
            // the stem is whatever reaches the baseline; climb it to find its top
            const cols = [];
            let top = baseline;
            for (let x = x0; x < x1; x++) {
                if (!mask.get(x, baseline - 1)) continue;
                cols.push(x);
                let y = baseline - 1;
                while (mask.get(x, y - 1)) y--;
                top = Math.min(top, y);
            }
            cols.forEach(x => { for (let y = top - dotGap - cols.length; y < top - dotGap; y++) mask.set(x, y); });
        });
    }
    return (logoCache[key] = mask);
}

// (x, y) is the top-left of the letters' ink; returns the ink size
function logo(p, str, { x, y, anchor = 'left', size, font, weight, spacing, dotGap, bands, light, dark, outline, outlineWidth = 1, rim, shadow, shadowDy = 2 }) {
    const m = logoMask(str, { size, font, weight, spacing, dotGap }), bb = m.box;
    const ox = (anchor === 'center' ? Math.round(x - bb.w / 2) : x) - bb.x0, oy = y - bb.y0;
    let line = m.grow(true);
    for (let i = 1; i < outlineWidth; i++) line = line.grow(true);
    const outer = line.grow(true);
    if (shadow) p.mask(rim ? outer : line, shadow, ox + (shadowDy > 1 ? 1 : 0), oy + shadowDy);
    if (rim) p.mask(outer, rim, ox, oy);
    p.mask(line, outline, ox, oy);
    p.mask(m, (mx, my) => {
        if (light && !m.get(mx, my - 1)) return light;
        if (dark && !m.get(mx, my + 1)) return dark;
        const t = (my - bb.y0) / bb.h;
        return bands[Math.max(0, Math.min(bands.length - 1, Math.floor(t * bands.length)))];
    }, ox, oy);
    return { w: bb.w, h: bb.h };
}

// Four-point twinkle that grows and shrinks over a four-step cycle
function twinkle(p, x, y, phase, c = '#fff') {
    const r = [0, 1, 2, 1][phase & 3];
    p.set(x, y, c);
    for (let i = 1; i <= r; i++) { p.set(x - i, y, c); p.set(x + i, y, c); p.set(x, y - i, c); p.set(x, y + i, c); }
}

// Draws each frame and leaves them in <pre id="out"> for render.py
async function runFrames(draw, { frames = 1, delay = 150 } = {}) {
    const out = document.getElementById('out');
    try {
        await Promise.all([document.fonts.load('700 30px Rubik'), document.fonts.load('900 30px "Segoe UI"')]);
        const list = [];
        for (let f = 0; f < frames; f++) {
            const p = new Pix();
            draw(p, f);
            list.push(p.toDataURL());
        }
        out.textContent = JSON.stringify({ frames: list, delay });
    } catch (e) {
        out.textContent = JSON.stringify({ error: String(e && e.stack || e) });
    }
}
