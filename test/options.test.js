"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { inspect } = require("node:util");
const { start, finite, visible, plain } = require("./harness");

const DEFAULT_COLORS = [
  { color: "#fff8dc", density: 0.5 },
  { color: "#f5d98b", density: 0.3 },
  { color: "#ffd700", density: 0.2 },
];

test("a value of the wrong type is ignored in favor of the default, with one warning naming the option", () => {
  const cases = [
    ["speed", "fast", 120],
    ["speed", Infinity, 120],
    ["viscosity", "thick", 0.5],
    ["direction", {}, 90],
    ["glitterDensity", "lots", 10],
    ["pointerRadius", [], 150],
    ["minSize", true, 1.4],
    ["pixelRatio", "2x", 1],
    ["pixelRatio", 0, 1],
  ];
  for (const [option, value, fallback] of cases) {
    const { h, gw } = start({ [option]: value });
    const label = `${option}: ${inspect(value)}`;
    assert.equal(gw.options[option], fallback, label);
    assert.equal(h.warnings.length, 1, label);
    assert.match(h.warnings[0], new RegExp(option), label);
  }
});

test("fluidEffect names that are not registered effects fall back to repel and never poison the flecks", () => {
  for (const name of ["swirl", "toString", "__proto__"]) {
    const { h, gw } = start({ fluidEffect: name });
    gw.pointer = { x: 400, y: 300 };
    h.step(0.5);
    assert.equal(gw.options.fluidEffect, "repel", name);
    assert.equal(h.warnings.length, 1, name);
    assert.ok(gw.glitter.list.every(finite), name);
  }
});

test("setOptions keeps the previous value for an invalid one, reports it, and stays quiet for valid ones", () => {
  const { h, gw } = start({ speed: 200 });
  assert.deepEqual(plain(gw.setOptions({ speed: "fast", viscosity: 0.2 })), ["speed"]);
  assert.equal(gw.options.speed, 200);
  assert.equal(gw.options.viscosity, 0.2);
  assert.deepEqual(plain(gw.setOptions({ speed: 50 })), []);
  assert.equal(h.warnings.length, 1);
});

test("setOptions with undefined or null puts an option back to its default", () => {
  const { h, gw } = start({ speed: 300, pointerRadius: 100, burstRadius: 50 });
  gw.setOptions({ speed: undefined, burstRadius: null });
  assert.equal(gw.options.speed, 120);
  assert.equal(gw.options.burstRadius, 150);
  assert.equal(h.warnings.length, 0);
});

test("a scene fed a bad value recovers once a valid one follows", () => {
  const { h, gw } = start();
  gw.setOptions({ speed: "fast" });
  h.step(1);
  gw.setOptions({ speed: 120 });
  h.step(20);
  assert.ok(gw.glitter.list.every(finite));
  assert.ok(visible(gw) > 0);
});

test("out-of-range numbers are clamped without a warning and never produce a negative radius", () => {
  const { h, gw } = start({ viscosity: 5, speed: -120, minSize: -3, maxSize: 5000 });
  assert.deepEqual(
    [gw.options.viscosity, gw.options.speed, gw.options.minSize, gw.options.maxSize],
    [1, 0, 0, 100]
  );
  assert.doesNotThrow(() => h.step(0.2));
  gw.setOptions({ viscosity: -1, minSize: 5, maxSize: 2 });
  assert.deepEqual([gw.options.viscosity, gw.options.maxSize], [0, 5]);
  assert.equal(h.warnings.length, 0);
});

test("glitterColors that are not valid hex colors are ignored, and the loop survives", () => {
  const invalid = [
    [{ color: "red", density: 1 }],
    [{ color: "#ggg", density: 1 }],
    [{ color: "#ff880", density: 1 }],
    [{ color: 123, density: 1 }],
    [{ color: "#fff8dc" }],
    [{ color: "#fff8dc", density: -1 }],
    [null],
    [],
    "gold",
    [{ color: "#fff", density: 1 }, { color: "red", density: 1 }],
  ];
  for (const colors of invalid) {
    const { h, gw } = start({ glitterColors: colors });
    const label = inspect(colors);
    assert.deepEqual(plain(gw.options.glitterColors), DEFAULT_COLORS, label);
    assert.equal(h.warnings.length, 1, label);
    assert.match(h.warnings[0], /glitterColors/, label);
    assert.doesNotThrow(() => h.step(1), label);
    assert.ok(h.isLoopAlive(), label);
  }
});

test("hex colors in any accepted form are drawn as the color they name", () => {
  for (const color of ["#f00", "#F00", "#ff0000", "#ff0000ff", "#f00f"]) {
    const { h, canvas } = start({ glitterColors: [{ color, density: 1 }] });
    h.step(0.1);
    assert.equal(h.warnings.length, 0, color);
    assert.ok(canvas.ctx.stops.some((stop) => /^rgba\(255, 0, 0, /.test(stop)), color);
  }
});

test("glitterColors are copied, so the caller mutating its own list later changes nothing", () => {
  const entries = [{ color: "#00ff00", density: 1 }];
  const { gw } = start({ glitterColors: entries });
  entries[0].color = "#ff0000";
  entries.push({ color: "#0000ff", density: 1 });
  gw.setOptions({ speed: 100 });
  assert.deepEqual(plain(gw.options.glitterColors), [{ color: "#00ff00", density: 1 }]);
});

test("an absurd glitterDensity is capped instead of allocating without bound", () => {
  const { gw } = start({ glitterDensity: 1e9 }, { width: 1920, height: 1080 });
  assert.ok(gw.glitter.list.length > 0 && gw.glitter.list.length <= 2000);
});

test("one fleck with a NaN position is removed and does not spread NaN to the others", () => {
  const { h, gw } = start({ glitterDensity: 0 });
  const at = (x) => gw.glitter.makeGlitter(x, 300, gw.shape);
  gw.glitter.list = [...Array.from({ length: 10 }, (_, i) => at(300 + i * 3)), at(NaN)];
  h.step(1 / 60);
  assert.equal(gw.glitter.list.length, 10);
  assert.ok(gw.glitter.list.every(finite));
});
