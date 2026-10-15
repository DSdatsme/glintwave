# Glintwave

A lightweight, framework-agnostic "glitter flow" background effect — sparkling flecks drifting in a chosen direction, reacting to your cursor (repel or attract), with a tunable viscosity that makes the whole thing feel like a real fluid rather than a rubber band.

Zero dependencies, no build step.

## Running locally

`index.html` is the live demo and control panel. Open it directly in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Run the tests with `npm test` (Node's built-in test runner — nothing to install).

## Usage

```html
<canvas id="c" style="width: 100vw; height: 100vh; touch-action: none"></canvas>
<script src="glitter-shape.js"></script>
<script src="fluid-effects.js"></script>
<script src="flow.js"></script>
<script src="glitter-collection.js"></script>
<script src="glintwave.js"></script>
<script>
  var canvas = document.getElementById("c");
  var pixelRatio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;

  var glintwave = new Glintwave(canvas, {
    pixelRatio: pixelRatio,
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
| `minSize` / `maxSize` | `number` (px) | `1.4` / `2.4` | Size range a fleck is randomly drawn from (0–100). |
| `glitterColors` | `{ color, density }[]` | gold/cream mix | Multiple colors with relative weights — doesn't need to sum to 100. `color` must be a hex string (`#rgb`, `#rrggbb`, or either with alpha digits); CSS names and `rgb()` aren't supported. |
| `glitterDensity` | `number` | `10` | Flecks per 400×400px of canvas area — resolution-independent, not a flat count. Fleck-to-fleck separation is O(n²) per frame (`flow.js`'s `applySeparation`), so pushing this much past ~50 causes severe frame drops on typical screen sizes — the demo warns in the panel above that threshold. The total is capped at 2000 flecks. |
| `fluidEffect` | `string` | `"repel"` | Key into the `FluidEffects` registry (`fluid-effects.js`) — currently `"repel"` or `"attract"`. |
| `pointerRadius` | `number` (px) | `150` | How far the pointer's effect reaches. |
| `pointerStrength` | `number` | `200` | How strong the pointer's effect is at its center. |
| `clickBurst` | `boolean` | `false` | Whether clicking applies a one-time burst. Currently disabled — buggy. |
| `burstRadius` / `burstStrength` | `number` | `pointerRadius * 1.5` / `120` | Only relevant once `clickBurst` is re-enabled. |
| `pixelRatio` | `number` | `1` | Backing-store pixels per CSS pixel. Pass `window.devicePixelRatio` and size the canvas to `cssSize * pixelRatio` for crisp rendering on high-DPI screens; every other option and the pointer stay in CSS pixels. Must be greater than 0 (up to 10). |

### Invalid options

Options are validated on construction and in `setOptions()`. A value of the wrong type (for example `speed: "fast"`, a non-hex color, an unknown `fluidEffect`) is ignored: the previous value (or the default) stays in effect and a single `console.warn` names the rejected options. `setOptions()` also returns that list of rejected option names, so a host page can report them. Numbers outside their range are clamped without a warning (`viscosity` to 0–1, sizes to 0–100, `speed`, radius and strength to 0 or above, `maxSize` to at least `minSize`). Passing `undefined` or `null` to `setOptions()` puts an option back to its default.

### Custom effects

`Glintwave.effects` is the registry of pointer effects (`repel`, `attract`). Add an entry to it, or list its keys with `Object.keys(Glintwave.effects)`, then pass the name as `fluidEffect`.
## How it works

- Flecks move at one **constant velocity** (same speed and direction for all of them) rather than being driven by a spatially-varying simulation — simpler, and avoids the boundary/edge-case bugs a full fluid solver runs into.
- **Repel/attract** is a direct, distance-based push/pull recomputed fresh every frame from the live cursor position, defined in `fluid-effects.js` as a small named registry — adding a new effect there is all it takes to get a new option value, nothing else needs to change.
- **Spawning** happens exactly where each drift line enters the canvas, and a fleck is removed once it will never cross the canvas again, so the number of flecks on screen holds at `glitterDensity` from the first frame instead of thinning out.
- **Pointer input** uses Pointer Events (mouse, touch and pen) and is mapped into canvas coordinates, so the canvas can be offset on the page, scaled by CSS, or rendered at a different `pixelRatio`. Set `touch-action: none` on the canvas if touch should drive the effect; otherwise the browser starts scrolling and cancels the touch.
- **Separation** keeps converging flecks from stacking on the same pixel — any two closer than their combined size push apart. The minimum separation distance is derived from the fleck's own shape/size (`glitter-shape.js`), not a separate magic number.
- **Restore + absorb**: every fleck tracks its own undisturbed ("base") trajectory. Repel/attract/separation only ever move the *actual* position; a restoring pull continuously eases it back toward base. A slower "absorb" pass lets base itself drift toward the actual position when a disturbance is sustained — so a quick flick mostly bounces back, but holding the cursor on flecks for a while permanently shifts where they settle. That's what makes it read as tampering with a fluid rather than stretching and releasing an elastic.
- **Viscosity** is the single knob for "what kind of liquid does this feel like" — it derives how much force actually gets through (drag), how fast flecks spring back (restore rate), and how much a disturbance sticks (absorb rate).

## Files

- `glintwave.js` — the public `Glintwave` class: resolves options, owns the render loop, exposes `setOptions()`/`destroy()`.
- `glitter-shape.js` — what a single fleck looks like (size, color, sparkle) and its derived minimum separation distance.
- `glitter-collection.js` — owns the live fleck array and its spawn/despawn lifecycle.
- `flow.js` — the physics rules (drift, spawn/despawn geometry, pointer force, separation, restore/absorb) as pure functions.
- `fluid-effects.js` — the named repel/attract effect registry.
- `test/` — the test suite, run against the real source files with a stub canvas.
- `index.html` — demo page and control panel, built entirely on the public API above. Includes Copy/Download/Load JSON controls for exporting or reloading a settings configuration.

## License

MIT
