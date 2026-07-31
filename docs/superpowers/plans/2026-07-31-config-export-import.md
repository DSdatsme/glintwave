# Config Export/Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a particles.js-style Copy/Download/Load JSON workflow to `index.html`'s control panel so a user can export their tweaked settings as a config file, or load one back in.

**Architecture:** All changes live inside `index.html`'s existing inline `<script>` IIFE — no new files, no changes to the library files (`glintwave.js`, `flow.js`, `glitter-collection.js`, `glitter-shape.js`, `fluid-effects.js`). Two pure functions (`buildExportConfig`, `parseConfig`) hold the actual logic and are unit-tested with a throwaway Node script (no test framework exists in this repo and none is being added); the rest is DOM wiring verified manually in a browser.

**Tech Stack:** Vanilla JS (ES5-style, `var`/function expressions, matching the file's existing conventions), no dependencies, no build step.

## Global Constraints

- Demo-only: do not modify `glintwave.js`, `flow.js`, `glitter-collection.js`, `glitter-shape.js`, or `fluid-effects.js`.
- Exported/downloaded config must contain exactly these 9 keys, no more, no less: `background`, `direction`, `speed`, `viscosity`, `fluidEffect`, `pointerRadius`, `pointerStrength`, `glitterDensity`, `glitterColors`.
- Download filename is exactly `glintwave-config.json`.
- No `alert()`/`confirm()` anywhere. The one exception is a single `window.prompt()` call for pasting a config to load. Errors surface as an inline status message, never a second dialog.
- Zero new dependencies, zero build step, `var`/function-expression style matching the rest of `index.html` (no `const`/`let`/arrow functions/classes — the file doesn't use them).

Spec reference: `docs/superpowers/specs/2026-07-31-config-export-import-design.md`.

---

### Task 1: Pure config helpers (`buildExportConfig`, `parseConfig`)

**Files:**
- Modify: `index.html` (inline `<script>`; insert the two function declarations immediately after the `renderColorList();` call at `index.html:264` and before the closing `})();` at `index.html:265`. Only the two function declarations are added — nothing calls them yet, so the page's existing behavior is unaffected.)
- Test: throwaway script at `/private/tmp/claude-502/-Users-dsdatsme-personal-glintwave/216be0c7-b6b8-48bb-8a59-9dccebe9c4e9/scratchpad/test-config-helpers.js` (not committed to the repo — this repo has no test infrastructure and none is being introduced)

**Interfaces:**
- Produces: `buildExportConfig(options)` — pure function; `options` is any object with at least the 9 keys below; returns a new plain object containing exactly `{ background, direction, speed, viscosity, fluidEffect, pointerRadius, pointerStrength, glitterDensity, glitterColors }`, dropping every other key.
- Produces: `parseConfig(jsonText)` — pure function; `jsonText` is a string; returns `{ ok: true, config: <parsed object> }` on valid JSON that parses to a plain (non-null, non-array) object, or `{ ok: false, error: "Invalid JSON" }` otherwise.

- [ ] **Step 1: Write the failing test**

Write this to the scratchpad path above:

```js
const assert = require("assert");

// Stubs, not the real implementation yet — calling either throws, proving
// this test actually exercises real code once Step 3 replaces them below.
function buildExportConfig(options) {
  throw new Error("not implemented");
}
function parseConfig(jsonText) {
  throw new Error("not implemented");
}

function run() {
  // --- buildExportConfig: plucks exactly the 9 keys, drops everything else ---
  {
    const fullOptions = {
      background: "#0a0a0f",
      direction: 90,
      speed: 120,
      viscosity: 0.5,
      fluidEffect: "repel",
      pointerRadius: 150,
      pointerStrength: 200,
      glitterDensity: 10,
      glitterColors: [{ color: "#fff8dc", density: 50 }],
      minSize: 1.4,
      maxSize: 2.4,
      clickBurst: false,
      burstRadius: 225,
      burstStrength: 120,
      directionVector: { x: 1, y: 0 },
    };
    const result = buildExportConfig(fullOptions);
    assert.deepStrictEqual(Object.keys(result).sort(), [
      "background", "direction", "fluidEffect", "glitterColors", "glitterDensity",
      "pointerRadius", "pointerStrength", "speed", "viscosity",
    ].sort());
    assert.strictEqual(result.speed, 120);
    assert.deepStrictEqual(result.glitterColors, [{ color: "#fff8dc", density: 50 }]);
    assert.strictEqual(result.minSize, undefined);
    assert.strictEqual(result.directionVector, undefined);
  }

  // --- parseConfig: valid JSON object ---
  {
    const result = parseConfig('{"speed": 200, "viscosity": 0.8}');
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.config, { speed: 200, viscosity: 0.8 });
  }

  // --- parseConfig: malformed JSON ---
  {
    const result = parseConfig('{"speed": 200,}'); // trailing comma
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error, "Invalid JSON");
  }

  // --- parseConfig: valid JSON but not an object (array) ---
  {
    const result = parseConfig("[1, 2, 3]");
    assert.strictEqual(result.ok, false);
  }

  // --- parseConfig: valid JSON but not an object (primitive) ---
  {
    const result = parseConfig("42");
    assert.strictEqual(result.ok, false);
  }

  console.log("all assertions passed");
}

run();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /private/tmp/claude-502/-Users-dsdatsme-personal-glintwave/216be0c7-b6b8-48bb-8a59-9dccebe9c4e9/scratchpad/test-config-helpers.js`

Expected: throws `Error: not implemented` (from the `buildExportConfig` stub on the very first assertion block).

- [ ] **Step 3: Replace the two stub functions in the test script with the real implementation**

```js
function buildExportConfig(options) {
  return {
    background: options.background,
    direction: options.direction,
    speed: options.speed,
    viscosity: options.viscosity,
    fluidEffect: options.fluidEffect,
    pointerRadius: options.pointerRadius,
    pointerStrength: options.pointerStrength,
    glitterDensity: options.glitterDensity,
    glitterColors: options.glitterColors,
  };
}

function parseConfig(jsonText) {
  var parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, error: "Invalid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Invalid JSON" };
  }
  return { ok: true, config: parsed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node /private/tmp/claude-502/-Users-dsdatsme-personal-glintwave/216be0c7-b6b8-48bb-8a59-9dccebe9c4e9/scratchpad/test-config-helpers.js`

Expected: prints `all assertions passed` with exit code 0.

- [ ] **Step 5: Paste the verified implementation into `index.html`**

Open `index.html` and insert this immediately after the `renderColorList();` line (`index.html:264`) and before the closing `})();` (`index.html:265`):

```js

  // ---------- config export/import: pure helpers ----------

  function buildExportConfig(options) {
    return {
      background: options.background,
      direction: options.direction,
      speed: options.speed,
      viscosity: options.viscosity,
      fluidEffect: options.fluidEffect,
      pointerRadius: options.pointerRadius,
      pointerStrength: options.pointerStrength,
      glitterDensity: options.glitterDensity,
      glitterColors: options.glitterColors,
    };
  }

  function parseConfig(jsonText) {
    var parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      return { ok: false, error: "Invalid JSON" };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Invalid JSON" };
    }
    return { ok: true, config: parsed };
  }
```

- [ ] **Step 6: Verify the page still loads with no console errors**

Serve the directory (`npx serve .` or `python3 -m http.server 8000`) and open `index.html`. Confirm the demo runs exactly as before (nothing calls the new functions yet) and the browser console shows no errors.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "Add pure config export/import helper functions"
```

---

### Task 2: Export/Import row markup + Copy/Download wiring

**Files:**
- Modify: `index.html:54` (CSS, add one rule)
- Modify: `index.html:118-119` (HTML, insert new row between the "Glitter colors" row's closing `</div>` at line 118 and the `.controls` panel's own closing `</div>` at line 119)
- Modify: `index.html` inline `<script>` (add wiring after the helpers from Task 1)

**Interfaces:**
- Consumes: `buildExportConfig(options)` from Task 1; the existing `glintwave` instance (`index.html:134`).
- Produces: `showConfigStatus(message, isError)` — sets `#configStatus`'s text and error styling, auto-clearing after a delay. Used by Task 3 too.
- Produces: DOM elements `#copyConfigBtn`, `#downloadConfigBtn`, `#loadConfigBtn` (this task wires only the first two; `#loadConfigBtn` is wired in Task 3), `#configStatus`.

- [ ] **Step 1: Add the error-state CSS rule**

In `index.html`, right after the existing `.hint` rule (`index.html:54`: `.hint { font-size: 10px; color: #777; }`), add:

```css
  .hint.error { color: #e07a7a; }
```

- [ ] **Step 2: Add the Export/Import row markup**

In `index.html`, immediately after the "Glitter colors" row's closing `</div>` (`index.html:118`) and before the `.controls` panel's own closing `</div>` (`index.html:119`), add:

```html
  <div class="row">
    <div class="row-label">Export / Import</div>
    <div class="btn-group">
      <button id="copyConfigBtn">Copy JSON</button>
      <button id="downloadConfigBtn">Download JSON</button>
      <button id="loadConfigBtn">Load JSON</button>
    </div>
    <div class="hint" id="configStatus"></div>
  </div>
```

- [ ] **Step 3: Wire the status helper, Copy, and Download buttons**

In the inline `<script>`, after the `parseConfig` function added in Task 1, add:

```js

  // ---------- config export/import: UI wiring ----------

  var configStatus = document.getElementById("configStatus");
  var configStatusTimer = null;

  function showConfigStatus(message, isError) {
    configStatus.textContent = message;
    configStatus.classList.toggle("error", !!isError);
    if (configStatusTimer) clearTimeout(configStatusTimer);
    configStatusTimer = setTimeout(function () {
      configStatus.textContent = "";
      configStatus.classList.remove("error");
    }, isError ? 3000 : 1500);
  }

  document.getElementById("copyConfigBtn").addEventListener("click", function () {
    var json = JSON.stringify(buildExportConfig(glintwave.options), null, 2);
    navigator.clipboard.writeText(json).then(
      function () { showConfigStatus("Copied!", false); },
      function () { showConfigStatus("Copy failed", true); }
    );
  });

  document.getElementById("downloadConfigBtn").addEventListener("click", function () {
    var json = JSON.stringify(buildExportConfig(glintwave.options), null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "glintwave-config.json";
    a.click();
    URL.revokeObjectURL(url);
    showConfigStatus("Downloaded", false);
  });
```

- [ ] **Step 4: Manual verification in a real browser**

Serve the directory and open `index.html`:
1. Change a few settings (direction, speed, a glitter color).
2. Click **Copy JSON** — paste into a text editor and confirm it's a 9-key JSON object matching the current settings, and the button area briefly shows "Copied!" then clears after ~1.5s.
3. Click **Download JSON** — confirm a file named exactly `glintwave-config.json` is saved, and its content matches the copied JSON exactly.
4. Confirm the browser console shows no errors during any of this.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add Copy/Download JSON controls to the demo"
```

---

### Task 3: Load JSON wiring

**Files:**
- Modify: `index.html` inline `<script>`:
  - `index.html:146-152` (`setDirection` function — refactor to extract button-sync logic)
  - `index.html:166-179` (fluid effect buttons loop — refactor to extract button-sync logic)
  - Add new code after the Copy/Download wiring from Task 2

**Interfaces:**
- Consumes: `parseConfig(jsonText)` from Task 1; `showConfigStatus(message, isError)` from Task 2; existing `colorEntries`, `renderColorList`, `directionPresetButtons`, `effectRow`, `backgroundPicker`, `directionInput`, `glintwave` (all already in scope in `index.html`'s IIFE).
- Produces: `syncDirectionButtons(deg)` — updates only the direction preset buttons' active state, no `setOptions` call. `syncEffectButtons(effectName)` — updates only the fluid-effect buttons' active state, no `setOptions` call. Both are reused by their respective existing handlers (see Step 1/2) so there's exactly one place each that owns "which button is active."

- [ ] **Step 1: Extract `syncDirectionButtons` out of `setDirection`**

Replace (`index.html:146-152`):

```js
  function setDirection(deg) {
    directionInput.value = deg;
    glintwave.setOptions({ direction: deg });
    for (var b = 0; b < directionPresetButtons.length; b++) {
      directionPresetButtons[b].classList.toggle("active", parseFloat(directionPresetButtons[b].dataset.deg) === deg);
    }
  }
```

With:

```js
  function syncDirectionButtons(deg) {
    for (var b = 0; b < directionPresetButtons.length; b++) {
      directionPresetButtons[b].classList.toggle("active", parseFloat(directionPresetButtons[b].dataset.deg) === deg);
    }
  }
  function setDirection(deg) {
    directionInput.value = deg;
    glintwave.setOptions({ direction: deg });
    syncDirectionButtons(deg);
  }
```

- [ ] **Step 2: Extract `syncEffectButtons` out of the fluid-effect button click handler**

Replace (`index.html:166-179`):

```js
  var effectRow = document.getElementById("effectRow");
  Object.keys(FluidEffects).forEach(function (name, index) {
    var btn = document.createElement("button");
    btn.textContent = name;
    if (index === 0) btn.classList.add("active");
    btn.addEventListener("click", function (e) {
      glintwave.setOptions({ fluidEffect: name });
      var buttons = effectRow.querySelectorAll("button");
      for (var b = 0; b < buttons.length; b++) {
        buttons[b].classList.toggle("active", buttons[b] === e.currentTarget);
      }
    });
    effectRow.appendChild(btn);
  });
```

With:

```js
  var effectRow = document.getElementById("effectRow");
  function syncEffectButtons(effectName) {
    var buttons = effectRow.querySelectorAll("button");
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].classList.toggle("active", buttons[b].textContent === effectName);
    }
  }
  Object.keys(FluidEffects).forEach(function (name, index) {
    var btn = document.createElement("button");
    btn.textContent = name;
    if (index === 0) btn.classList.add("active");
    btn.addEventListener("click", function () {
      glintwave.setOptions({ fluidEffect: name });
      syncEffectButtons(name);
    });
    effectRow.appendChild(btn);
  });
```

- [ ] **Step 3: Wire the Load JSON button**

After the Download JSON wiring from Task 2, add:

```js

  document.getElementById("loadConfigBtn").addEventListener("click", function () {
    var text = window.prompt("Paste a Glintwave config JSON:");
    if (text === null) return; // user cancelled the prompt
    var result = parseConfig(text);
    if (!result.ok) {
      showConfigStatus(result.error, true);
      return;
    }
    var config = result.config;

    if (config.background !== undefined) backgroundPicker.value = config.background;
    if (config.direction !== undefined) {
      directionInput.value = config.direction;
      syncDirectionButtons(config.direction);
    }
    if (config.speed !== undefined) document.getElementById("speedInput").value = config.speed;
    if (config.viscosity !== undefined) document.getElementById("viscosityInput").value = config.viscosity;
    if (config.pointerRadius !== undefined) document.getElementById("radiusInput").value = config.pointerRadius;
    if (config.pointerStrength !== undefined) document.getElementById("strengthInput").value = config.pointerStrength;
    if (config.glitterDensity !== undefined) document.getElementById("densityInput").value = config.glitterDensity;
    if (config.fluidEffect !== undefined) syncEffectButtons(config.fluidEffect);
    if (Array.isArray(config.glitterColors)) {
      colorEntries.length = 0;
      config.glitterColors.forEach(function (entry) {
        colorEntries.push({ color: entry.color, density: entry.density });
      });
      renderColorList();
    }

    glintwave.setOptions(config);
    showConfigStatus("Loaded", false);
  });
```

- [ ] **Step 4: Manual verification in a real browser — happy path**

Serve the directory and open `index.html`:
1. Click **Load JSON**, paste:
   ```json
   {"direction": 180, "speed": 300, "viscosity": 0.9, "fluidEffect": "attract", "pointerRadius": 100, "pointerStrength": 50, "glitterDensity": 5, "background": "#101018", "glitterColors": [{"color": "#00ffff", "density": 100}]}
   ```
2. Confirm: the "Down" direction preset button becomes active, the speed/viscosity/radius/strength/density number inputs show the new values, the "attract" effect button becomes active, the color list shows one cyan entry, the background swatch updates, and the flecks visibly change color/behavior — all from this single click, and the status area briefly shows "Loaded".

- [ ] **Step 5: Manual verification — malformed JSON**

Click **Load JSON**, paste `{"speed": 200,` (trailing comma, invalid). Confirm the status area shows "Invalid JSON" in the red/error style, and nothing else on the page changed.

- [ ] **Step 6: Manual verification — unrelated extra key**

Click **Load JSON**, paste `{"speed": 400, "notARealOption": 123}`. Confirm speed updates to 400, no error is shown, and no exception appears in the console.

- [ ] **Step 7: Manual verification — cancel**

Click **Load JSON**, then cancel the prompt (Escape or Cancel button). Confirm nothing changes and no error is shown.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "Add Load JSON control to the demo"
```

---

### Task 4: Full regression pass and README note

**Files:**
- Modify: `README.md:82` (the `index.html` line in the "Files" section)

**Interfaces:**
- None — this task only verifies prior tasks' behavior together and updates documentation.

- [ ] **Step 1: Update the README's description of `index.html`**

Replace (`README.md:82`):

```
- `index.html` — demo page and control panel, built entirely on the public API above.
```

With:

```
- `index.html` — demo page and control panel, built entirely on the public API above. Includes Copy/Download/Load JSON controls for exporting or reloading a settings configuration.
```

- [ ] **Step 2: Full manual regression pass**

Serve the directory and open `index.html`. Walk through, in order:
1. Every original control (background, direction input + presets, effect buttons, speed, viscosity, pointer radius/strength, glitter density, add/edit/remove colors) still works exactly as before.
2. Copy JSON, Download JSON, and Load JSON (happy path, invalid JSON, extra key, cancel) all behave as verified in Tasks 2 and 3.
3. Round-trip: set some custom values, Download JSON, then Load JSON pasting back the exact content of the downloaded file — confirm the panel ends up in the same state it started from.
4. No errors in the browser console throughout.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document config export/import in the README"
```
