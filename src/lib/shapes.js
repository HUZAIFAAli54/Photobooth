/* Decorative motifs used by the frame builder.
 * Every motif is authored inside a 100x100 box centred on (0,0) and returned as
 * an SVG fragment, so a frame can drop one anywhere at any size/rotation. */
window.PB = window.PB || {};
(function () {
  "use strict";

  var PATHS = {
    heart:   "M0,-24 C-13,-49 -50,-37 -50,-7 C-50,20 -18,40 0,55 C18,40 50,20 50,-7 C50,-37 13,-49 0,-24 Z",
    star:    "M0,-52 L13.5,-16 L52,-16 L21,7.5 L33,45 L0,21.5 L-33,45 L-21,7.5 L-52,-16 L-13.5,-16 Z",
    sparkle: "M0,-52 C5,-16 16,-5 52,0 C16,5 5,16 0,52 C-5,16 -16,5 -52,0 C-16,-5 -5,-16 0,-52 Z",
    leaf:    "M0,-52 C32,-27 38,13 0,54 C-38,13 -32,-27 0,-52 Z",
    petal:   "M0,-50 C26,-30 26,10 0,46 C-26,10 -26,-30 0,-50 Z",
    diamond: "M0,-50 L38,0 L0,50 L-38,0 Z"
  };

  function attrs(fill, opacity, extra) {
    var s = ' fill="' + fill + '"';
    if (opacity != null && opacity !== 1) s += ' opacity="' + opacity + '"';
    return s + (extra || "");
  }

  /* kind, x, y, size(px), color, rotation(deg), opacity */
  function motif(kind, x, y, size, color, rot, opacity) {
    var k = size / 100;
    var open = '<g transform="translate(' + r2(x) + " " + r2(y) + ") rotate(" + (rot || 0) + ") scale(" + r3(k) + ')">';
    var body;

    switch (kind) {
      case "dot":
        body = '<circle r="34"' + attrs(color, opacity) + " />";
        break;

      case "ring":
        body =
          '<circle r="30" fill="none" stroke="' + color + '" stroke-width="9"' +
          (opacity != null ? ' opacity="' + opacity + '"' : "") + " />" +
          '<circle r="30" cx="34" cy="16" fill="none" stroke="' + color + '" stroke-width="9" opacity="' +
          (opacity != null ? opacity * 0.75 : 0.75) + '" />';
        break;

      case "balloon":
        body =
          '<path d="M0,-52 C26,-52 42,-30 42,-8 C42,17 19,38 0,50 C-19,38 -42,17 -42,-8 C-42,-30 -26,-52 0,-52 Z"' +
          attrs(color, opacity) + " />" +
          '<path d="M0,50 q9,13 0,24 q-9,11 0,22" fill="none" stroke="' + color +
          '" stroke-width="4" opacity="' + (opacity != null ? opacity * 0.7 : 0.7) + '" />';
        break;

      case "flower":
        body = "";
        for (var a = 0; a < 5; a++) {
          body += '<ellipse rx="15" ry="34" cy="-24" transform="rotate(' + a * 72 + ')"' + attrs(color, opacity) + " />";
        }
        body += '<circle r="12"' + attrs("#ffffff", opacity != null ? opacity : 0.9) + " />";
        break;

      case "gift":
        body =
          '<rect x="-40" y="-22" width="80" height="62" rx="6"' + attrs(color, opacity) + " />" +
          '<rect x="-46" y="-38" width="92" height="20" rx="5"' + attrs(color, opacity) + " />" +
          '<rect x="-7" y="-38" width="14" height="78"' + attrs("#ffffff", opacity != null ? opacity * 0.85 : 0.85) + " />";
        break;

      case "cap": /* graduation cap */
        body =
          '<path d="M0,-34 L58,-8 L0,18 L-58,-8 Z"' + attrs(color, opacity) + " />" +
          '<path d="M-30,2 L-30,30 C-30,42 30,42 30,30 L30,2 L0,24 Z"' +
          attrs(color, opacity != null ? opacity * 0.8 : 0.8) + " />" +
          '<path d="M52,-4 L52,34" fill="none" stroke="' + color + '" stroke-width="5" />' +
          '<circle cx="52" cy="38" r="7"' + attrs(color, opacity) + " />";
        break;

      case "snow":
        body = "";
        for (var s = 0; s < 3; s++) {
          body +=
            '<g transform="rotate(' + s * 60 + ')">' +
            '<path d="M0,-48 L0,48" stroke="' + color + '" stroke-width="7" stroke-linecap="round" fill="none" />' +
            '<path d="M0,-34 L-14,-46 M0,-34 L14,-46 M0,34 L-14,46 M0,34 L14,46" stroke="' + color +
            '" stroke-width="6" stroke-linecap="round" fill="none" />' +
            "</g>";
        }
        if (opacity != null) body = '<g opacity="' + opacity + '">' + body + "</g>";
        break;

      case "bar": /* confetti stick */
        body = '<rect x="-9" y="-30" width="18" height="60" rx="9"' + attrs(color, opacity) + " />";
        break;

      case "cake":
        body =
          '<rect x="-44" y="-4" width="88" height="44" rx="8"' + attrs(color, opacity) + " />" +
          '<rect x="-44" y="-22" width="88" height="22" rx="8"' +
          attrs(color, opacity != null ? opacity * 0.75 : 0.75) + " />" +
          '<rect x="-4" y="-52" width="8" height="30" rx="4"' + attrs(color, opacity) + " />" +
          '<circle cy="-58" r="9"' + attrs("#ffd166", opacity) + " />";
        break;

      default:
        body = '<path d="' + (PATHS[kind] || PATHS.dot || "") + '"' + attrs(color, opacity) + " />";
        if (!PATHS[kind]) body = '<circle r="30"' + attrs(color, opacity) + " />";
    }

    return open + body + "</g>";
  }

  function r2(n) { return Math.round(n * 100) / 100; }
  function r3(n) { return Math.round(n * 1000) / 1000; }

  /* Deterministic pseudo-random so a frame looks identical every render. */
  function seeded(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function escapeXml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  PB.motif = motif;
  PB.seeded = seeded;
  PB.hashString = hashString;
  PB.escapeXml = escapeXml;
  PB.MOTIF_KINDS = ["dot", "ring", "balloon", "flower", "gift", "cap", "snow", "bar", "cake", "heart", "star", "sparkle", "leaf", "petal", "diamond"];
})();
