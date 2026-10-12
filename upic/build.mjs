import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 420;
const AZ = 40;

// ── world plan (z up, desk top at 0) ──
const DESK = { x: -134, y: -124, w: 290, d: 216, r: 8 };
const DESK_H = 8;
const FOOT_H = 5;
const TABLET = { x: -118, y: -36, w: 176, d: 106, r: 4 };
const TAB_H = 5;
const PAGE = { x: -106, y: -26, w: 152, d: 84, r: 1.5 };
const PAGE_Z = TAB_H + 0.5;
const U0 = PAGE.x + 2;
const U_SPAN = PAGE.w - 4;
const V0 = PAGE.y + PAGE.d - 2; // low pitch, near the composer
const V_SPAN = PAGE.d - 4;
const RAILS = [-46, 76];
const RAIL_X = [-124, 64];
const BEAM_Z = 19;
const BEAM_H = 4;
const RACK = { x: -118, y: -114, w: 182, d: 58, r: 4 };
const RACK_H = 6;
const DISCS = [-84, -26, 32].map((x) => [x, -88]);
const DISC_R = 17;
const DISC_TOP = RACK_H + 6;
const ENGRAVE = [9.5, 5.5];
const FADER = { y: -110, d: 40 };
const BUS_Y = -60;
const OUT = { x: 82, y: -116, w: 62, d: 42, r: 3 };
const OUT_H = 40;
const SPK = { x: 90, y: 14, w: 56, d: 56, r: 4 };
const SPK_H = 22;
const SPK_C = [SPK.x + SPK.w / 2, SPK.y + SPK.d / 2];
const VOICES = ["red", "green", "blue"];
const LETTERS = ["A", "B", "C"];

const xOfU = (u) => U0 + U_SPAN * u;
const yOfV = (v) => V0 - V_SPAN * v;

