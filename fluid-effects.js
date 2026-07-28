// Named pointer-interaction effects. Each one takes the vector from the
// pointer to a glitter fleck (dx, dy, dist), how strong the effect should be
// at that distance (falloff, 0..1), and the live strength/drag/dt values,
// and returns the position delta to apply for this frame.
//
// Kept as its own registry (rather than an if/else inside flow.js) so adding
// a new effect later is just adding a new named entry here — nothing in
// flow.js or the main loop needs to change to support it.
var FluidEffects = {
  // Pushes the fleck directly away from the pointer.
  repel: function (dx, dy, dist, falloff, strength, forceDrag, dt) {
    var push = strength * falloff * dt * forceDrag;
    return { x: (dx / dist) * push, y: (dy / dist) * push };
  },

  // Pulls the fleck directly toward the pointer — the exact opposite of
  // repel, same falloff/strength shape.
  attract: function (dx, dy, dist, falloff, strength, forceDrag, dt) {
    var push = strength * falloff * dt * forceDrag;
    return { x: -(dx / dist) * push, y: -(dy / dist) * push };
  },
};
