// Creates the "what does a glitter fleck look like" definition for one
// Glintwave instance, from its resolved size/color options. A factory
// function (not a shared singleton) so multiple instances on the same page
// can each have their own look without stepping on each other.
function createGlitterShape(options) {
  var minSize = options.minSize;
  var maxSize = options.maxSize;
  var colors = options.glitterColors; // [{ color, density }, ...]

  var totalDensity = 0;
  for (var i = 0; i < colors.length; i++) totalDensity += colors[i].density;

  return {
    // A random size within [minSize, maxSize] for a newly spawned fleck.
    randomSize: function () {
      return minSize + Math.random() * (maxSize - minSize);
    },

    // A random color, weighted by each entry's density share — e.g. gold at
    // 50%, silver at 30%, pink at 20% means roughly that split across all
    // flecks, not one fixed color for everything.
    randomColor: function () {
      var r = Math.random() * totalDensity;
      var running = 0;
      for (var i = 0; i < colors.length; i++) {
        running += colors[i].density;
        if (r <= running) return colors[i].color;
      }
      return colors[colors.length - 1].color;
    },

    // A glitter fleck: a bright core fading out to nothing (not a flat filled
    // circle), with a sparkle/twinkle that pulses its size and brightness
    // over time via sparklePhase (radians, owned and advanced by the caller
    // each frame). The core is the fleck's own color lightened toward white,
    // not a fixed white — a hardcoded white core would visually dominate a
    // fleck this small regardless of its actual color (e.g. a black fleck
    // would still look white), since the core is most of what you can see at
    // this size.
    draw: function (ctx, x, y, size, color, sparklePhase) {
      var intensity = 0.5 + 0.5 * Math.sin(sparklePhase || 0);
      var r = size * (0.75 + 0.5 * intensity);
      var rgb = hexToRgb(color);
      var highlight = lighten(rgb, 0.7);

      var gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(
        0,
        "rgba(" + highlight.r + ", " + highlight.g + ", " + highlight.b + ", " + (0.6 + 0.4 * intensity) + ")"
      );
      gradient.addColorStop(
        0.4,
        "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + (0.5 + 0.3 * intensity) + ")"
      );
      gradient.addColorStop(1, "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    },

    // Minimum center-to-center distance for two flecks of this shape's
    // smallest size to not visually overlap, plus a little breathing room —
    // used by Flow.applySeparation for the converge effect.
    minSeparation: function () {
      return minSize * 2 + 2;
    },
  };
}

function hexToRgb(hex) {
  var clean = hex.charAt(0) === "#" ? hex.slice(1) : hex;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// Blends a color toward white by `amount` (0 = unchanged, 1 = pure white) —
// used for the sparkle core so the highlight stays tinted by the fleck's
// actual color instead of washing out to a fixed white.
function lighten(rgb, amount) {
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * amount),
    g: Math.round(rgb.g + (255 - rgb.g) * amount),
    b: Math.round(rgb.b + (255 - rgb.b) * amount),
  };
}
