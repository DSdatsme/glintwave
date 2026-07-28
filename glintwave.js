// The public API: `new Glintwave(canvas, options)`.
//
// Resolves options against sensible defaults, creates its own glitter shape
// and collection (so multiple instances on one page never share state), and
// runs its own render loop. `setOptions()` lets a host page change any of
// these live; `destroy()` stops the loop and removes its listeners.
//
// The option surface is deliberately small — a curated set of the knobs that
// actually change the look/feel (direction, speed, viscosity, color/size,
// pointer interaction), not every internal implementation constant.
var GLINTWAVE_DEFAULTS = {
  background: "#0a0a0f", // any CSS color — always painted, no transparent special case
  direction: 90, // degrees, clockwise from up (0 = up, 90 = right, 180 = down, 270 = left)
  speed: 120, // px/sec
  viscosity: 0.5, // 0 = thin/watery, 1 = thick/viscous — see Flow.deriveViscosity
  minSize: 1.4,
  maxSize: 2.4,
  glitterColors: [
    { color: "#fff8dc", density: 0.5 },
    { color: "#f5d98b", density: 0.3 },
    { color: "#ffd700", density: 0.2 },
  ],
  glitterDensity: 10, // flecks per 400x400px of canvas area — resolution-independent, not a flat count
  fluidEffect: "repel", // a key into FluidEffects (fluid-effects.js)
  pointerRadius: 150,
  pointerStrength: 200,
  clickBurst: false, // disabled for now — buggy, needs investigation before re-enabling
  burstRadius: null, // null = derived as pointerRadius * 1.5, see _resolveOptions
  burstStrength: 120,
};

// Not exposed as an option — a secondary tuning knob for how firmly
// converged flecks push apart, rather than a primary visual concept.
var GLINTWAVE_SEPARATION_STRENGTH = 150;

// Switching tabs/apps away and back can produce a multi-second gap between
// animation frames — without this cap, that single huge dt would both dump a
// burst of "missed" spawns in one frame and advance every fleck by the same
// huge distance, producing a line of flecks that all share one position
// along the drift axis.
var GLINTWAVE_MAX_DT = 0.1;

function Glintwave(canvas, options) {
  this.canvas = canvas;
  this.ctx = canvas.getContext("2d");
  // Kept separate from `this.options` (the resolved/derived working set):
  // this is only ever what the consumer actually passed in, across every
  // setOptions() call. Re-resolving from this each time — rather than from
  // the previous resolved output — is what lets a derived default like
  // burstRadius keep following pointerRadius; resolving from stale resolved
  // output would "freeze" it the moment it was first computed.
  this._explicitOptions = options || {};
  this.options = this._resolveOptions(this._explicitOptions);
  this.shape = createGlitterShape(this.options);
  this.glitter = createGlitterCollection();
  this.pointer = null;
  this._lastTime = null;
  this._rafId = null;

  this._onPointerMove = this._onPointerMove.bind(this);
  this._onPointerLeave = this._onPointerLeave.bind(this);
  this._onClick = this._onClick.bind(this);
  this._loop = this._loop.bind(this);

  canvas.addEventListener("mousemove", this._onPointerMove);
  canvas.addEventListener("mouseleave", this._onPointerLeave);
  canvas.addEventListener("click", this._onClick);

  this._seedInitial();
  this._rafId = requestAnimationFrame(this._loop);
}

Glintwave.prototype._resolveOptions = function (options) {
  var resolved = {};
  for (var key in GLINTWAVE_DEFAULTS) {
    resolved[key] = options[key] !== undefined ? options[key] : GLINTWAVE_DEFAULTS[key];
  }
  resolved.burstRadius = options.burstRadius !== undefined ? options.burstRadius : resolved.pointerRadius * 1.5;
  resolved.directionVector = Flow.directionFromDegrees(resolved.direction);
  return resolved;
};

// Merges partial changes into the current options, re-resolving derived
// values (directionVector, default burstRadius). If the change affects
// appearance (color/size), every existing fleck is re-rolled immediately
// with the new shape — a live customizer should show the effect of a change
// on the whole scene right away, not only on flecks spawned from here on.
// Without this, changing colors while the spawn rate is low could look like
// nothing happened for a long time, since the (many) already-on-screen
// flecks would keep whatever color/size they were created with.
Glintwave.prototype.setOptions = function (partial) {
  var merged = {};
  for (var key in this._explicitOptions) merged[key] = this._explicitOptions[key];
  for (var k in partial) merged[k] = partial[k];
  this._explicitOptions = merged;
  this.options = this._resolveOptions(merged);
  this.shape = createGlitterShape(this.options);

  if (partial.glitterColors !== undefined || partial.minSize !== undefined || partial.maxSize !== undefined) {
    var shape = this.shape;
    var list = this.glitter.list;
    for (var i = 0; i < list.length; i++) {
      list[i].color = shape.randomColor();
      list[i].size = shape.randomSize();
    }
  }
};

