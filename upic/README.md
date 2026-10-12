# UPIC synthesizer: interactive figure

An isometric bench model of Iannis Xenakis's UPIC. The drawing tablet's page is time (8 s) against pitch (110–880 Hz, log scale). A gantry reads each arc's height and sets the speed of a wavetable drum, a fader follows each arc's envelope, and a bus sums the voices into a vector display and a speaker. With sound on, Web Audio plays the same tables.

- Open `upic.html` (dark) or `upic-light.html` (light).
- Rebuild with `node build.mjs` and `node build.mjs --light`.
- `model.mjs` is the pure model shared by the build and the page. `kit/iso-kit.mjs` is the isometric drawing kit.

Controls: drag on the page to draw a new arc for the selected voice, click a drum to change its waveform, Space to play or pause, S for sound, 1–3 to select a voice, W to change the waveform, arrows to scrub, R to reset.
