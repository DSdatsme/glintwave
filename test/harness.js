"use strict";

const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SOURCE_FILES = ["glitter-shape.js", "fluid-effects.js", "flow.js", "glitter-collection.js", "glintwave.js"];

function makeContext() {
  const ctx = {
    fillStyle: "",
    transforms: [],
    stops: [],
    fillRect() {},
    beginPath() {},
    fill() {},
    setTransform(...args) {
      ctx.transforms.push(args);
    },
    arc(_x, _y, r) {
      if (r < 0) throw new Error("IndexSizeError: negative radius " + r);
    },
    createRadialGradient(_x0, _y0, r0, _x1, _y1, r1) {
      if (r0 < 0 || r1 < 0) throw new Error("IndexSizeError: negative radius");
      return {
        addColorStop(_offset, color) {
          if (/NaN|undefined|null/.test(color)) throw new Error("SyntaxError: unparsable color " + color);
          ctx.stops.push(color);
        },
      };
    },
  };
  return ctx;
}

function makeCanvas({ width = 800, height = 600, rect } = {}) {
  const listeners = {};
  const ctx = makeContext();
  const canvas = {
    width,
    height,
    rect: rect || { left: 0, top: 0, width, height },
    ctx,
    getContext: () => ctx,
    getBoundingClientRect: () => canvas.rect,
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || new Set()).add(fn);
    },
    removeEventListener(type, fn) {
      if (listeners[type]) listeners[type].delete(fn);
    },
    dispatch(type, event) {
      (listeners[type] ? [...listeners[type]] : []).forEach((fn) => fn(event));
    },
    listenerCount: () => Object.values(listeners).reduce((sum, set) => sum + set.size, 0),
  };
  return canvas;
}

function load(files = SOURCE_FILES) {
  const parts = {};
  const warnings = [];
  let pendingFrame = null;
  let time = 0;

  const sandbox = {
    Math,
    GlintwaveParts: parts,
    console: { warn: (...args) => warnings.push(args.join(" ")) },
    requestAnimationFrame(cb) {
      pendingFrame = cb;
      return 1;
    },
    cancelAnimationFrame() {
      pendingFrame = null;
    },
  };
  const context = vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
  }

  return {
    sandbox,
    Glintwave: sandbox.Glintwave,
    parts,
    warnings,
    step(seconds, fps = 60) {
      const frames = Math.round(seconds * fps);
      for (let i = 0; i < frames; i++) {
        if (!pendingFrame) throw new Error("render loop is dead: no frame pending");
        const frame = pendingFrame;
        pendingFrame = null;
        time += 1000 / fps;
        frame(time);
      }
    },
    isLoopAlive: () => pendingFrame !== null,
  };
}

function start(options = {}, canvasOptions = {}) {
  const h = load();
  const canvas = makeCanvas(canvasOptions);
  return { h, canvas, gw: new h.Glintwave(canvas, options) };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

const finite = (g) => Number.isFinite(g.x) && Number.isFinite(g.y);

const visible = (gw, w = gw.canvas.width, h = gw.canvas.height) =>
  gw.glitter.list.filter((g) => g.x >= 0 && g.x <= w && g.y >= 0 && g.y <= h).length;

module.exports = { load, makeCanvas, start, finite, visible, plain };
