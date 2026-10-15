(function (parts) {
  function axisSpan(origin, step, low, high) {
    if (Math.abs(step) < 1e-9) {
      return origin >= low && origin <= high ? { enter: -Infinity, exit: Infinity } : null;
    }
    var t1 = (low - origin) / step;
    var t2 = (high - origin) / step;
    return { enter: Math.min(t1, t2), exit: Math.max(t1, t2) };
  }

  // The physics rules for how a glitter fleck moves: constant drift in a
  // chosen direction, a direct distance-based push/pull toward or away from
  // the pointer, separation from other flecks, and a restore+absorb mechanic
  // that makes disturbances feel like tampering with a real fluid instead of
  // stretching an elastic.
  //
  // Every function here is pure and stateless — no config is stored on this
  // object, nothing here reads the DOM. The caller owns the live, UI-tunable
  // config and the fleck array, and passes both in each frame. That's what
  // keeps this file readable in isolation and easy to reuse (e.g. the same
  // rules could drive flecks owned by a completely different collection).
  var Flow = {
    // Converts a compass-style bearing (0 = up, 90 = right, 180 = down, 270 =
    // left, clockwise — the way a wind-direction dial usually reads) into the
    // unit vector the rest of this module works with, so direction can be any
    // angle, not just the four cardinal presets.
    directionFromDegrees: function (degrees) {
      var rad = (degrees * Math.PI) / 180;
      return { x: Math.sin(rad), y: -Math.cos(rad) };
    },

    // Turns the single "what kind of liquid" viscosity slider (0 = thin/
    // watery, 1 = thick/viscous) into the three derived rates the rest of this
    // module uses. Kept in one place so the relationship between them can't
    // drift out of sync as any of the three gets tuned.
    //   - forceDrag: how much of the pointer/separation push actually gets
    //     through — thick liquid resists being pushed at all.
    //   - restoreRate: how fast a fleck springs back toward its undisturbed
    //     position — thick liquid settles slowly and heavily.
    //   - absorbRate: how much a sustained disturbance permanently shifts that
    //     undisturbed position instead of fully undoing — thick liquid
    //     "remembers" more.
    deriveViscosity: function (viscosity) {
      return {
        forceDrag: 1 - viscosity * 0.6,
        restoreRate: 6 - viscosity * 5,
        absorbRate: 0.15 + viscosity * 0.6,
      };
    },

    paddedBounds: function (canvasWidth, canvasHeight, margin) {
      return { left: -margin, top: -margin, right: canvasWidth + margin, bottom: canvasHeight + margin };
    },

    lineSpanInRect: function (x, y, direction, rect) {
      var spanX = axisSpan(x, direction.x, rect.left, rect.right);
      var spanY = axisSpan(y, direction.y, rect.top, rect.bottom);
      if (!spanX || !spanY) return null;
      var enter = Math.max(spanX.enter, spanY.enter);
      var exit = Math.min(spanX.exit, spanY.exit);
      return enter <= exit ? { enter: enter, exit: exit } : null;
    },

    crossSection: function (direction, canvasWidth, canvasHeight) {
      return Math.abs(direction.y) * canvasWidth + Math.abs(direction.x) * canvasHeight;
    },

    upstreamSpawnPosition: function (direction, canvasWidth, canvasHeight, margin) {
      var offset = (Math.random() - 0.5) * Flow.crossSection(direction, canvasWidth, canvasHeight);
      var x = canvasWidth / 2 - direction.y * offset;
      var y = canvasHeight / 2 + direction.x * offset;
      var entry = Flow.lineSpanInRect(x, y, direction, Flow.paddedBounds(canvasWidth, canvasHeight, margin)).enter;
      return { x: x + direction.x * entry, y: y + direction.y * entry };
    },

    isOffscreen: function (g, direction, canvasWidth, canvasHeight, margin) {
      var span = Flow.lineSpanInRect(g.x, g.y, direction, Flow.paddedBounds(canvasWidth, canvasHeight, margin));
      return span === null || span.exit < 0;
    },

    // Constant drift: both the actual position and its "base" (undisturbed)
    // counterpart advance by the same amount, so an undisturbed fleck's actual
    // position always exactly tracks its base — the gap between them only
    // ever opens up from the forces below.
    applyDrift: function (g, direction, speed, dt) {
      var dx = direction.x * speed * dt;
      var dy = direction.y * speed * dt;
      g.x += dx;
      g.y += dy;
      g.baseX += dx;
      g.baseY += dy;
    },

    // Applies whichever named effect from FluidEffects (fluid-effects.js) is
    // currently selected, recomputed fresh every frame from the live cursor
    // position. Nothing here tracks state over time: once a fleck is outside
    // the radius, or the pointer is gone, the effect is simply zero on the
    // very next call.
    applyPointerForce: function (g, pointer, effectName, radius, strength, forceDrag, dt) {
      if (!pointer) return;
      var dx = g.x - pointer.x;
      var dy = g.y - pointer.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (!(dist > 0.01 && dist < radius)) return;
      var effect = parts.FluidEffects[effectName];
      if (!effect) return;
      var falloff = 1 - dist / radius;
      var delta = effect(dx, dy, dist, falloff, strength, forceDrag, dt);
      g.x += delta.x;
      g.y += delta.y;
    },

    // A one-time burst of a named effect at a point (e.g. a click), rather than
    // a continuous per-frame force following the cursor. Reuses the exact same
    // FluidEffects functions as applyPointerForce — passing dt=1 applies the
    // effect's full, undiluted strength once instead of scaling it down to a
    // per-second rate, which is what makes it read as an instant splash rather
    // than a lingering push.
    applyBurst: function (glitterList, origin, effectName, radius, strength, forceDrag) {
      var effect = parts.FluidEffects[effectName];
      if (!effect) return;
      for (var i = 0; i < glitterList.length; i++) {
        var g = glitterList[i];
        var dx = g.x - origin.x;
        var dy = g.y - origin.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (!(dist > 0.01 && dist < radius)) continue;
        var falloff = 1 - dist / radius;
        var delta = effect(dx, dy, dist, falloff, strength, forceDrag, 1);
        g.x += delta.x;
        g.y += delta.y;
      }
    },

    // Keeps flecks from stacking on the same pixel when converging: any two
    // closer than `minDistance` push apart. Same distance-based idea as the
    // pointer force above, just fleck-to-fleck instead of fleck-to-pointer.
    applySeparation: function (glitterList, minDistance, strength, forceDrag, dt) {
      for (var a = 0; a < glitterList.length; a++) {
        for (var b = a + 1; b < glitterList.length; b++) {
          var ga = glitterList[a];
          var gb = glitterList[b];
          var dx = ga.x - gb.x;
          var dy = ga.y - gb.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (!(dist > 0.01 && dist < minDistance)) continue;
          var falloff = 1 - dist / minDistance;
          var push = strength * falloff * dt * 0.5 * forceDrag;
          var nx = dx / dist;
          var ny = dy / dist;
          ga.x += nx * push;
          ga.y += ny * push;
          gb.x -= nx * push;
          gb.y -= ny * push;
        }
      }
    },

    // Absorb first, then restore. Absorb slowly pulls the fleck's base
    // (undisturbed) position toward wherever it actually is right now — a
    // brief push doesn't move base much before restore already pulls the
    // fleck back, but holding it away from base for a while drags base along
    // too, so restore afterward settles on a shifted position instead of the
    // original one. That's what makes a disturbance feel like it partially
    // sticks, the way a real fluid does, instead of fully undoing like a
    // stretched-and-released elastic.
    applyRestoreAndAbsorb: function (g, restoreRate, absorbRate, dt) {
      var absorb = Math.min(1, absorbRate * dt);
      var restore = Math.min(1, restoreRate * dt);
      g.baseX += (g.x - g.baseX) * absorb;
      g.baseY += (g.y - g.baseY) * absorb;
      g.x += (g.baseX - g.x) * restore;
      g.y += (g.baseY - g.y) * restore;
    },
  };

  parts.Flow = Flow;
})((globalThis.GlintwaveParts = globalThis.GlintwaveParts || {}));
