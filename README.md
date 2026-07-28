# Glintwave

A lightweight, framework-agnostic "glitter flow" background effect — sparkling flecks drifting in a chosen direction, reacting to your cursor (repel or attract), with a tunable viscosity that makes the whole thing feel like a real fluid rather than a rubber band.

Zero dependencies, no build step.

## Running locally

Browsers won't run this from a `file://` URL, so serve it over plain HTTP:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed local URL — `index.html` is the live demo and control panel.

## Usage

```html
<canvas id="c"></canvas>
<script src="glitter-shape.js"></script>
<script src="fluid-effects.js"></script>
<script src="flow.js"></script>
<script src="glitter-collection.js"></script>
<script src="glintwave.js"></script>
<script>
  var canvas = document.getElementById("c");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var glintwave = new Glintwave(canvas, {
    direction: 90, // degrees, clockwise from up (0 = up, 90 = right, 180 = down, 270 = left)
    speed: 120, // px/sec
    viscosity: 0.5, // 0 = thin/watery, 1 = thick/viscous
    glitterColors: [
      { color: "#fff8dc", density: 0.5 },
      { color: "#f5d98b", density: 0.3 },
      { color: "#ffd700", density: 0.2 },
    ],
  });

  // later
  glintwave.setOptions({ viscosity: 0.9 });
  glintwave.destroy();
</script>
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `background` | `string` (CSS color) | `"#0a0a0f"` | Always painted — there's no transparent mode. |
| `direction` | `number` (degrees) | `90` | Drift direction, clockwise from up (0 = up, 90 = right, 180 = down, 270 = left). |
| `speed` | `number` (px/sec) | `120` | Drift speed — the same for every fleck. |
| `viscosity` | `number` (0–1) | `0.5` | 0 = thin/watery, 1 = thick/viscous. Derives drag, restore rate, and absorb rate together. |
| `minSize` / `maxSize` | `number` (px) | `1.4` / `2.4` | Size range a fleck is randomly drawn from. |
| `glitterColors` | `{ color, density }[]` | gold/cream mix | Multiple colors with relative weights — doesn't need to sum to 100. |
| `glitterDensity` | `number` | `10` | Flecks per 400×400px of canvas area — resolution-independent, not a flat count. |
| `fluidEffect` | `string` | `"repel"` | Key into the `FluidEffects` registry (`fluid-effects.js`) — currently `"repel"` or `"attract"`. |
| `pointerRadius` | `number` (px) | `150` | How far the pointer's effect reaches. |
| `pointerStrength` | `number` | `200` | How strong the pointer's effect is at its center. |
| `clickBurst` | `boolean` | `false` | Whether clicking applies a one-time burst. Currently disabled — buggy. |
| `burstRadius` / `burstStrength` | `number` | `pointerRadius * 1.5` / `120` | Only relevant once `clickBurst` is re-enabled. |

## How it works

- Flecks move at one **constant velocity** (same speed and direction for all of them) rather than being driven by a spatially-varying simulation — simpler, and avoids the boundary/edge-case bugs a full fluid solver runs into.
- **Repel/attract** is a direct, distance-based push/pull recomputed fresh every frame from the live cursor position, defined in `fluid-effects.js` as a small named registry — adding a new effect there is all it takes to get a new option value, nothing else needs to change.
- **Separation** keeps converging flecks from stacking on the same pixel — any two closer than their combined size push apart. The minimum separation distance is derived from the fleck's own shape/size (`glitter-shape.js`), not a separate magic number.
- **Restore + absorb**: every fleck tracks its own undisturbed ("base") trajectory. Repel/attract/separation only ever move the *actual* position; a restoring pull continuously eases it back toward base. A slower "absorb" pass lets base itself drift toward the actual position when a disturbance is sustained — so a quick flick mostly bounces back, but holding the cursor on flecks for a while permanently shifts where they settle. That's what makes it read as tampering with a fluid rather than stretching and releasing an elastic.
- **Viscosity** is the single knob for "what kind of liquid does this feel like" — it derives how much force actually gets through (drag), how fast flecks spring back (restore rate), and how much a disturbance sticks (absorb rate).

## Files

- `glintwave.js` — the public `Glintwave` class: resolves options, owns the render loop, exposes `setOptions()`/`destroy()`.
- `glitter-shape.js` — what a single fleck looks like (size, color, sparkle) and its derived minimum separation distance.
- `glitter-collection.js` — owns the live fleck array and its spawn/despawn lifecycle.
- `flow.js` — the physics rules (drift, pointer force, separation, restore/absorb) as pure functions.
- `fluid-effects.js` — the named repel/attract effect registry.
- `index.html` — demo page and control panel, built entirely on the public API above.

## License

MIT