Glintwave.prototype._glitterCountForArea = function () {
  var area = this.canvas.width * this.canvas.height;
  return Math.max(1, Math.round((area / (400 * 400)) * this.options.glitterDensity));
};

// Derived, not stored: however many flecks the density option wants, spread
// evenly over the time it takes one fleck to cross the canvas.
Glintwave.prototype._spawnIntervalSec = function () {
  var diag = Math.sqrt(this.canvas.width * this.canvas.width + this.canvas.height * this.canvas.height);
  var secondsToCross = diag / this.options.speed;
  return secondsToCross / this._glitterCountForArea();
};

// Fills the canvas at construction time so it doesn't start empty and take
// several seconds to fill up via normal spawning — scattered across the full
// area rather than just the upstream edge, at the same count the density
// option targets.
Glintwave.prototype._seedInitial = function () {
  var count = this._glitterCountForArea();
  for (var i = 0; i < count; i++) {
    var x = Math.random() * this.canvas.width;
    var y = Math.random() * this.canvas.height;
    this.glitter.list.push(this.glitter.makeGlitter(x, y, this.shape));
  }
};

Glintwave.prototype._onPointerMove = function (e) {
  this.pointer = { x: e.clientX, y: e.clientY };
};

Glintwave.prototype._onPointerLeave = function () {
  this.pointer = null;
};

Glintwave.prototype._onClick = function (e) {
  if (!this.options.clickBurst) return;
  var viscosity = Flow.deriveViscosity(this.options.viscosity);
  var origin = { x: e.clientX, y: e.clientY };
  Flow.applyBurst(
    this.glitter.list,
    origin,
    this.options.fluidEffect,
    this.options.burstRadius,
    this.options.burstStrength,
    viscosity.forceDrag
  );
};

Glintwave.prototype._loop = function (time) {
  var dt = this._lastTime === null ? 0 : Math.min((time - this._lastTime) / 1000, GLINTWAVE_MAX_DT);
  this._lastTime = time;

  var o = this.options;
  var viscosity = Flow.deriveViscosity(o.viscosity);
  var direction = o.directionVector;
  var list = this.glitter.list;

  this.glitter.spawnTimer += dt;
  var spawnInterval = this._spawnIntervalSec();
  while (this.glitter.spawnTimer >= spawnInterval) {
    this.glitter.spawnTimer -= spawnInterval;
    this.glitter.spawn(direction, this.canvas.width, this.canvas.height, this.shape);
  }

  for (var i = 0; i < list.length; i++) {
    var g = list[i];
    Flow.applyDrift(g, direction, o.speed, dt);
    g.sparklePhase += dt * 3;
    Flow.applyPointerForce(g, this.pointer, o.fluidEffect, o.pointerRadius, o.pointerStrength, viscosity.forceDrag, dt);
  }

  Flow.applySeparation(list, this.shape.minSeparation(), GLINTWAVE_SEPARATION_STRENGTH, viscosity.forceDrag, dt);

  for (var k = 0; k < list.length; k++) {
    Flow.applyRestoreAndAbsorb(list[k], viscosity.restoreRate, viscosity.absorbRate, dt);
  }

  this.glitter.removeOffscreen(direction, this.canvas.width, this.canvas.height);

  var ctx = this.ctx;
  ctx.fillStyle = o.background;
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  for (var j = 0; j < list.length; j++) {
    var gj = list[j];
    this.shape.draw(ctx, gj.x, gj.y, gj.size, gj.color, gj.sparklePhase);
  }

  this._rafId = requestAnimationFrame(this._loop);
};

Glintwave.prototype.destroy = function () {
  cancelAnimationFrame(this._rafId);
  this.canvas.removeEventListener("mousemove", this._onPointerMove);
  this.canvas.removeEventListener("mouseleave", this._onPointerLeave);
  this.canvas.removeEventListener("click", this._onClick);
};
