// UPIC page model. Pure functions, shared by the build (static art) and the page (live).
// A page is time across (u: 0..1 over PAGE_SECONDS) and pitch up (v: 0..1 over F_LO..F_HI, log).
// Each arc is one table-lookup oscillator: its height at the playhead sets the frequency,
// its envelope sets the loudness, and the voices are summed.

export const PAGE_SECONDS = 8;
export const F_LO = 110;
export const OCTAVES = 3;
export const TABLE = 128;
export const SPIN = 100;

export const freqOf = (v) => F_LO * 2 ** (OCTAVES * v);

export const WAVES = [
  { name: "sine", points: null },
  { name: "lopsided", points: [[0, 0], [0.16, 0.95], [0.42, 0.3], [0.62, -0.85], [0.84, -0.4], [1, 0]] },
  { name: "jagged", points: [[0, 0], [0.08, 0.8], [0.18, 0.25], [0.3, 0.95], [0.46, 0.05], [0.56, -0.7], [0.68, -0.2], [0.82, -0.95], [0.92, -0.35], [1, 0]] },
  { name: "square-ish", points: [[0, 0], [0.05, 0.85], [0.45, 0.75], [0.55, -0.8], [0.95, -0.85], [1, 0]] },
];

function polyAt(points, x) {
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return points[points.length - 1][1];
}

export function tableOf(wave) {
  const out = new Float32Array(TABLE);
  for (let i = 0; i < TABLE; i++) {
    const phase = i / TABLE;
    out[i] = wave.points ? polyAt(wave.points, phase) : Math.sin(phase * 2 * Math.PI);
  }
  return out;
}

export function lookup(table, phase) {
  const at = (phase - Math.floor(phase)) * TABLE;
  const i = Math.floor(at);
  const f = at - i;
  return table[i % TABLE] * (1 - f) + table[(i + 1) % TABLE] * f;
}

export const ENVELOPES = [
  [[0, 0], [0.12, 1], [0.7, 0.8], [1, 0]],
  [[0, 0], [0.04, 1], [0.3, 0.55], [0.85, 0.45], [1, 0]],
  [[0, 0], [0.45, 0.6], [0.8, 1], [1, 0]],
];

export const envelopeAt = (envelope, s) => polyAt(envelope, Math.min(1, Math.max(0, s)));

function sampled(u0, u1, fn, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    out.push([u, fn(u)]);
  }
  return out;
}

const ease = (t) => t * t * (3 - 2 * t);

export function defaultArcs() {
  return [
    sampled(0.04, 0.62, (u) => 0.12 + 0.62 * ease((u - 0.04) / 0.58)),
    sampled(0.2, 0.96, (u) => 0.86 - 0.52 * ((u - 0.2) / 0.76) + 0.04 * Math.sin((u - 0.2) * 18)),
    sampled(0.5, 0.98, (u) => 0.42 + 0.1 * Math.sin((u - 0.5) * 2 * Math.PI * 4)),
  ];
}

// Height of an arc at time u, or null where the arc does not sound.
export function arcAt(arc, u) {
  if (!arc || arc.length < 2 || u < arc[0][0] || u > arc[arc.length - 1][0]) return null;
  return polyAt(arc, u);
}

// What each voice is doing at time u: frequency, amplitude (0..1) and where it is along its arc.
export function voicesAt(arcs, u) {
  return arcs.map((arc, i) => {
    const v = arcAt(arc, u);
    if (v === null) return { on: false, v: 0, f: 0, amp: 0, s: 0 };
    const s = (u - arc[0][0]) / (arc[arc.length - 1][0] - arc[0][0]);
    return { on: true, v, f: freqOf(v), amp: envelopeAt(ENVELOPES[i], s), s };
  });
}

// Fourier series of one table, for a band-limited Web Audio PeriodicWave.
export function harmonicsOf(table, count = 48) {
  const real = new Float32Array(count + 1);
  const imag = new Float32Array(count + 1);
  for (let h = 1; h <= count; h++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < TABLE; i++) {
      const a = (2 * Math.PI * h * i) / TABLE;
      re += table[i] * Math.cos(a);
      im += table[i] * Math.sin(a);
    }
    real[h] = (2 * re) / TABLE;
    imag[h] = (2 * im) / TABLE;
  }
  return { real, imag };
}

export const noteOf = (f) => {
  const names = ["A", "A♯", "B", "C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯"];
  const n = Math.round(12 * Math.log2(f / 110));
  return names[((n % 12) + 12) % 12] + (2 + Math.floor((n + 9) / 12));
};
