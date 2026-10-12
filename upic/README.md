# UPIC synthesizer: interactive figure

An isometric bench model of Iannis Xenakis's UPIC. The drawing tablet's page is time (8 s) against pitch (110–880 Hz, log scale). A gantry reads each arc's height and sets the speed of a wavetable drum, a fader follows each arc's envelope, and a bus sums the voices into a vector display and a speaker. With sound on, Web Audio plays the same tables.

- Open `upic.html` (dark) or `upic-light.html` (light).
- Rebuild with `node build.mjs` and `node build.mjs --light`.
- `model.mjs` is the pure model shared by the build and the page. `kit/iso-kit.mjs` is the isometric drawing kit.

Controls: drag on the page to draw a new arc for the selected voice, click a drum to change its waveform, Space to play or pause, S for sound, 1–3 to select a voice, W to change the waveform, arrows to scrub, R to reset.

## Rotatable 3D version

`upic-3d.html` is the same bench as a three.js model you can orbit, zoom and pan (three.js 0.160.0 from jsDelivr). Drag on the paper to draw, drag anywhere else to rotate, scroll or pinch to zoom, and click a drum to change its waveform. It uses the same `model.mjs` and the same sound. Rebuild it from `upic-3d.template.html` with `node build-3d.mjs`.
