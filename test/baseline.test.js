"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { load, makeCanvas, start } = require("./harness");

test("a fleck drifts 50px along its bearing in half a second at 100px/s", () => {
  const bearings = [
    { direction: 0, dx: 0, dy: -50 },
    { direction: 90, dx: 50, dy: 0 },
    { direction: 45, dx: 35.355, dy: -35.355 },
  ];
  for (const { direction, dx, dy } of bearings) {
    const { h, gw } = start({ direction, speed: 100 });
    const fleck = gw.glitter.makeGlitter(400, 300, gw.shape);
    gw.glitter.list = [fleck];
    h.step(1 / 60);
    h.step(0.5);
    assert.ok(Math.abs(fleck.x - (400 + dx)) < 0.5 && Math.abs(fleck.y - (300 + dy)) < 0.5, `bearing ${direction}`);
  }
});

test("Glintwave.effects is the live registry the physics reads, so a page can add an effect", () => {
  const h = load();
  let calls = 0;
  h.Glintwave.effects.nudge = () => {
    calls++;
    return { x: 0, y: 0 };
  };
  const gw = new h.Glintwave(makeCanvas(), { fluidEffect: "nudge", pointerRadius: 10000 });
  gw.pointer = { x: 400, y: 300 };
  h.step(0.1);
  assert.ok(calls > 0);
});

test("only the Glintwave constructor is added to the page's global scope", () => {
  const providedBySandbox = ["Math", "console", "requestAnimationFrame", "cancelAnimationFrame"];
  const added = Object.keys(load().sandbox).filter((key) => !providedBySandbox.includes(key));
  assert.deepEqual(added, ["Glintwave"]);
});
