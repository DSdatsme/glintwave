"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { load, start, visible } = require("./harness");

test("the configured density holds once the scene has filled, for any direction and canvas shape", () => {
  const cases = [
    { width: 1920, height: 1080, direction: 90, glitterDensity: 20 },
    { width: 1920, height: 1080, direction: 45, glitterDensity: 20 },
    { width: 1280, height: 720, direction: 200, glitterDensity: 44 },
  ];
  for (const { width, height, direction, glitterDensity } of cases) {
    const { h, gw } = start({ direction, glitterDensity, speed: 400 }, { width, height });
    const target = Math.round(((width * height) / (400 * 400)) * glitterDensity);
    const counts = [];
    const lengths = [];
    h.step(10);
    for (let second = 0; second < 10; second++) {
      h.step(1);
      counts.push(visible(gw));
      lengths.push(gw.glitter.list.length);
    }
    const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length;
    const label = `${width}x${height} at ${direction}deg`;
    assert.ok(Math.abs(mean - target) / target < 0.12, `${label}: mean visible ${mean.toFixed(1)}, target ${target}`);
    assert.ok(Math.max(...lengths) <= target * 1.25, `${label}: live flecks peaked at ${Math.max(...lengths)}`);
  }
});

test("a fleck is offscreen once it has passed the canvas or can never cross it", () => {
  const cases = [
    { label: "past the downstream edge", degrees: 90, at: { x: 900, y: 300 }, gone: true },
    { label: "upstream, about to enter", degrees: 90, at: { x: -50, y: 300 }, gone: false },
    { label: "beside the canvas, moving parallel (above)", degrees: 90, at: { x: 400, y: -50 }, gone: true },
    { label: "beside the canvas, moving parallel (below)", degrees: 90, at: { x: 400, y: 650 }, gone: true },
    { label: "inside", degrees: 90, at: { x: 400, y: 300 }, gone: false },
    { label: "diagonal, upstream, will cross", degrees: 45, at: { x: -300, y: 400 }, gone: false },
    { label: "diagonal, past the right edge", degrees: 45, at: { x: 900, y: 700 }, gone: true },
    { label: "within the margin", degrees: 90, at: { x: 810, y: 300 }, margin: 20, gone: false },
    { label: "beyond the margin", degrees: 90, at: { x: 830, y: 300 }, margin: 20, gone: true },
  ];
  const { Flow } = load().parts;
  for (const { label, degrees, at, margin = 0, gone } of cases) {
    assert.equal(Flow.isOffscreen(at, Flow.directionFromDegrees(degrees), 800, 600, margin), gone, label);
  }
});

test("flecks spawn hidden and then cross the canvas, for any bearing", () => {
  const { Flow } = load().parts;
  const margin = 10;
  for (const degrees of [0, 45, 90, 200]) {
    const direction = Flow.directionFromDegrees(degrees);
    for (let i = 0; i < 300; i++) {
      let { x, y } = Flow.upstreamSpawnPosition(direction, 800, 600, margin);
      const label = `bearing ${degrees}, spawned at ${x.toFixed(0)},${y.toFixed(0)}`;
      assert.ok(x < 0 || x > 800 || y < 0 || y > 600, `${label}: visible at spawn`);
      let entered = false;
      for (let step = 0; step < 2000 && !entered; step++) {
        x += direction.x;
        y += direction.y;
        entered = x >= -margin && x <= 800 + margin && y >= -margin && y <= 600 + margin;
      }
      assert.ok(entered, `${label}: never reaches the canvas`);
    }
  }
});
