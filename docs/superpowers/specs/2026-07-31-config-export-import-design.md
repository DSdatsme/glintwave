# Glintwave Demo — Config Export/Import

## Purpose

`index.html` is Glintwave's live demo and control panel. Right now, someone who
tweaks the sliders/colors to a look they like has no way to take those
settings with them — they'd have to read values off each input by hand and
reconstruct the options object themselves.

This adds a particles.js-style workflow: play with the controls, then Copy or
Download the resulting settings as a JSON file that drops straight into
`new Glintwave(canvas, options)`, plus a Load path to bring a previously
exported config back into the demo for further tweaking.

This is demo-only. No changes to `glintwave.js`, `flow.js`,
`glitter-collection.js`, `glitter-shape.js`, or `fluid-effects.js` — the
public library API is untouched.

## Config JSON shape

Exactly the options the control panel exposes today — a direct subset of
`GLINTWAVE_DEFAULTS`, valid as-is for the `options` argument to `new
Glintwave()`:

```json
{
  "background": "#0a0a0f",
  "direction": 90,
  "speed": 120,
  "viscosity": 0.5,
  "fluidEffect": "repel",
  "pointerRadius": 150,
  "pointerStrength": 200,
  "glitterDensity": 10,
  "glitterColors": [
    { "color": "#fff8dc", "density": 50 },
    { "color": "#f5d98b", "density": 30 },
    { "color": "#ffd700", "density": 20 }
  ]
}
```

Fields not exposed in the UI (`minSize`, `maxSize`, `clickBurst`,
`burstRadius`, `burstStrength`) are excluded — the exported config only ever
contains values the user actually set.

## UI additions

A new row at the bottom of the `.controls` panel, below "Glitter colors":

```
Export / Import
[ Copy JSON ]  [ Download JSON ]  [ Load JSON ]
```

### Copy JSON
Serializes the 9 fields above from current live state (existing
`colorEntries` array for `glitterColors`, existing bound-input values for the
rest) via `JSON.stringify(config, null, 2)` and writes it to the clipboard
with `navigator.clipboard.writeText`. Button label flashes "Copied!" for ~1.5s
as feedback, then reverts.

### Download JSON
Same serialization as Copy. Builds a `Blob` (`type: "application/json"`),
creates a temporary `<a download="glintwave-config.json">` pointing at
`URL.createObjectURL(blob)`, clicks it, then revokes the object URL.

### Load JSON
A `prompt()`-based paste box (simplest possible text input, no new modal
component) asking the user to paste a config JSON. On submit:
- `JSON.parse` the input in a try/catch.
- On parse failure, or if the result isn't a plain object, show an inline
  error message ("Invalid JSON") in the row for ~3s, do not touch any state.
- On success, apply only the recognized keys: update `colorEntries` (if
  `glitterColors` present) and re-render the color list, update each bound
  number/color input's displayed value, sync the direction preset buttons'
  active state, sync the fluid-effect buttons' active state, then call
  `glintwave.setOptions(parsed)` once with the whole parsed object.
- Unrecognized keys in the pasted JSON are harmless — `setOptions` already
  only reads keys it knows about (see `Glintwave.prototype._resolveOptions`
  in `glintwave.js`).
- Missing keys simply leave the corresponding control/option at its current
  value, since `setOptions` merges partial changes rather than replacing the
  whole config.

No `alert()`/`confirm()` is used anywhere in this flow except the one
`prompt()` for pasting — `prompt()` is a blocking modal but is the simplest
fit for "paste some text and submit," and errors surface as an inline message
rather than a second alert.

## Testing / verification

No test framework exists in this repo (a static, zero-dependency demo page).
Verification will be manual, in a real browser via the local static server:
- Copy JSON → paste into a text editor → confirm it matches current slider/
  color state exactly.
- Download JSON → confirm the file saves as `glintwave-config.json` with the
  same content.
- Load JSON → paste a config with different values → confirm every control
  updates to match (including direction preset button highlight and color
  swatches) and the live effect visibly changes.
- Load JSON with malformed input (e.g. trailing comma) → confirm the inline
  error appears and nothing else changes.
- Load JSON with an unrelated/extra key → confirm it's silently ignored and
  everything else still applies.

## Out of scope (explicitly deferred)

- Hosting the demo (GitHub Pages / Vercel / Cloudflare Pages) and SEO
  improvements — separate concern, not yet decided by the user.
- The `applySeparation` O(n²) performance characteristic at extreme
  `glitterDensity` values — known, not being addressed here.
- Adding UI controls for `minSize`/`maxSize`/`clickBurst`/`burstRadius`/
  `burstStrength` — out of scope; the exported config intentionally mirrors
  only what's already tunable in the UI.
