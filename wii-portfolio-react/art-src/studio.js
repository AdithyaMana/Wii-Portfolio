// The shared studio for the 3D channel art (Research Agent, Resume,
// BetterPoster): each scene is ray-marched in a WebGL fragment shader at
// full size, 1920x1080 or 1080x1920 with ?v=tall, on a pale backdrop with
// its title set over the render in the Wii's own Rodin. render.py starts
// the browser with WebGL for these, see GL_SCENES there.
//
// A scene writes its geometry (map) and its materials (shade) in GLSL; this
// supplies the rest of the shader round them, the camera, the frame loop
// and the title.
//
// ?still=N renders just frame N, ?aa=1 skips the supersampling,
// ?scale=0.25 renders smaller (the title is then out of place),
// ?notitle leaves the title off, and ?eye=x,y,z&target=x,y,z&zoom=z&
// shift=x,y move the camera, for quick looks while working on a scene.
const params = new URLSearchParams(location.search);
const TALL = params.get('v') === 'tall';
const SCALE = Number(params.get('scale') || 1);
const W = Math.round((TALL ? 1080 : 1920) * SCALE), H = Math.round((TALL ? 1920 : 1080) * SCALE);
const AA = Number(params.get('aa') || 3);
const STILL = params.has('still') ? Number(params.get('still')) : null;

const ease = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const easeBack = x => { x = Math.min(1, Math.max(0, x)); return 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2; };
const glslRect = r => `vec4(${r.map(v => v.toFixed(1)).join(', ')})`;

// ---- the shader, in three parts round the scene's own two

// Before the scene's geometry: the common uniforms, noise and SDF shapes
const GLSL_HEAD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uEye, uTarget;
uniform vec2 uShift;
uniform float uZoom;
uniform int uAA;
uniform sampler2D uAtlas;
out vec4 fragColor;

#define PI 3.14159265

