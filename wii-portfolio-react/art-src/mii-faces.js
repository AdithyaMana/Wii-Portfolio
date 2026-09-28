// Procedural Mii-style heads for the crowd and network scenes. miiHead
// draws a head s pixels wide with shoulders underneath; (x, y) is the
// top-left of the head. A look picks the skin, hair, shirt and extras.

const MII_SKINS = ['#ffe3c8', '#f8cfa6', '#eab58c', '#cf9366', '#a36d45', '#734c31'];
const MII_HAIRS = ['#2b2b35', '#4a2f1f', '#7a4a24', '#b8742e', '#e2b760', '#a8a8b0', '#b8322c'];
// the Wii's twelve favourite colours
const MII_SHIRTS = ['#e3261c', '#ff7a1a', '#ffd23f', '#8fd84a', '#1f9a3a', '#2f5fd0', '#5fc8f0', '#ff7ab0', '#8a4ad0', '#7a4a24', '#f4f4f4', '#3a3a44'];
const MII_STYLES = ['short', 'bangs', 'long', 'bob', 'spiky', 'bun', 'bald', 'parted'];

function randomLook(rand) {
    const pick = list => list[Math.floor(rand() * list.length)];
    return {
        skin: pick(MII_SKINS), hair: pick(MII_HAIRS), style: pick(MII_STYLES), shirt: pick(MII_SHIRTS),
        glasses: rand() < 0.22, blush: rand() < 0.35, smile: rand() < 0.75,
    };
}

function miiHead(p, x, y, s, look, { blink = false } = {}) {
    const h = Math.round(s * 1.12), rx = s / 2, ry = h / 2, cx = x + rx, cy = y + ry;
    const INKS = shade(look.skin, 0.45), HAIR = look.hair, HAIR_DK = shade(HAIR, 0.7);
    const at = (px, py) => [(px + 0.5 - cx) / rx, (py + 0.5 - cy) / ry];
    const inHead = (px, py) => { const [nx, ny] = at(px, py); return nx * nx + ny * ny <= 1; };
    const long = look.style === 'long' || look.style === 'bob';

    // shoulders in the favourite colour, peeking out under the chin
    const sy = y + h - Math.round(s * 0.12), sh = Math.round(s * 0.34);
    for (let j = 0; j < sh; j++) {
        const half = Math.round(rx * (0.7 + (j / sh) * 0.55));
        p.rect(Math.round(cx - half), sy + j, half * 2, 1, j === 0 ? shade(look.shirt, 0.7) : look.shirt);
    }
    p.rect(Math.round(cx - 1), sy, 2, Math.max(2, Math.round(sh * 0.4)), shade(look.skin, 0.85));

    // long hair falls behind the head
    if (long) {
        const bx = rx + Math.max(1, s * 0.08), by = ry + 1, drop = look.style === 'long' ? 0.95 : 0.45;
        for (let py = Math.floor(y - 1); py < y + h; py++) {
            for (let px = Math.floor(x - 2); px < x + s + 2; px++) {
                const nx = (px + 0.5 - cx) / bx, ny = (py + 0.5 - cy) / by;
                if (nx * nx + ny * ny <= 1 && ny < drop) p.set(px, py, ny > drop - 0.2 ? HAIR_DK : HAIR);
            }
        }
    }
    if (look.style === 'bun') p.disc(Math.round(cx), Math.round(y - s * 0.06), Math.max(2, Math.round(s * 0.16)), HAIR);

    // the head itself, with a one pixel outline
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + s; px++) {
            if (!inHead(px, py)) continue;
            const edge = !inHead(px - 1, py) || !inHead(px + 1, py) || !inHead(px, py - 1) || !inHead(px, py + 1);
            p.set(px, py, edge ? INKS : look.skin);
        }
    }
    // soft shading down the right cheek
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + s; px++) {
            const [nx, ny] = at(px, py);
            if (inHead(px, py) && inHead(px + 1, py) && nx > 0.55 && ny > -0.3) p.set(px, py, shade(look.skin, 0.92));
        }
    }

    // hair on top of the head
    if (look.style !== 'bald') {
        const line = { short: -0.32, bangs: -0.12, long: -0.22, bob: -0.08, spiky: -0.3, bun: -0.3, parted: -0.28 }[look.style];
        for (let py = y - 1; py < y + h; py++) {
            for (let px = x - 1; px <= x + s; px++) {
                const [nx, ny] = at(px, py), d = nx * nx + ny * ny;
                // hairline dips at the temples; sideburns for most styles
                const hairline = line + 0.18 * nx * nx, side = Math.abs(nx) > 0.78 && ny < (long ? 0.55 : 0.05);
                if (d <= 1.08 && (ny < hairline || side)) {
                    const partGap = look.style === 'parted' && Math.abs(px + 0.5 - (cx - rx * 0.3)) < 0.6 && ny < -0.5 && ny > -0.95;
                    p.set(px, py, partGap ? shade(HAIR, 1.35) : ny < -0.7 && nx < 0 ? shade(HAIR, 1.25) : HAIR);
                }
            }
        }
        if (look.style === 'spiky') {
            // filled tufts rising out of the cap
            const base = y + Math.round(s * 0.14), half = Math.max(1, Math.round(s * 0.1));
            for (let k = -2; k <= 2; k++) {
                const tx = Math.round(cx + k * rx * 0.4), ty = y - Math.round(s * 0.12) - (k === 0 ? 1 : 0);
                for (let py = ty; py <= base; py++) {
                    const w = Math.round(half * (py - ty) / (base - ty));
                    p.rect(tx - w, py, w * 2 + 1, 1, py === ty ? shade(HAIR, 1.25) : HAIR);
                }
            }
        }
    }

    // face: brows, eyes, nose, mouth, cheeks
    // eyes grow a size with the head: 1x2, 2x3, then 3x4 for the front row
    const big = s >= 30, mid = s >= 22;
    const ey = Math.round(cy + ry * 0.12), ex = Math.max(2, Math.round(rx * 0.4)), eh = big ? 4 : mid ? 3 : 2, ew = big ? 3 : mid ? 2 : 1;
    [-1, 1].forEach(sd => {
        const px = Math.round(cx + sd * ex) - (sd < 0 ? ew - 1 : 0);
        if (blink) p.rect(px - (mid ? 1 : 0), ey + eh - 1, ew + (mid ? 2 : 1), 1, '#2b2b35');
        else {
            p.rect(px, ey, ew, eh, '#2b2b35');
            if (mid) p.set(px + (big ? 1 : 0), ey + (big ? 1 : 0), '#ffffff');
        }
        p.rect(px - (s >= 18 ? 1 : 0), ey - (big ? 4 : mid ? 3 : 2), ew + (s >= 18 ? 2 : 1), big ? 2 : 1, look.style === 'bald' ? shade(look.skin, 0.6) : HAIR_DK);
        if (look.blush) p.rect(Math.round(cx + sd * rx * 0.62) - 1, ey + eh + 1, 2, 1, '#ff9aa8');
        if (look.glasses) {
            const gw = ew + 4, gh = eh + 3;
            p.box(px - 2, ey - 2, gw, gh, '#2b2b35');
        }
    });
    if (look.glasses) p.rect(Math.round(cx) - 1, ey, 2, 1, '#2b2b35');
    const my = Math.round(cy + ry * 0.58), mw = Math.max(2, Math.round(s * (big ? 0.2 : 0.18)));
    p.set(Math.round(cx), Math.round(cy + ry * 0.36), shade(look.skin, 0.8));
    p.rect(Math.round(cx - mw / 2), my, mw, 1, '#a8433e');
    if (look.smile) { p.set(Math.round(cx - mw / 2) - 1, my - 1, '#a8433e'); p.set(Math.round(cx + mw / 2), my - 1, '#a8433e'); }
}

