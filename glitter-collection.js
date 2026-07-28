// Creates a glitter collection for one Glintwave instance: owns the live
// array and its spawn/despawn lifecycle. Doesn't know the details of how a
// fleck looks or the physics rules that move it — it just creates fleck
// objects using whatever `shape` (from createGlitterShape) is handed to it,
// and asks Flow where they should appear and whether they've left. A factory
// (not a shared singleton) so multiple instances don't share one array.
//
// `shape` is a parameter on makeGlitter/spawn, NOT captured in a closure
// here — the caller (Glintwave) always passes its current `this.shape`. A
// captured shape would go stale the moment setOptions() replaced it with a
// new one (e.g. after a color change), so every fleck spawned afterward
// would silently keep using the old shape.
function createGlitterCollection() {
  return {
    list: [],
    spawnTimer: 0,

    makeGlitter: function (x, y, shape) {
      return {
        x: x,
        y: y,
        // baseX/baseY are this fleck's undisturbed position — see the
        // comment on Flow.applyDrift/applyRestoreAndAbsorb for what they're
        // for.
        baseX: x,
        baseY: y,
        sparklePhase: Math.random() * Math.PI * 2,
        size: shape.randomSize(),
        color: shape.randomColor(),
      };
    },

    spawn: function (direction, canvasWidth, canvasHeight, shape) {
      var pos = Flow.upstreamSpawnPosition(direction, canvasWidth, canvasHeight);
      this.list.push(this.makeGlitter(pos.x, pos.y, shape));
    },

    removeOffscreen: function (direction, canvasWidth, canvasHeight) {
      this.list = this.list.filter(function (g) {
        return !Flow.isOffscreen(g, direction, canvasWidth, canvasHeight, g.size);
      });
    },
  };
}