float hash1(float n) { return fract(sin(n * 127.1 + 31.7) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 57.0 + i.z * 113.0;
    return mix(mix(mix(hash1(n), hash1(n + 1.0), f.x), mix(hash1(n + 57.0), hash1(n + 58.0), f.x), f.y),
               mix(mix(hash1(n + 113.0), hash1(n + 114.0), f.x), mix(hash1(n + 170.0), hash1(n + 171.0), f.x), f.y), f.z);
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdRBox(vec3 p, vec3 b, float r) { return sdBox(p, b - r) - r; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float sdCylinder(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdRoundCone(vec3 p, float r1, float r2, float h) {
    vec2 q = vec2(length(p.xz), p.y);
    float b = (r1 - r2) / h, a = sqrt(1.0 - b * b), k = dot(q, vec2(-b, a));
    if (k < 0.0) return length(q) - r1;
    if (k > a * h) return length(q - vec2(0.0, h)) - r2;
    return dot(q, vec2(a, b)) - r1;
}
float sdHexPrism(vec3 p, vec2 h) {
    const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
    p = abs(p);
    p.xy -= 2.0 * min(dot(k.xy, p.xy), 0.0) * k.xy;
    vec2 d = vec2(length(p.xy - vec2(clamp(p.x, -k.z * h.x, k.z * h.x), h.x)) * sign(p.y - h.x), p.z - h.y);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
vec2 U(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
`;

// Between the scene's geometry and its materials: marching, shadows,
// occlusion, the text atlas and the tone curve
const glslTrace = atlasSize => `
vec3 normal(vec3 p) {
    const vec2 e = vec2(0.0006, -0.0006);
    return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}

vec2 march(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 240; i++) {
        vec2 h = map(ro + rd * t);
        if (h.x < 0.00015 * t + 0.0001) return vec2(t, h.y);
        t += h.x;
        if (t > 60.0) break;
    }
    return vec2(-1.0, 0.0);
}

float softShadow(vec3 ro, vec3 rd, float k, float jitter) {
    float res = 1.0, t = 0.01 + 0.02 * jitter;
    for (int i = 0; i < 110; i++) {
        float h = map(ro + rd * t).x;
        res = min(res, k * h / t);
        if (res < 0.002 || t > 9.0) break;
        t += clamp(h, 0.006, 0.08) * (0.8 + 0.4 * jitter);
    }
    res = clamp(res, 0.0, 1.0);
    return res * res * (3.0 - 2.0 * res);
}

float ao(vec3 p, vec3 n) {
    float occ = 0.0, sca = 1.0;
    for (int i = 0; i < 6; i++) {
        float h = 0.01 + 0.06 * float(i);
        occ += (h - map(p + n * h).x) * sca;
        sca *= 0.75;
    }
    return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

// ---- the atlas of typed text
vec4 atlas(vec4 rect, vec2 uv, float lod) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
    return textureLod(uAtlas, (rect.xy + uv * rect.zw) / ${atlasSize.toFixed(1)}, lod);
}
// the mip level for a surface at distance t, seen at an angle, with texels per unit
float lodAt(float t, float facing, float texels) {
    float px = t * 2.0 / (uRes.y * uZoom * float(uAA));
    return clamp(log2(px * texels / max(facing, 0.25)) + 0.3, 0.0, 5.0);
}

// a filmic tone curve, then out to the display
vec3 toDisplay(vec3 col) {
    col *= 0.82;
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    return pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
}
`;

// After the scene's materials: the camera, supersampled
const GLSL_MAIN = `
void main() {
    vec3 ww = normalize(uTarget - uEye);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = cross(uu, ww);
    vec3 acc = vec3(0.0);
    for (int j = 0; j < uAA; j++) {
        for (int i = 0; i < uAA; i++) {
            vec2 o = (vec2(float(i), float(j)) + 0.5) / float(uAA) - 0.5;
            vec2 uv = (2.0 * (gl_FragCoord.xy + o) - uRes) / uRes.y;
            vec2 lens = uv - 2.0 * uShift;
            acc += shade(uEye, normalize(lens.x * uu + lens.y * vv + uZoom * ww), uv, hash2(gl_FragCoord.xy + o * 7.3));
        }
    }
    // a whisper of grain so the gradients don't band
    fragColor = vec4(acc / float(uAA * uAA) + (hash2(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
}`;

const VERT = `#version 300 es
in vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

// The camera's lens is shifted, as on an architectural camera, to set the
// subject beside the title without tilting the view
function viewFrom(view) {
    for (const k of ['eye', 'target', 'zoom', 'shift']) if (params.has(k)) view[k] = params.get(k).split(',').map(Number);
    return view;
}

function setup(frag, view, atlasCanvas) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('no WebGL2: render.py starts the browser with SwiftShader for this scene');
    const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const u = name => gl.getUniformLocation(prog, name);
    gl.uniform1i(u('uAtlas'), 0);
    gl.uniform2f(u('uRes'), W, H);
    gl.uniform3fv(u('uEye'), view.eye);
    gl.uniform3fv(u('uTarget'), view.target);
    gl.uniform2fv(u('uShift'), view.shift);
    gl.uniform1f(u('uZoom'), Number(view.zoom));
    gl.uniform1i(u('uAA'), AA);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.SCISSOR_TEST);

    // the scene's own uniforms, set from each frame's pose by their GLSL type
    const setters = {};
    const SET = { [gl.FLOAT]: 'uniform1fv', [gl.FLOAT_VEC2]: 'uniform2fv', [gl.FLOAT_VEC3]: 'uniform3fv', [gl.FLOAT_VEC4]: 'uniform4fv' };
    for (let i = 0; i < gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i++) {
        const info = gl.getActiveUniform(prog, i), name = info.name.replace(/\[0\]$/, '');
        if (SET[info.type]) setters[name] = v => gl[SET[info.type]](u(name), [v].flat());
    }
    return { gl, canvas, setters };
}

// Where a point of the scene lands on screen (GL's pixels, y up)
function project(view, P) {
    const sub = (a, b) => a.map((v, i) => v - b[i]);
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const norm = a => a.map(v => v / Math.hypot(...a));
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const ww = norm(sub(view.target, view.eye)), uu = norm(cross(ww, [0, 1, 0])), vv = cross(uu, ww);
    const d = sub(P, view.eye), z = dot(d, ww);
    const ux = dot(d, uu) * view.zoom / z + 2 * view.shift[0], uy = dot(d, vv) * view.zoom / z + 2 * view.shift[1];
    return [(ux * H + W) / 2, (uy * H + H) / 2];
}

// The rectangle of the screen a box of the scene covers, with a margin
function screenBox(view, [x0, x1], [y0, y1], [z0, z1]) {
    const xs = [], ys = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
        const [px, py] = project(view, [x, y, z]);
        xs.push(px); ys.push(py);
    }
    const l = Math.max(0, Math.floor(Math.min(...xs)) - 16), b = Math.max(0, Math.floor(Math.min(...ys)) - 16);
    return [l, b, Math.min(W, Math.ceil(Math.max(...xs)) + 16) - l, Math.min(H, Math.ceil(Math.max(...ys)) + 16) - b];
}

// Drawn in tiles, so that no one draw call runs long enough for the
// browser to give up on the GPU
function render({ gl, setters }, pose, areas) {
    for (const [k, v] of Object.entries(pose)) setters[k]?.(v);
    const T = 96;
    for (const [ax, ay, aw, ah] of areas) {
        for (let y = ay; y < ay + ah; y += T) {
            for (let x = ax; x < ax + aw; x += T) {
                gl.scissor(x, y, Math.min(T, ax + aw - x), Math.min(T, ay + ah - y));
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                gl.finish();
            }
        }
    }
}

// ---- the title, in the Wii menu's Rodin: a label in a coloured pill over
// two big lines, on the left of a wide screen or centred over a tall one
function studioTitle(ctx, { label, lines, pill, ink = '#2a3038' }) {
    const x = TALL ? W / 2 : 150, align = TALL ? 'center' : 'left';
    const y0 = TALL ? 290 : 372, size = TALL ? 168 : 158;
    ctx.font = '32px Rodin';
    ctx.letterSpacing = '6px';
    const lw = ctx.measureText(label).width + 52, lx = TALL ? x - lw / 2 : x;
    ctx.fillStyle = pill;
    ctx.beginPath();
    ctx.roundRect(lx, y0 - 50, lw, 64, 32);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(label, lx + 29, y0 - 6);
    ctx.textAlign = align;
    ctx.letterSpacing = '-3px';
    ctx.font = `${size}px Rodin`;
    ctx.fillStyle = ink;
    lines.forEach((line, i) => ctx.fillText(line, x - (TALL ? 0 : 8), y0 + 30 + size * (0.92 + i * 1.06)));
    ctx.letterSpacing = '0px';
}

// Renders every frame and leaves them in <pre id="out"> for render.py.
//   frag    the whole fragment shader (see studioShader)
//   view    the camera: eye, target, zoom and lens shift
//   frames  how many, and delay, ms each; a still scene leaves these out
//   pose(f) frame f's uniforms, by name; frames with the same pose are drawn once
//   moving  the boxes of the scene, [[x0, x1], [y0, y1], [z0, z1]], that the
//           moving parts and their shadows can reach: after the first frame
//           only the screen round them is drawn again
//   atlas   a function returning the canvas of text the shader samples
//   fonts   FontFaces to load first
//   title   draws the title over the render
async function runStudio({ frag, view, frames: count = 1, delay = 1000, pose = () => ({}), moving = [], atlas, fonts = [], title }) {
    const out = document.getElementById('out');
    try {
        for (const f of [new FontFace('Rodin', 'url("../public/fonts/FOT-Rodin%20Pro%20B.otf")'), ...fonts]) document.fonts.add(await f.load());
        const scene = setup(frag, view, await atlas());
        const areas = moving.map(box => screenBox(view, ...box));
        // the patches are looked for in a rectangle round all the areas
        // (a still scene has none, and only its first frame)
        if (!areas.length) areas.push([0, 0, 1, 1]);
        const mx = Math.min(...areas.map(a => a[0])), my = Math.min(...areas.map(a => a[1]));
        const mw = Math.max(...areas.map(a => a[0] + a[2])) - mx, mh = Math.max(...areas.map(a => a[1] + a[3])) - my;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        // The first frame goes out whole. Every one after it goes out as a
        // patch: the pixels that changed since the frame before, which
        // render.py lays over it (often none: a pose can hold still a
        // while). All of them whole would be too much for the browser to
        // hand back.
        const frames = [];
        let last = null, before = null;
        for (let f = 0; f < count; f++) {
            if (STILL !== null && f !== STILL) continue;
            const p = pose(f), key = JSON.stringify(p);
            if (key !== last) {
                render(scene, p, last === null ? [[0, 0, W, H]] : areas);
                ctx.clearRect(0, 0, W, H);
                ctx.drawImage(scene.canvas, 0, 0);
                if (!params.has('notitle')) title(ctx);
            }
            const top = H - my - mh, now = ctx.getImageData(mx, top, mw, mh).data;
            if (!frames.length) {
                frames.push(c.toDataURL('image/png'));
            } else {
                let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
                for (let y = 0; y < mh; y++) {
                    for (let x = 0; x < mw; x++) {
                        const i = (y * mw + x) * 4;
                        if (now[i] === before[i] && now[i + 1] === before[i + 1] && now[i + 2] === before[i + 2]) continue;
                        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
                    }
                }
                if (x1 < 0) {
                    frames.push({ x: 0, y: 0, src: null });
                } else {
                    const patch = document.createElement('canvas');
                    patch.width = x1 - x0 + 1; patch.height = y1 - y0 + 1;
                    patch.getContext('2d').drawImage(c, mx + x0, top + y0, patch.width, patch.height, 0, 0, patch.width, patch.height);
                    frames.push({ x: mx + x0, y: top + y0, src: patch.toDataURL('image/png') });
                }
            }
            last = key;
            before = now;
        }
        out.textContent = JSON.stringify({ frames, delay });
    } catch (e) {
        out.textContent = JSON.stringify({ error: String(e && e.stack || e) });
    }
}

// The whole fragment shader from a scene's parts: its own uniforms and
// constants, its geometry (ending in map), and its materials (shade)
function studioShader({ head = '', geometry, materials, atlasSize = 2048 }) {
    return GLSL_HEAD + head + geometry + glslTrace(atlasSize) + materials + GLSL_MAIN;
}