// Adi's Mii, cleaned up by hand from a downscale of the avatar
const ADI_MII = [
    '.........KKKKKKKKKK.........',
    '......KKKHHHHHHHHHHKKK......',
    '.....KHHHHHHHHHHHHHHHHK.....',
    '....KHHHhhhHHHHHHHHHHHHK....',
    '...KHHHhhHHHHHHHHHHHHHHHK...',
    '...KHHHHHHHHHHHHHHHHHHHHK...',
    '..KHHHHHHHHHHHHHHHHHHHHHHK..',
    '..KHHHHHHHHHHHHHHHHHHHHHHK..',
    '.KHHHHHHHHHHHHHHHSHHHHHHHHK.',
    '.KHHHHHHHHHHHHHHSSHHHHHHHHK.',
    '.KHHHHHHHSHHHHHSSSSHHHHHHHK.',
    '.KHHHHHHHSHHHHSSSSSHHHHHHHK.',
    '.KHHHHHHSSHHHSSSSSSSHHHHHHK.',
    '.KHHHHHSSSSHHSSSSSSSSHHHHHK.',
    '.KHHHHSSSSSSHSSSSSSSSSHHHHK.',
    '.KHHHSSSSSSSSSSSSSSSSSSHHHK.',
    '.KHHSSKKSSSSSSSSSSSSKKSSHHK.',
    '.KHHSSSKKKKSSSSSSKKKKSSSHHK.',
    '.KHHSSSSSSSSSSSSSSSSSSSSHHK.',
    '.KHHSSSKKKKKSSSSKKKKKSSSHHK.',
    '.KHHSSSWWKKWSSSSWWKKWSSSHHK.',
    '.KHHSSSSsssSSSSSSsssSSSSHHK.',
    '.KHHSSSSSSSSSSSSSSSSSSSSHHK.',
    '.KHHSSSSSSSSSnSSSSSSSSSSHHK.',
    '.KHHSSSSSSSSSnnSSSSSSSSSHHK.',
    '.KHHsSSSSSSSSSSSSSSSSSSsHHK.',
    '.KHHsSSSSSSSnSSSSSSSSSSsHHK.',
    '.KHHKsSSSSSSnnnnSSSSSSsKHHK.',
    '.KHH.KsSSSSSSSSSSSSSSsK.HHK.',
    '.KH..KssSSSSSSSSSSSSssK..HK.',
    '..K..KKssssssssssssssKK..K..',
    '.......KKssssssssssKK.......',
    '.........KKssssssKK.........',
    '......KKRRRKssssKRRRKK......',
    '.....KRRRRRRKKKKRRRRRRK.....',
    '....KRRRRRRRRRRRRRRRRRRK....',
    '...KRRRRRRRRRRRRRRRRRRRRK...',
    '..KrRRRRRRRRRRRRRRRRRRRRrK..',
    '..KrRRRRRRRRRRRRRRRRRRRRrK..',
];
const ADI_MII_PAL = { K: '#15151b', H: '#2b2b35', h: '#52526c', S: '#ffd6ae', s: '#eab089', n: '#7a4430', W: '#ffffff', R: '#e3261c', r: '#a8150f' };
