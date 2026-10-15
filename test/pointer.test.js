"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { load, makeCanvas, finite, plain } = require("./harness");

function startWithSpyEffect(canvasOptions, options = {}) {
  const h = load();
  const canvas = makeCanvas(canvasOptions);
  const seen = [];
  h.Glintwave.effects.spy = (dx, dy) => {
    seen.push({ x: 10 - dx, y: 10 - dy });
    return { x: 0, y: 0 };
  };
  const gw = new h.Glintwave(canvas, {
    fluidEffect: "spy",
    speed: 0,
    glitterDensity: 0,
    pointerRadius: 100000,
    ...options,
  });
  gw.glitter.list = [gw.glitter.makeGlitter(10, 10, gw.shape)];
  return { h, canvas, seen };
}

test("pointer position reaches the physics in canvas coordinates", () => {
  const cases = [
    {
      label: "offset canvas",
      canvas: { width: 800, height: 600, rect: { left: 100, top: 50, width: 800, height: 600 } },
      client: { clientX: 500, clientY: 350 },
      expected: { x: 400, y: 300 },
    },
    {
      label: "canvas displayed at half its pixel size",
      canvas: { width: 800, height: 600, rect: { left: 0, top: 0, width: 400, height: 300 } },
      client: { clientX: 200, clientY: 150 },
      expected: { x: 400, y: 300 },
    },
    {
      label: "offset canvas at pixelRatio 2",
      canvas: { width: 1600, height: 1200, rect: { left: 100, top: 50, width: 800, height: 600 } },
      options: { pixelRatio: 2 },
      client: { clientX: 500, clientY: 350 },
      expected: { x: 400, y: 300 },
    },
  ];
  for (const { label, canvas, options, client, expected } of cases) {
    const { h, canvas: c, seen } = startWithSpyEffect(canvas, options);
    c.dispatch("pointermove", { ...client, pointerType: "mouse" });
    h.step(0.05);
    assert.deepEqual(plain(seen[seen.length - 1]), expected, label);
  }
});

test("the pointer effect stops when the pointer leaves the canvas", () => {
  const { h, canvas, seen } = startWithSpyEffect({});
  canvas.dispatch("pointermove", { clientX: 300, clientY: 300, pointerType: "mouse" });
  h.step(0.05);
  const before = seen.length;
  assert.ok(before > 0);
  canvas.dispatch("pointerleave", {});
  h.step(0.1);
  assert.equal(seen.length, before);
});

test("a click burst is centered on the click in canvas coordinates", () => {
  const h = load();
  const canvas = makeCanvas({ width: 800, height: 600, rect: { left: 100, top: 50, width: 800, height: 600 } });
  const gw = new h.Glintwave(canvas, { clickBurst: true, speed: 0, glitterDensity: 0, burstRadius: 200 });
  const fleck = gw.glitter.makeGlitter(410, 300, gw.shape);
  gw.glitter.list = [fleck];
  canvas.dispatch("click", { clientX: 500, clientY: 350 });
  assert.ok(fleck.x > 410, `fleck at x=${fleck.x} was not pushed away from the click`);
});

test("pointer and click events without coordinates do not wipe out the flecks", () => {
  const h = load();
  const canvas = makeCanvas();
  const gw = new h.Glintwave(canvas, { speed: 0, clickBurst: true, pointerRadius: 100000, burstRadius: 100000 });
  const before = gw.glitter.list.length;
  canvas.dispatch("pointermove", { pointerType: "mouse" });
  canvas.dispatch("click", {});
  h.step(0.2);
  assert.equal(gw.glitter.list.length, before);
  assert.ok(gw.glitter.list.every(finite));
});

test("destroy removes every listener it added and stops the loop", () => {
  const h = load();
  const canvas = makeCanvas();
  const gw = new h.Glintwave(canvas, {});
  assert.ok(canvas.listenerCount() > 0);
  gw.destroy();
  assert.equal(canvas.listenerCount(), 0);
  assert.equal(h.isLoopAlive(), false);
});

test("pixelRatio 2 runs the scene in logical units: same fleck count, same bounds, scaled context", () => {
  const h = load();
  const canvas = makeCanvas({ width: 1600, height: 1200 });
  const gw = new h.Glintwave(canvas, { pixelRatio: 2, speed: 400, glitterDensity: 10 });
  assert.equal(gw.glitter.list.length, 30);
  h.step(10);
  assert.ok(gw.glitter.list.every((g) => g.x >= -20 && g.x <= 820 && g.y >= -20 && g.y <= 620));
  assert.deepEqual(canvas.ctx.transforms.at(-1), [2, 0, 0, 2, 0, 0]);
});