const P = k.fitProjection(
  [...k.boxCorners(DESK, -DESK_H - FOOT_H, 0), ...k.boxCorners(OUT, 0, OUT_H + 6), [RAIL_X[0], RAILS[0], BEAM_Z + BEAM_H + 4]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screws = (plan, inset, z, ring = 1.6) => {
  const c = k.corners(plan, inset);
  return L(c.map(([x, y]) => k.ring(x, y, ring, z, P, 14)).join(""), { tone: "lo" }) + D(c.map(([x, y]) => at([x, y, z])), { size: 0.45 });
};

// ── desk ──
function desk() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DESK, -DESK_H - FOOT_H, DESK_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(DESK, 20))) {
    out.push(S(k.cylinder(x, y, 7, -DESK_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -DESK_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(DESK, -DESK_H, DESK_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(DESK, -3, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 5), 0, P), { tone: "faint" }));
  out.push(screws(DESK, 10, 0, 2.2));
  return out.join("");
}

// ── oscillator rack: three wavetable drums, read heads, faders, summing bus ──
const engraved = (cx, cy, table, turn) => {
  const pts = [];
  const n = 120;
  for (let i = 0; i < n; i++) {
    const phase = i / n;
    const r = ENGRAVE[0] + ENGRAVE[1] * M.lookup(table, phase);
    // angle 0 points at the read head (+y); the drum turns so later phases arrive under it
    const a = (phase - turn) * 2 * Math.PI;
    pts.push([cx + Math.sin(a) * r, cy + Math.cos(a) * r]);
  }
  return k.onTop(pts, DISC_TOP + 0.05, P, true);
};

const TABLES0 = [0, 1, 2].map((i) => M.tableOf(M.WAVES[i]));

function rack() {
  const out = [];
  out.push(S(k.slabOf(RACK, 0, RACK_H, P, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(RACK, 2, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(RACK, 3.5), RACK_H, P, 6), { tone: "faint" }));
  out.push(screws(RACK, 7, RACK_H));
  // summing bus along the front of the rack
  const bus = { x: RACK.x + 12, y: BUS_Y - 1.4, w: RACK.w - 12, d: 2.8, r: 1 };
  DISCS.forEach(([cx, cy], i) => {
    // drum: base collar, platter, knurled rim, engraved waveform (live), hub
    out.push(S(k.cylinder(cx, cy, DISC_R + 2, RACK_H, 1.6, P, 48), { tone: "lo" }));
    out.push(
      S(k.cylinder(cx, cy, DISC_R, RACK_H + 1.6, DISC_TOP - RACK_H - 1.6, P, 64, 0.6), {
        tone: "hi",
        crease: "lo",
        inner: L(k.knurl(cx, cy, DISC_R, RACK_H + 1.6, DISC_TOP - 1.2, 64, P, 0.3), { tone: "faint" }) + L(k.sideArc(cx, cy, DISC_R, DISC_TOP - 1.2, P, 40), { tone: "faint" }),
      }),
    );
    out.push(L(k.ring(cx, cy, DISC_R - 1.4, DISC_TOP, P, 64), { tone: "lo" }));
    out.push(L(k.ring(cx, cy, ENGRAVE[0], DISC_TOP, P, 48), { tone: "faint" }));
    out.push(`<path data-part="wave-${i}" class="iso-line" data-tone="${VOICES[i]}" d="${engraved(cx, cy, TABLES0[i], 0)}"/>`);
    out.push(S(k.cylinder(cx, cy, 2.2, DISC_TOP, 1.4, P, 20), { tone: "mid" }));
    out.push(D([at([cx, cy, DISC_TOP + 1.4])], { size: 0.5, tone: "hi" }));
    out.push(`<path data-part="sel-${i}" class="iso-line up-sel" data-tone="${VOICES[i]}" d="${k.ring(cx, cy, DISC_R + 4.2, RACK_H, P, 72)}"/>`);
    // read head: post, arm over the drum, stylus (live)
    const hp = [cx, cy + DISC_R + 4];
    out.push(S(k.cylinder(hp[0], hp[1], 3, RACK_H, 1.4, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(hp[0], hp[1], 2.2, RACK_H + 1.4, 8, P, 20), { tone: "mid", inner: L(k.sideArc(hp[0], hp[1], 2.2, RACK_H + 5, P, 12), { tone: "faint" }) }));
    // the arm reaches in over the platter to the band the engraved line sweeps
    out.push(S(k.slabOf({ x: cx - 0.9, y: cy + ENGRAVE[0] - ENGRAVE[1], w: 1.8, d: hp[1] - cy - ENGRAVE[0] + ENGRAVE[1], r: 0.9 }, RACK_H + 9.6, 1.2, P, 3), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(hp[0], hp[1], 2.6, RACK_H + 9.4, 1.6, P, 20), { tone: "mid" }));
    out.push(`<g data-part="stylus-${i}">${L(k.rise([cx, cy + ENGRAVE[0]], DISC_TOP + 0.1, RACK_H + 9.6, P), { tone: "hi" })}${D([at([cx, cy + ENGRAVE[0], DISC_TOP + 0.1])], { size: 1.1, tone: "hi" })}</g>`);
    // fader: slotted plate, ticks hanging from its edge, knob (live)
    const fp = { x: cx + 22, y: FADER.y, w: 9, d: FADER.d, r: 1.2 };
    out.push(S(k.slabOf(fp, RACK_H, 1, P, 3), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline({ x: fp.x + 3.6, y: fp.y + 3, w: 1.8, d: fp.d - 6, r: 0.9 }, RACK_H + 1, P, 3), { tone: "lo" }));
    const t = k.topTicks(fp.y + 4, fp.y + fp.d - 4, 3.2, 5, fp.x + 0.6, RACK_H + 1, [1.4, 2.6], P, "y");
    out.push(L(t.minor, { tone: "faint" }), L(t.major, { tone: "lo" }));
    out.push(D([at([fp.x + fp.w / 2, fp.y + 1.4, RACK_H + 1]), at([fp.x + fp.w / 2, fp.y + fp.d - 1.4, RACK_H + 1])], { size: 0.4 }));
    out.push(
      `<g data-part="knob-${i}">${S(k.slabOf({ x: fp.x + 1, y: fp.y + fp.d - 9, w: 7, d: 5, r: 1.2 }, RACK_H + 1, 3, P, 3, 0.4), { tone: "mid" })}${L(k.lineOnTop([fp.x + 1, fp.y + fp.d - 6.5], [fp.x + 8, fp.y + fp.d - 6.5], RACK_H + 4, P), { tone: VOICES[i] })}</g>`,
    );
    // lead from the head to the bus
    out.push(k.wireSvg(at([hp[0], hp[1] + 2.2, RACK_H + 3]), at([hp[0], BUS_Y - 1.4, RACK_H + 1.6]), { via: [at([hp[0], hp[1] + 3.6, RACK_H])], tone: "lo", size: 0.8 }));
  });
  out.push(S(k.slabOf(bus, RACK_H, 1.6, P, 3, 0.3), { tone: "mid" }));
  out.push(D([bus.x + 3, ...DISCS.map(([x]) => x + 12), bus.x + bus.w - 3].map((x) => at([x, BUS_Y, RACK_H + 1.6])), { size: 0.4 }));
  return out.join("");
}

// ── output: summing amplifier with vector display, and speaker ──
const SCREEN = { x: 7, z: 6, w: 48, h: 22, r: 2.5 };
const SCREEN_FACE = [OUT.x, OUT.y + OUT.d];
function output() {
  const out = [];
  const jacks = [OUT.x + 8, OUT.x + 40];
  out.push(S(k.slabOf({ x: OUT.x - 2, y: OUT.y - 2, w: OUT.w + 4, d: OUT.d + 4, r: 4 }, 0, 2, P, 6), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(OUT, 2, OUT_H - 2, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(OUT, 10, P, 6), { tone: "faint" }) + L(k.sideSeam(OUT, OUT_H - 6, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(OUT, 3), OUT_H, P, 6), { tone: "faint" }));
  out.push(screws(OUT, 6, OUT_H, 1.4));
  // vents on top
  for (let i = 0; i < 5; i++) out.push(L(k.planOutline({ x: OUT.x + 8 + i * 4.4, y: OUT.y + 8, w: 1.8, d: 24, r: 0.9 }, OUT_H, P, 3), { tone: "lo" }));
  for (const x of jacks) out.push(S(k.slabOf({ x: x - 2, y: OUT.y + OUT.d, w: 4, d: 1.6, r: 0.6 }, 3.5, 3, P, 2), { tone: "lo", crease: "none" }));
  out.push(k.wireSvg(at([RACK.x + RACK.w - 1.5, BUS_Y, RACK_H + 1.6]), at([jacks[0], OUT.y + OUT.d + 1.6, 5]), { via: [at([RACK.x + RACK.w + 2, BUS_Y, 0.2]), at([jacks[0], BUS_Y, 0.2]), at([jacks[0], OUT.y + OUT.d + 3, 0.2])], tone: "lo", size: 0.8 }));
  // knobs: level and page rate
  for (const [x, y] of byDepth([[OUT.x + 40, OUT.y + 14], [OUT.x + 52, OUT.y + 28]])) {
    out.push(S(k.cylinder(x, y, 6, OUT_H, 1, P, 32), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, OUT_H + 1, 4, P, 32), { tone: "mid", inner: L(k.knurl(x, y, 4.6, OUT_H + 1, OUT_H + 5, 30, P), { tone: "lo" }) }));
    out.push(L(k.lineOnTop([x, y], [x + 2.4, y + 3.2], OUT_H + 5, P), { tone: "hi" }));
    const t = k.radialTicks(x, y, 7.4, 11, 5, OUT_H, [0.9, 1.6], P, -Math.PI * 0.75, Math.PI * 1.5);
    out.push(L(t.minor, { tone: "faint" }), L(t.major, { tone: "lo" }));
  }
  // vector display on the front face
  const m = k.sideMatrix(SCREEN_FACE, OUT_H, P, "left");
  const s = SCREEN;
  const rr = (o, x, y, w, h, r) => `<rect x="${x - o}" y="${y - o}" width="${w + 2 * o}" height="${h + 2 * o}" rx="${r + o}"/>`;
  out.push(
    `<g transform="${m}" class="up-screen">` +
      `<g class="up-bezel">${rr(2.2, s.x, s.z, s.w, s.h, s.r)}</g>` +
      `<clipPath id="up-screen-clip">${rr(0, s.x, s.z, s.w, s.h, s.r)}</clipPath>` +
      `<g clip-path="url(#up-screen-clip)">${rr(0, s.x, s.z, s.w, s.h, s.r).replace("<rect", '<rect class="up-glass"')}` +
      `<path class="up-recess" d="M${s.x} ${s.z} h${s.w} l-1.6 1.6 h${-s.w + 3.2} v${s.h - 3.2} l-1.6 1.6 z"/>` +
      Array.from({ length: 7 }, (_, i) => `<line class="up-grat" x1="${s.x + ((i + 1) * s.w) / 8}" y1="${s.z}" x2="${s.x + ((i + 1) * s.w) / 8}" y2="${s.z + s.h}"/>`).join("") +
      Array.from({ length: 3 }, (_, i) => `<line class="up-grat" x1="${s.x}" y1="${s.z + ((i + 1) * s.h) / 4}" x2="${s.x + s.w}" y2="${s.z + ((i + 1) * s.h) / 4}"/>`).join("") +
      `<path data-part="trace" class="up-trace" d=""/></g>` +
      `<g class="up-bezel-line">${rr(0, s.x, s.z, s.w, s.h, s.r)}</g>` +
      `<g class="up-bezel-line up-faint">${rr(2.2, s.x, s.z, s.w, s.h, s.r)}</g>` +
      [[s.x - 0.4, s.z + s.h + 6], [s.x + s.w + 0.4, s.z + s.h + 6]].map(([x, y]) => `<circle class="up-screw" cx="${x}" cy="${y}" r="0.5"/>`).join("") +
      `<text class="iso-face-text" data-tone="lo" x="${s.x + s.w / 2}" y="${s.z + s.h + 7}" font-size="3" text-anchor="middle">UPIC</text>` +
      `</g>`,
  );
  return out.join("");
}

function speaker() {
  const out = [];
  const [cx, cy] = SPK_C;
  out.push(k.wireSvg(at([OUT.x + 40, OUT.y + OUT.d + 1.6, 5]), at([OUT.x + 40, SPK.y, 5]), { via: [at([OUT.x + 40, OUT.y + OUT.d + 3, 0.2]), at([OUT.x + 40, SPK.y - 3, 0.2])], tone: "lo", size: 0.8 }));
  out.push(`<path class="iso-halo" d="${k.haloOf(SPK, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(SPK, 0, SPK_H, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(SPK, 4, P, 6), { tone: "faint" }) }));
  out.push(screws(SPK, 5, SPK_H, 1.4));
  out.push(S(k.cylinder(cx, cy, 23, SPK_H, 1.2, P, 64), { tone: "lo" }));
  out.push(L([20.5, 18].map((r) => k.ring(cx, cy, r, SPK_H + 1.2, P, 64)).join(""), { tone: "lo" }));
  out.push(`<g data-part="cone">${L(k.ring(cx, cy, 13, SPK_H + 1.2, P, 56), { tone: "mid" })}${L(k.ring(cx, cy, 8, SPK_H + 1.2, P, 48), { tone: "lo" })}</g>`);
  out.push(S(k.cylinder(cx, cy, 4, SPK_H + 1.2, 1.2, P, 28), { tone: "hi" }));
  return out.join("");
}

// ── tablet: the page with its arcs, rulers, pen ──
const arcD = (arc) => k.onTop(arc.map(([u, v]) => [xOfU(u), yOfV(v)]), PAGE_Z + 0.05, P);
const ARCS0 = M.defaultArcs();
function tablet() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(TABLET, 0, 0.1, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.slabOf(TABLET, 0, TAB_H, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(TABLET, 2, P, 6), { tone: "faint" }) }));
  out.push(screws(TABLET, 5, TAB_H, 1.4));
  // the drawing sheet, a hair proud of the tablet
  out.push(S(k.slabOf(PAGE, TAB_H, 0.5, P, 3), { tone: "hi", crease: "none", className: "up-page" }));
  // page grid: one line per second, one per octave, edge to edge
  for (let i = 1; i < M.PAGE_SECONDS; i++) out.push(L(k.lineOnTop([xOfU(i / M.PAGE_SECONDS), PAGE.y], [xOfU(i / M.PAGE_SECONDS), PAGE.y + PAGE.d], PAGE_Z, P), { tone: "faint" }));
  for (let i = 1; i < M.OCTAVES; i++) out.push(L(k.lineOnTop([PAGE.x, yOfV(i / M.OCTAVES)], [PAGE.x + PAGE.w, yOfV(i / M.OCTAVES)], PAGE_Z, P), { tone: "faint" }));
  // time ruler along the near margin: a tick every half second, major every second
  const tr = { x: PAGE.x, y: PAGE.y + PAGE.d + 2, w: PAGE.w, d: 5, r: 0.8 };
  out.push(S(k.slabOf(tr, TAB_H, 0.5, P, 3), { tone: "lo", crease: "none" }));
  const tt = k.topTicks(xOfU(0), xOfU(1) + 0.01, U_SPAN / 16, 2, tr.y + 0.2, PAGE_Z, [1.6, 3], P);
  out.push(L(tt.minor, { tone: "lo" }), L(tt.major, { tone: "mid" }));
  // pitch ruler along the left margin: a tick every semitone, major every octave
  const pr = { x: PAGE.x - 7, y: PAGE.y, w: 5, d: PAGE.d, r: 0.8 };
  out.push(S(k.slabOf(pr, TAB_H, 0.5, P, 3), { tone: "lo", crease: "none" }));
  const pt = k.topTicks(yOfV(1) - 0.01, yOfV(0) + 0.01, V_SPAN / (12 * M.OCTAVES), 12, pr.x + pr.w - 0.2, PAGE_Z, [-1.2, -2.8], P, "y");
  out.push(L(pt.minor, { tone: "faint" }), L(pt.major, { tone: "mid" }));
  // arcs: drawn lines on the page, each with pen-down and pen-up dots
  ARCS0.forEach((arc, i) => {
    out.push(`<path data-part="arc-${i}" class="iso-line up-arc" data-tone="${VOICES[i]}" d="${arcD(arc)}"/>`);
    out.push(`<g data-part="ends-${i}" class="up-ends" data-tone="${VOICES[i]}">${[arc[0], arc[arc.length - 1]].map(([u, v]) => { const [x, y] = at([xOfU(u), yOfV(v), PAGE_Z]); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1"/>`; }).join("")}</g>`);
  });
  out.push(`<path data-part="ink" class="iso-line up-arc" data-tone="hi" d=""/>`);
  // pen tray and electromagnetic pen on the far margin
  const tray = { x: PAGE.x + 70, y: TABLET.y + 2.5, w: 70, d: 6, r: 2 };
  out.push(S(k.slabOf(tray, TAB_H, 0.6, P, 4), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: tray.x + 6, y: tray.y + 1.4, w: 46, d: 3.2, r: 1.6 }, TAB_H + 0.6, 2.6, P, 4, 0.3), { tone: "hi" }));
  out.push(S(k.slabOf({ x: tray.x + 2, y: tray.y + 2.3, w: 4.4, d: 1.4, r: 0.7 }, TAB_H + 0.6, 1.4, P, 3), { tone: "mid", crease: "none" }));
  out.push(L(k.sideSeam({ x: tray.x + 6, y: tray.y + 1.4, w: 46, d: 3.2, r: 1.6 }, TAB_H + 2, P, 4), { tone: "faint" }));
  out.push(k.wireSvg(at([tray.x + 52, tray.y + 3, TAB_H + 1.6]), at([TABLET.x + TABLET.w - 6, TABLET.y + 3, TAB_H]), { via: [at([tray.x + 60, tray.y + 3, TAB_H + 0.7])], tone: "lo", size: 0.7 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of RAILS) {
    out.push(S(k.slabOf({ x: RAIL_X[0], y: y - 2.5, w: RAIL_X[1] - RAIL_X[0], d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_X[0] + 8, (RAIL_X[0] + RAIL_X[1]) / 2, RAIL_X[1] - 8].map((x) => at([x, y, 3])), { size: 0.4 }));
    for (const x of [RAIL_X[0] - 5, RAIL_X[1]]) {
      out.push(S(k.slabOf({ x, y: y - 4.5, w: 5, d: 9, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
      out.push(D([at([x + 2.5, y, 7])], { size: 0.45 }));
    }
  }
  return out.join("");
}

// ── gantry: the reading bar that sweeps the page at the speed of time ──
function gantryUnder() {
  // on the page, beneath the beam: the now-line and one reading ring per arc
  const out = [L(k.lineOnTop([0, PAGE.y], [0, PAGE.y + PAGE.d], PAGE_Z + 0.1, P), { tone: "lit" })];
  VOICES.forEach((tone, i) => {
    const [x, y] = at([0, 0, PAGE_Z + 0.1]);
    out.push(`<g data-part="ring-${i}" class="up-ring" data-tone="${tone}"><path d="${k.ring(0, 0, 2.4, PAGE_Z + 0.1, P, 20)}"/><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.7"/></g>`);
  });
  return out.join("");
}
function gantryFrame() {
  const out = [];
  for (const y of RAILS) {
    out.push(S(k.slabOf({ x: -7, y: y - 4, w: 14, d: 8, r: 1.6 }, 3, 4, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([-4.5, y, 7]), at([4.5, y, 7])], { size: 0.4 }));
    out.push(S(k.slabOf({ x: -2.5, y: y - 2.5, w: 5, d: 5, r: 1 }, 7, BEAM_Z - 7, P, 3), { tone: "mid", inner: L(k.sideSeam({ x: -2.5, y: y - 2.5, w: 5, d: 5, r: 1 }, 12, P, 3), { tone: "faint" }) }));
  }
  const beam = { x: -3, y: RAILS[0] - 3.5, w: 6, d: RAILS[1] - RAILS[0] + 7, r: 1.2 };
  out.push(S(k.slabOf(beam, BEAM_Z, BEAM_H, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([0, beam.y], [0, beam.y + beam.d], BEAM_Z + BEAM_H, P), { tone: "faint" }));
  out.push(D([RAILS[0], RAILS[1]].map((y) => at([0, y, BEAM_Z + BEAM_H])), { size: 0.45 }));
  // knurled handwheel at the near end, for scrubbing by hand
  out.push(S(k.slabOf({ x: -1.4, y: RAILS[1] + 3.5, w: 2.8, d: 3, r: 0.8 }, BEAM_Z + 0.6, 2.8, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: -4, y: RAILS[1] + 6.5, w: 8, d: 2.6, r: 1.2 }, BEAM_Z - 1.6, 6, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}
function slider(i) {
  return S(k.slabOf({ x: -4, y: -2.6, w: 8, d: 5.2, r: 1.2 }, BEAM_Z + BEAM_H, 2.4, P, 3, 0.4), { tone: "hi", crease: "lo" }) + L(k.lineOnTop([-4, 0], [4, 0], BEAM_Z + BEAM_H + 2.4, P), { tone: VOICES[i] });
}

const startX = xOfU(0);
const gantry =
  `<g data-part="gantry" transform="${k.translateAlong(P, [startX, 0, 0])}">` +
  gantryUnder() +
  gantryFrame() +
  VOICES.map((_, i) => `<g data-part="slider-${i}" transform="${k.translateAlong(P, [0, -400, 0])}">${slider(i)}</g>`).join("") +
  `</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A UPIC workstation as a bench instrument. A drawing tablet holds a page with three hand-drawn lines: time runs left to right over 8 seconds, pitch runs up the page over three octaves. A gantry sweeps across the page; where its reading bar crosses each line, a slider takes the line's height. Behind the tablet, three drums carry one hand-drawn period of each voice's waveform and turn at a speed set by that height; faders show each voice's envelope; a bus sums the voices into an amplifier with a vector display and a speaker.",
  body: [desk(), rack(), output(), rails(), tablet(), gantry, speaker()],
});

const CSS = `
.up-stage{position:relative;outline:none;touch-action:none;cursor:crosshair}
.up-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.up-ends circle,.up-ring circle{stroke:none}
.up-ends[data-tone="red"] circle,.up-ring[data-tone="red"] circle{fill:var(--anatomy-red)}
.up-ends[data-tone="green"] circle,.up-ring[data-tone="green"] circle{fill:var(--anatomy-green)}
.up-ends[data-tone="blue"] circle,.up-ring[data-tone="blue"] circle{fill:var(--anatomy-blue)}
.up-ring path{fill:none;stroke-width:.8;vector-effect:non-scaling-stroke}
.up-ring[data-tone="red"] path{stroke:var(--anatomy-red)}
.up-ring[data-tone="green"] path{stroke:var(--anatomy-green)}
.up-ring[data-tone="blue"] path{stroke:var(--anatomy-blue)}
.up-ring[data-off] {opacity:0}
.up-ring{transition:opacity .25s}
.up-arc{stroke-width:1.15;stroke-linejoin:round;stroke-linecap:round}
.up-sel{stroke-dasharray:1.2 1.8;transition:opacity .3s}
.up-bezel rect{fill:var(--anatomy-shade-1,var(--anatomy-face))}
.up-glass{fill:#0b1210}
.up-recess{fill:#000;opacity:.45}
.up-grat{stroke:#1f3a2e;stroke-width:.3}
.up-trace{fill:none;stroke:#7dffb2;stroke-width:.7;stroke-linejoin:round;filter:drop-shadow(0 0 1.2px #3dff8e)}
.up-bezel-line rect{fill:none;stroke:var(--anatomy-lo);stroke-width:.6;vector-effect:non-scaling-stroke}
.up-bezel-line.up-faint rect{stroke:var(--anatomy-faint)}
.up-screw{fill:var(--anatomy-dot);opacity:.45}
.iso[data-theme="light"] .up-glass{fill:#14201b}
.up-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.up-controls button{font:12px/1 ui-sans-serif,system-ui,sans-serif;color:var(--anatomy-text);background:transparent;border:1px solid var(--anatomy-faint);border-radius:999px;padding:7px 12px;cursor:pointer}
.up-controls button:hover{border-color:var(--anatomy-muted)}
.up-controls button[aria-pressed="true"]{border-color:var(--anatomy-text)}
.up-controls .up-wave{display:inline-flex;align-items:center;gap:6px}
.up-controls .up-wave i{width:8px;height:8px;border-radius:50%;display:inline-block}
`;

const live = `
${strip("model.mjs")}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify({ U0, U_SPAN, V0, V_SPAN, PAGE_Z, DISCS, DISC_TOP, ENGRAVE, RACK_H, FADER, SCREEN, SPK_C, SPK_H, PAGE, startX })};
const xOfU = (u) => C.U0 + C.U_SPAN * u;
const yOfV = (v) => C.V0 - C.V_SPAN * v;
const engraved = ${engraved.toString().replace(/k\./g, "").replace(/M\./g, "").replace(/DISC_TOP/g, "C.DISC_TOP").replace(/ENGRAVE/g, "C.ENGRAVE")};
const arcD = (arc) => onTop(arc.map(([u, v]) => [xOfU(u), yOfV(v)]), C.PAGE_Z + 0.05, P);
const LETTERS = ${JSON.stringify(LETTERS)};
const stage = document.querySelector(".up-stage");
const svg = stage.querySelector("svg");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const gantry = $("gantry"), trace = $("trace"), cone = $("cone"), ink = $("ink");
const V = [0, 1, 2].map((i) => ({ arc: $("arc-" + i), ends: $("ends-" + i), wave: $("wave-" + i), stylus: $("stylus-" + i), knob: $("knob-" + i), ring: $("ring-" + i), slider: $("slider-" + i), sel: $("sel-" + i) }));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

let arcs = defaultArcs();
let waveIx = [0, 1, 2];
let tables = waveIx.map((w) => tableOf(WAVES[w]));
let selected = 0;
let u = 0, playing = !still.matches, turn = [0, 0, 0], amps = [0, 0, 0], level = 0;
let frame = 0, last = 0, visible = false, drawing = null;

// ── sound: one oscillator per arc, its wave built from the drawn table ──
let audio = null;
function waveFor(i) {
  const { real, imag } = harmonicsOf(tables[i]);
  // the table is a sum of sines and cosines; Web Audio wants cos (real) and sin (imag) terms
  return audio.ctx.createPeriodicWave(real, imag, { disableNormalization: true });
}
function startAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  const voices = [0, 1, 2].map(() => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); gain.gain.value = 0; osc.connect(gain).connect(master); osc.start(); return { osc, gain }; });
  audio = { ctx, master, voices };
  voices.forEach((v, i) => v.osc.setPeriodicWave(waveFor(i)));
}
function soundAt(state) {
  if (!audio) return;
  const t = audio.ctx.currentTime;
  state.forEach((s, i) => {
    const v = audio.voices[i];
    if (s.on) v.osc.frequency.setTargetAtTime(s.f, t, 0.012);
    v.gain.gain.setTargetAtTime(playing && s.on ? s.amp / 3 : 0, t, 0.02);
  });
}

// ── drawing on the page: the pointer lands on the tablet plane ──
function toPage(event) {
  const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const { sinA, cosA, sinE, cosE, k: K } = cameraOf(P);
  const X = (pt.x - P.origin[0]) / K;
  const Y = ((pt.y - P.origin[1]) / K + C.PAGE_Z * cosE) / sinE;
  const x = X * sinA + Y * cosA;
  const y = -X * cosA + Y * sinA;
  return [(x - C.U0) / C.U_SPAN, (C.V0 - y) / C.V_SPAN];
}
const onPage = ([pu, pv]) => pu >= -0.02 && pu <= 1.02 && pv >= -0.03 && pv <= 1.03;

stage.addEventListener("pointerdown", (event) => {
  const p = toPage(event);
  if (!onPage(p)) {
    const hit = pickDisc(event);
    if (hit >= 0) { selected = hit; cycleWave(hit); }
    return;
  }
  event.preventDefault();
  stage.setPointerCapture(event.pointerId);
  drawing = [[clamp(p[0], 0, 1), clamp(p[1], 0, 1)]];
  ink.setAttribute("data-tone", ["red", "green", "blue"][selected]);
  ink.setAttribute("d", "");
  run();
});
stage.addEventListener("pointermove", (event) => {
  if (!drawing) return;
  const [pu, pv] = toPage(event);
  const lastU = drawing[drawing.length - 1][0];
  // an arc is pitch as a function of time, so the pen may only move forward in time
  if (pu > lastU + 0.003) drawing.push([clamp(pu, 0, 1), clamp(pv, 0, 1)]);
  ink.setAttribute("d", arcD(drawing));
});
const finish = () => {
  if (!drawing) return;
  if (drawing.length > 2 && drawing[drawing.length - 1][0] - drawing[0][0] > 0.03) {
    arcs[selected] = drawing;
    paintArc(selected);
    say("arc " + LETTERS[selected] + " redrawn");
    selected = (selected + 1) % 3;
  }
  drawing = null;
  ink.setAttribute("d", "");
  run();
};
stage.addEventListener("pointerup", finish);
stage.addEventListener("pointercancel", finish);

function pickDisc(event) {
  const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  let best = -1, dist = 1e9;
  C.DISCS.forEach(([x, y], i) => { const [sx, sy] = iso([x, y, C.DISC_TOP], P); const d = Math.hypot(sx - pt.x, sy - pt.y); if (d < dist) { dist = d; best = i; } });
  return dist < 30 * P.scale ? best : -1;
}
function cycleWave(i) {
  waveIx[i] = (waveIx[i] + 1) % WAVES.length;
  tables[i] = tableOf(WAVES[waveIx[i]]);
  if (audio) audio.voices[i].osc.setPeriodicWave(waveFor(i));
  say("voice " + LETTERS[i] + " waveform: " + WAVES[waveIx[i]].name);
  syncButtons();
  run();
}
function paintArc(i) {
  const arc = arcs[i];
  V[i].arc.setAttribute("d", arcD(arc));
  const pts = [arc[0], arc[arc.length - 1]].map(([pu, pv]) => iso([xOfU(pu), yOfV(pv), C.PAGE_Z], P));
  V[i].ends.innerHTML = pts.map(([x, y]) => '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1"/>').join("");
}

// ── draw one moment ──
let lastText = "";
function draw(state) {
  gantry.setAttribute("transform", translateAlong(P, [xOfU(u), 0, 0]));
  state.forEach((s, i) => {
    const v = V[i];
    const y = s.on ? yOfV(s.v) : -400;
    v.slider.setAttribute("transform", translateAlong(P, [0, y, 0]));
    v.ring.setAttribute("transform", translateAlong(P, [0, s.on ? y : 0, 0]));
    if (s.on) v.ring.removeAttribute("data-off"); else v.ring.setAttribute("data-off", "");
    const [cx, cy] = C.DISCS[i];
    v.wave.setAttribute("d", engraved(cx, cy, tables[i], turn[i]));
    // the stylus sits where the engraved line passes under the head
    const r = C.ENGRAVE[0] + C.ENGRAVE[1] * lookup(tables[i], turn[i]);
    const [sx, sy] = iso([cx, cy + r, C.DISC_TOP + 0.1], P);
    const [bx, by] = iso([cx, cy + C.ENGRAVE[0], C.DISC_TOP + 0.1], P);
    v.stylus.setAttribute("transform", "translate(" + (sx - bx).toFixed(2) + " " + (sy - by).toFixed(2) + ")");
    v.knob.setAttribute("transform", translateAlong(P, [0, -(C.FADER.d - 14) * (1 - amps[i]), 0]));
    v.sel.style.opacity = i === selected ? "1" : "0";
  });
  // vector display: a 12 ms window of the summed output, drawn in the plane of the screen
  const W = C.SCREEN, n = 220, span = 0.012;
  let d = "";
  for (let j = 0; j <= n; j++) {
    const tau = (j / n) * span;
    let y = 0;
    state.forEach((s, i) => { if (s.on) y += (amps[i] / 3) * lookup(tables[i], s.f * tau); });
    const px = W.x + (j / n) * W.w;
    const py = W.z + W.h / 2 - y * (W.h * 0.44);
    d += (j ? "L" : "M") + px.toFixed(2) + " " + py.toFixed(2);
  }
  trace.setAttribute("d", d);
  cone.setAttribute("transform", translateAlong(P, [0, 0, level * 1.6]));
  const t = (u * PAGE_SECONDS).toFixed(1).padStart(4, " ");
  const text = t + " s · " + state.map((s, i) => LETTERS[i] + " " + (s.on ? Math.round(s.f) + " Hz" : "—")).join(" · ");
  if (text !== lastText) { readout.textContent = text; lastText = text; }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (playing && !drawing) u = (u + dt / PAGE_SECONDS) % 1;
  const state = voicesAt(arcs, u);
  state.forEach((s, i) => {
    // the drums turn at 1/SPIN of the true rate so the eye can follow them
    if (s.on && playing) turn[i] = (turn[i] + (s.f / SPIN) * dt) % 1;
    const want = s.on ? s.amp : 0;
    amps[i] = still.matches ? want : amps[i] + (want - amps[i]) * (1 - Math.exp(-dt / 0.03));
  });
  const sum = amps.reduce((a, b) => a + b, 0) / 3;
  level = playing ? sum * (0.6 + 0.4 * Math.sin(now / 1000 * 2 * Math.PI * 6)) : 0;
  soundAt(state);
  draw(state);
  frame = visible && (playing || drawing) ? requestAnimationFrame(tick) : 0;
  if (!frame) { last = 0; soundAt(state.map((s) => ({ ...s, on: false }))); }
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

// ── controls ──
const live = document.querySelector("[data-live]");
const say = (text) => { live.textContent = text; };
const btn = (name) => document.querySelector('[data-act="' + name + '"]');
function syncButtons() {
  btn("play").textContent = playing ? "Pause" : "Play";
  btn("play").setAttribute("aria-pressed", String(playing));
  btn("sound").textContent = audio && audio.ctx.state === "running" ? "Sound on" : "Sound off";
  btn("sound").setAttribute("aria-pressed", String(!!audio && audio.ctx.state === "running"));
  [0, 1, 2].forEach((i) => { const b = btn("wave-" + i); b.querySelector("span").textContent = LETTERS[i] + ": " + WAVES[waveIx[i]].name; b.setAttribute("aria-pressed", String(i === selected)); });
}
async function toggleSound() {
  if (!audio) startAudio();
  else if (audio.ctx.state === "running") await audio.ctx.suspend();
  else await audio.ctx.resume();
  if (audio.ctx.state !== "running") await audio.ctx.resume().catch(() => {});
  syncButtons();
  run();
}
const togglePlay = () => { playing = !playing; syncButtons(); run(); };
const reset = () => { arcs = defaultArcs(); waveIx = [0, 1, 2]; tables = waveIx.map((w) => tableOf(WAVES[w])); [0, 1, 2].forEach((i) => { paintArc(i); if (audio) audio.voices[i].osc.setPeriodicWave(waveFor(i)); }); selected = 0; syncButtons(); say("page restored"); run(); };
btn("sound").addEventListener("click", toggleSound);
btn("play").addEventListener("click", togglePlay);
btn("reset").addEventListener("click", reset);
[0, 1, 2].forEach((i) => btn("wave-" + i).addEventListener("click", () => { selected = i; cycleWave(i); }));
stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === " ") togglePlay();
  else if (key === "s" || key === "S") toggleSound();
  else if (key === "1" || key === "2" || key === "3") { selected = Number(key) - 1; syncButtons(); }
  else if (key === "w" || key === "W") cycleWave(selected);
  else if (key === "r" || key === "R") reset();
  else if (key === "ArrowRight" || key === "ArrowLeft") { const step = (event.shiftKey ? 1 : 0.25) / PAGE_SECONDS; u = clamp(u + (key === "ArrowRight" ? step : -step), 0, 0.9999); }
  else if (key === "Home") u = 0;
  else if (key === "End") u = 0.9999;
  else return;
  event.preventDefault();
  if (!frame) { const state = voicesAt(arcs, u); state.forEach((s, i) => (amps[i] = s.on ? s.amp : 0)); draw(state); }
  stage.setAttribute("aria-valuenow", (u * PAGE_SECONDS).toFixed(2));
  stage.setAttribute("aria-valuetext", (u * PAGE_SECONDS).toFixed(1) + " seconds into the page");
  run();
});
syncButtons();
{ const state = voicesAt(arcs, u); state.forEach((s, i) => (amps[i] = s.on ? s.amp : 0)); draw(state); }
`;

const controls =
  `<div class="up-controls" role="group" aria-label="Synthesizer controls">` +
  `<button type="button" data-act="sound" aria-pressed="false">Sound off</button>` +
  `<button type="button" data-act="play" aria-pressed="true">Pause</button>` +
  VOICES.map((tone, i) => `<button type="button" class="up-wave" data-act="wave-${i}" aria-pressed="false"><i style="background:var(--anatomy-${tone})"></i><span>${LETTERS[i]}</span></button>`).join("") +
  `<button type="button" data-act="reset">Reset page</button>` +
  `</div><p class="iso-caption" data-live aria-live="polite" style="min-height:1.4em;margin:6px 0 0"></p>`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "UPIC: drawing is the score",
  hint: "Drag on the page to draw · click a drum",
  readout: "0.0 s · A — · B — · C —",
  keys: [
    { mark: "lit", label: "Reading bar: the present moment sweeping the page" },
    { mark: "red", label: "Arc A and its drum" },
    { mark: "green", label: "Arc B" },
    { mark: "blue", label: "Arc C" },
    { mark: "raised", label: "Drums: one hand-drawn waveform period each" },
  ],
  caption:
    "Iannis Xenakis's UPIC (CEMAMu, Paris, completed 1977) turned drawing into sound. The composer drew on a large tablet with an electromagnetic pen: first single periods of waveforms, then loudness envelopes, then a page on which every line, called an arc, is pitch against time. Each arc drives one table-lookup oscillator. At each instant the arc's height sets how fast the oscillator reads its waveform table, the arc's envelope sets its loudness, and all the voices are summed. The first systems had to calculate a page before you could hear it; from 1987 it ran in real time, with up to 64 oscillators. In this model the page lasts 8 s, pitch runs from 110 to 880 Hz over three octaves on a log scale, there are 3 arcs, and the drums turn at 1/100 of their true speed. With sound on, you hear exactly what is drawn: each drum's waveform, at its arc's pitch and envelope.",
  body: `<div class="up-stage" tabindex="0" role="slider" aria-label="UPIC page: drag on the page to draw a new arc for the selected voice; Space plays or pauses; S turns sound on; 1, 2, 3 select a voice; W changes its waveform; arrows scrub; R restores the page" aria-valuemin="0" aria-valuemax="${M.PAGE_SECONDS}" aria-valuenow="0">${svg}</div>`,
}).replace('<figcaption', controls + '<figcaption');

const name = theme === "light" ? "upic-light.html" : "upic.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "UPIC synthesizer", theme, body, script: strip("kit/iso-kit.mjs") + live, width: 760 }).replace("</style>", CSS + "</style>"));
console.log("wrote", name);
