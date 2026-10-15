"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { load, makeCanvas } = require("./harness");

const HELPERS = ["glitter-shape.js", "fluid-effects.js", "flow.js", "glitter-collection.js"];

test("the helper scripts can be loaded in any order before glintwave.js", () => {
  const orders = [
    ["flow.js", "glitter-collection.js", "fluid-effects.js", "glitter-shape.js"],
    ["glitter-collection.js", "flow.js", "glitter-shape.js", "fluid-effects.js"],
  ];
  for (const order of orders) {
    const canvas = makeCanvas();
    const h = load([...order, "glintwave.js"]);
    new h.Glintwave(canvas, {});
    canvas.dispatch("pointermove", { clientX: 300, clientY: 300 });
    assert.doesNotThrow(() => h.step(1), order.join(", "));
  }
});

test("loading glintwave.js without a helper throws a message that names the helpers", () => {
  const message = /load glitter-shape\.js, fluid-effects\.js, flow\.js and glitter-collection\.js/;
  for (const missing of HELPERS) {
    const files = HELPERS.filter((file) => file !== missing);
    assert.throws(() => load([...files, "glintwave.js"]), message, missing);
  }
});
