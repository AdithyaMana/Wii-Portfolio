// Shared helpers for the hand-built channel art. Each scene page draws into
// <svg id="art"> and render.py screenshots it with headless Edge, so text
// gets baked into the image with the local fonts (Rubik, Rodin).
//
// ?v=expanded  -> 1920x1080, full scene (channel selection screen)
// ?v=tile      -> 1280x720, foreground only on transparent (menu tile);
//                 the tile's background is drawn live in channel.html

const NS = 'http://www.w3.org/2000/svg';
const MODE = new URLSearchParams(location.search).get('v') || 'expanded';
const TILE = MODE === 'tile';
const W = TILE ? 1280 : 1920;
const H = TILE ? 720 : 1080;

function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'text') e.textContent = v;
        else e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
}

// Deterministic randomness so re-renders come out identical
function rng(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function linear(defs, id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, extra = {}) {
    const g = el('linearGradient', { id, x1, y1, x2, y2, ...extra }, defs);
    stops.forEach(([o, c, a = 1]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
    return `url(#${id})`;
}

function radial(defs, id, stops, extra = {}) {
    const g = el('radialGradient', { id, ...extra }, defs);
    stops.forEach(([o, c, a = 1]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
    return `url(#${id})`;
}

function blurFilter(defs, id, std) {
    const f = el('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: std }, f);
    return `url(#${id})`;
}

function shadowFilter(defs, id, { dx = 0, dy = 12, std = 12, color = '#000', opacity = 0.45 } = {}) {
    const f = el('filter', { id, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    el('feDropShadow', { dx, dy, stdDeviation: std, 'flood-color': color, 'flood-opacity': opacity }, f);
    return `url(#${id})`;
}

// Four-point twinkle
function sparkle(parent, x, y, r, fill = '#fff', opacity = 1) {
    const k = r * 0.16;
    const d = `M${x},${y - r} Q${x + k},${y - k} ${x + r},${y} Q${x + k},${y + k} ${x},${y + r} ` +
        `Q${x - k},${y + k} ${x - r},${y} Q${x - k},${y - k} ${x},${y - r}Z`;
    return el('path', { d, fill, opacity }, parent);
}

// Chunky glossy Wii-style logo text: drop shadow, outer rim, dark outline,
// gradient fill, then a glassy highlight over the top half of the letters.
let logoCount = 0;
function logo(parent, defs, opts) {
    const {
        x, y, size, spans, anchor = 'middle', font = 'Rubik', weight = 700,
        rim = '#fff', rimW = size * 0.24, outline = '#10202c', outlineW = size * 0.14,
        shadow = 'rgba(0,0,0,0.35)', shadowDy = size * 0.07, spacing = 0,
        gloss = 0.7, capHeight = 0.7, rotate = 0,
    } = opts;
    const id = `logo${logoCount++}`;
    const g = el('g', rotate ? { transform: `rotate(${rotate} ${x} ${y})` } : {}, parent);
    const base = {
        x, y, 'font-family': font, 'font-weight': weight, 'font-size': size,
        'text-anchor': anchor, 'letter-spacing': spacing,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    };
    const layer = (attrs, colored) => {
        const t = el('text', { ...base, ...attrs }, g);
        spans.forEach(s => el('tspan', { text: s.text, ...(colored && s.fill ? { fill: s.fill } : {}) }, t));
        return t;
    };
    if (shadow) layer({ fill: shadow, stroke: shadow, 'stroke-width': rimW, transform: `translate(0 ${shadowDy})` });
    if (rim) layer({ fill: rim, stroke: rim, 'stroke-width': rimW });
    if (outline) layer({ fill: outline, stroke: outline, 'stroke-width': outlineW });
    layer({ fill: '#fff' }, true);
    if (gloss) {
        const top = y - size * capHeight;
        const fill = linear(defs, `${id}-gloss`, [
            [0, '#fff', gloss], [0.46, '#fff', gloss * 0.35], [0.5, '#fff', 0], [1, '#fff', 0],
        ], 0, top, 0, y, { gradientUnits: 'userSpaceOnUse' });
        layer({ fill });
    }
    return g;
}

// Pill / ribbon label in the Wii system font
function pill(parent, { x, y, text, size = 30, fill = 'rgba(0,0,0,0.5)', stroke = '#fff', strokeW = 3, color = '#fff', spacing = 4, padX = 34, padY = 16, font = 'Rodin' }) {
    const g = el('g', {}, parent);
    const t = el('text', {
        x, y, 'font-family': font, 'font-size': size, fill: color, 'text-anchor': 'middle',
        'dominant-baseline': 'central', 'letter-spacing': spacing, text,
    }, g);
    const w = t.getComputedTextLength() + padX * 2;
    const h = size + padY * 2;
    const r = el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: h / 2, fill, stroke, 'stroke-width': strokeW }, g);
    g.insertBefore(r, t);
    return g;
}

// Banner with folded tails peeking out behind the band
function ribbon(parent, { x, y, text, size, fill, tail, ink, color = '#fff', spacing = 2 }) {
    const g = el('g', {}, parent);
    const t = el('text', {
        x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Rodin',
        'font-size': size, fill: color, 'letter-spacing': spacing, text,
    }, g);
    const w = t.getComputedTextLength() + size * 2, h = size * 1.9, l = x - w / 2, tp = y - h / 2;
    const k = size * 1.3;
    const tailAttrs = { fill: tail, stroke: ink, 'stroke-width': 5, 'stroke-linejoin': 'round' };
    el('path', { d: `M${l + 20},${tp + 14} L${l - k},${tp + 14} L${l - k + 22},${tp + 14 + h / 2} L${l - k},${tp + 14 + h} L${l + 20},${tp + 14 + h}Z`, ...tailAttrs }, g);
    el('path', { d: `M${l + w - 20},${tp + 14} L${l + w + k},${tp + 14} L${l + w + k - 22},${tp + 14 + h / 2} L${l + w + k},${tp + 14 + h} L${l + w - 20},${tp + 14 + h}Z`, ...tailAttrs }, g);
    el('rect', { x: l, y: tp, width: w, height: h, rx: 8, fill, stroke: ink, 'stroke-width': 5 }, g);
    el('rect', { x: l + 8, y: tp + 6, width: w - 16, height: h * 0.32, rx: 5, fill: '#fff', opacity: 0.22 }, g);
    g.appendChild(t);
    return g;
}

// Round die-cut sticker: soft shadow, white rim, coloured ring, gloss.
// Returns a group centred on the sticker for the icon to be drawn into.
function sticker(parent, { x, y, r, rotate = 0, fill = '#fff', ring, ringW = r * 0.14, shadow = 'rgba(0,0,0,0.28)', gloss = 0.55 }) {
    const g = el('g', { transform: `translate(${x} ${y}) rotate(${rotate})` }, parent);
    el('circle', { r: r * 1.2, cy: r * 0.14, fill: shadow }, g);
    el('circle', { r: r * 1.18, fill: '#fff' }, g);
    el('circle', { r, fill, ...(ring ? { stroke: ring, 'stroke-width': ringW } : {}) }, g);
    if (gloss) el('ellipse', { cy: -r * 0.52, rx: r * 0.62, ry: r * 0.26, fill: '#fff', opacity: gloss }, g);
    return g;
}

async function ready() {
    await Promise.all([
        document.fonts.load('700 100px Rubik'),
        document.fonts.load('100px Rodin'),
    ]);
}

function setupSvg() {
    const svg = document.getElementById('art');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    const defs = el('defs', {}, svg);
    const bg = el('g', { id: 'bg' }, svg);
    const fg = el('g', { id: 'fg' }, svg);
    if (TILE) bg.setAttribute('display', 'none');
    return { svg, defs, bg, fg };
}
