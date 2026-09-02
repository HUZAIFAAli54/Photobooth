/* Frame builder.
 *
 * A frame is generated as a self-contained SVG string with a transparent
 * middle, so the very same asset can be used three ways with no drift:
 *   - as an <img> overlay on the live camera preview,
 *   - drawn onto the export canvas for the final photo/GIF,
 *   - drawn per-frame into the recorded video.
 *
 * Frames are built from the event's palette + motifs, so every event gets its
 * own themed set of 8 without shipping a single image file. */
window.PB = window.PB || {};
(function () {
  "use strict";

  var FRAME_STYLES = [
    { id: "none",     name: "No frame" },
    { id: "band",     name: "Classic" },
    { id: "polaroid", name: "Polaroid" },
    { id: "ribbon",   name: "Ribbon" },
    { id: "corners",  name: "Corners" },
    { id: "confetti", name: "Confetti" },
    { id: "arch",     name: "Arch" },
    { id: "sparkle",  name: "Sparkle" },
    { id: "badge",    name: "Badge" }
  ];

  var SANS = "Segoe UI, Helvetica Neue, Arial, sans-serif";
  var SERIF = "Georgia, Times New Roman, serif";

  function esc(s) { return PB.escapeXml(s); }
  function n(v) { return Math.round(v * 100) / 100; }

  /* Outer rectangle minus an inner rectangle => a mat/border, drawn as one path. */
  function mat(w, h, l, t, r, b) {
    return (
      "M0 0 H" + n(w) + " V" + n(h) + " H0 Z " +
      "M" + n(l) + " " + n(t) + " H" + n(w - r) + " V" + n(h - b) + " H" + n(l) + " Z"
    );
  }

  function text(str, x, y, size, fill, opts) {
    if (!str) return "";
    opts = opts || {};
    return (
      '<text x="' + n(x) + '" y="' + n(y) + '" fill="' + fill +
      '" font-family="' + (opts.font || SANS) + '"' +
      ' font-size="' + n(size) + '" font-weight="' + (opts.weight || 700) + '"' +
      ' text-anchor="' + (opts.anchor || "middle") + '"' +
      ' letter-spacing="' + n(opts.tracking != null ? opts.tracking : size * 0.02) + '"' +
      (opts.style ? ' font-style="' + opts.style + '"' : "") +
      ">" + esc(str) + "</text>"
    );
  }

  /* ---- the eight looks --------------------------------------------------- */

  function build(style, c) {
    var w = c.w, h = c.h;
    var u = Math.min(w, h) / 100;          /* one design unit */
    var pal = c.pal;
    var rnd = PB.seeded(c.seed);
    var pick = function (arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; };
    var out = "";

    if (style === "band") {
      var bw = u * 3.4;                    /* side border  */
      var bh = u * 15;                     /* caption band */
      out += '<path d="' + mat(w, h, bw, bw, bw, bh) + '" fill="' + pal.a + '" fill-rule="evenodd" />';
      out += '<rect x="' + n(bw * 0.55) + '" y="' + n(bw * 0.55) + '" width="' + n(w - bw * 1.1) +
        '" height="' + n(h - bw * 0.55 - bh * 0.55) + '" fill="none" stroke="' + pal.light +
        '" stroke-width="' + n(u * 0.5) + '" opacity="0.55" />';
      out += text(c.caption, w / 2, h - bh * 0.42, u * 7, pal.light, { font: c.font, tracking: u * 0.5 });
      out += text(c.sub, w / 2, h - bh * 0.13, u * 3.6, pal.light, { weight: 500, tracking: u * 0.9 });
      out += PB.motif(c.motifs[0], bw + u * 7, h - bh * 0.5, u * 9, pal.b, -12, 0.95);
      out += PB.motif(c.motifs[1 % c.motifs.length], w - bw - u * 7, h - bh * 0.5, u * 9, pal.b, 12, 0.95);
    }

    else if (style === "polaroid") {
      var p = u * 5, pb = u * 20;
      out += '<path d="' + mat(w, h, p, p, p, pb) + '" fill="' + pal.light + '" fill-rule="evenodd" />';
      out += '<rect x="' + n(p) + '" y="' + n(p) + '" width="' + n(w - p * 2) + '" height="' + n(h - p - pb) +
        '" fill="none" stroke="rgba(0,0,0,0.14)" stroke-width="' + n(u * 0.4) + '" />';
      out += text(c.caption, w / 2, h - pb * 0.44, u * 7.4, pal.ink, { font: c.font, tracking: u * 0.3 });
      out += text(c.sub, w / 2, h - pb * 0.16, u * 3.6, pal.ink, { weight: 500, tracking: u * 0.9, style: "italic" });
      out += PB.motif(c.motifs[0], p + u * 6, h - pb * 0.55, u * 8, pal.a, -10, 0.9);
      out += PB.motif(c.motifs[c.motifs.length - 1], w - p - u * 6, h - pb * 0.55, u * 8, pal.a, 10, 0.9);
    }

    else if (style === "ribbon") {
      var t = u * 2;
      out += '<path d="' + mat(w, h, t, t, t, t) + '" fill="' + pal.a + '" fill-rule="evenodd" opacity="0.95" />';
      out += '<rect x="' + n(t * 2.2) + '" y="' + n(t * 2.2) + '" width="' + n(w - t * 4.4) +
        '" height="' + n(h - t * 4.4) + '" fill="none" stroke="' + pal.b +
        '" stroke-width="' + n(u * 0.6) + '" opacity="0.85" />';
      /* corner ribbon */
      var rl = u * 34;
      out += '<path d="M0 0 H' + n(rl) + ' L0 ' + n(rl) + ' Z" fill="' + pal.a + '" />';
      out += '<g transform="translate(' + n(rl * 0.30) + " " + n(rl * 0.30) + ') rotate(-45)">' +
        text(c.badge || "EVENT", 0, 0, u * 4.2, pal.light, { tracking: u * 1.2 }) + "</g>";
      /* caption pill */
      var pw = Math.min(w * 0.72, u * 8 * Math.max(6, (c.caption || "").length) * 0.62 + u * 16);
      var ph = u * 15, py = h - ph - u * 5;
      out += '<rect x="' + n((w - pw) / 2) + '" y="' + n(py) + '" width="' + n(pw) + '" height="' + n(ph) +
        '" rx="' + n(ph / 2) + '" fill="' + pal.a + '" opacity="0.94" />';
      out += text(c.caption, w / 2, py + ph * 0.46, u * 6.4, pal.light, { font: c.font });
      out += text(c.sub, w / 2, py + ph * 0.82, u * 3.4, pal.light, { weight: 500, tracking: u * 0.8 });
    }

    else if (style === "corners") {
      var m = u * 2.2;
      out += '<rect x="' + n(m) + '" y="' + n(m) + '" width="' + n(w - m * 2) + '" height="' + n(h - m * 2) +
        '" fill="none" stroke="' + pal.a + '" stroke-width="' + n(u * 1.5) + '" />';
      var corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
      for (var i = 0; i < corners.length; i++) {
        var sx = corners[i][0], sy = corners[i][1];
        var cx = sx > 0 ? u * 13 : w - u * 13;
        var cy = sy > 0 ? u * 13 : h - u * 13;
        out += PB.motif(c.motifs[i % c.motifs.length], cx, cy, u * 17, pal.a, (i * 37) % 40 - 20, 0.96);
        out += PB.motif(c.motifs[(i + 1) % c.motifs.length], cx + sx * u * 11, cy + sy * u * 10, u * 9, pal.b, -20 + i * 15, 0.9);
        out += PB.motif("dot", cx - sx * u * 9, cy + sy * u * 11, u * 4, pal.b, 0, 0.8);
      }
      out += text(c.caption, w / 2, h - u * 8, u * 6.4, pal.light, { font: c.font });
    }

    else if (style === "confetti") {
      var kinds = c.motifs.concat(["dot", "bar", "dot"]);
      var cols = [pal.a, pal.b, pal.light, pal.a];
      for (var k = 0; k < 46; k++) {
        var edgeTop = rnd() < 0.5;
        var x = rnd() * w;
        var y = edgeTop ? rnd() * h * 0.2 : h - rnd() * h * 0.24;
        var size = u * (3.5 + rnd() * 7);
        out += PB.motif(pick(kinds), x, y, size, pick(cols), Math.floor(rnd() * 360), 0.55 + rnd() * 0.45);
      }
      out += '<rect x="0" y="' + n(h - u * 17) + '" width="' + n(w) + '" height="' + n(u * 17) +
        '" fill="' + pal.ink + '" opacity="0.55" />';
      out += text(c.caption, w / 2, h - u * 7.6, u * 7, pal.light, { font: c.font });
      out += text(c.sub, w / 2, h - u * 2.8, u * 3.4, pal.light, { weight: 500, tracking: u * 0.9 });
    }

    else if (style === "arch") {
      var ix = u * 7, iy = u * 7, ib = u * 22;
      var x0 = ix, x1 = w - ix, y1 = h - ib;
      var rx = (x1 - x0) / 2;
      var yArc = iy + rx;
      var d =
        "M0 0 H" + n(w) + " V" + n(h) + " H0 Z " +
        "M" + n(x0) + " " + n(y1) + " V" + n(yArc) +
        " A" + n(rx) + " " + n(rx) + " 0 0 1 " + n(x1) + " " + n(yArc) +
        " V" + n(y1) + " Z";
      out += '<path d="' + d + '" fill="' + pal.a + '" fill-rule="evenodd" />';
      out += '<path d="M' + n(x0 - u * 1.6) + " " + n(y1) + " V" + n(yArc) +
        " A" + n(rx + u * 1.6) + " " + n(rx + u * 1.6) + " 0 0 1 " + n(x1 + u * 1.6) + " " + n(yArc) +
        " V" + n(y1) + '" fill="none" stroke="' + pal.b + '" stroke-width="' + n(u * 0.8) + '" opacity="0.9" />';
      out += text(c.caption, w / 2, h - ib * 0.5, u * 7.6, pal.light, { font: c.font, tracking: u * 0.4 });
      out += text(c.sub, w / 2, h - ib * 0.18, u * 3.6, pal.light, { weight: 500, tracking: u * 1 });
      out += PB.motif(c.motifs[0], w * 0.5, iy * 0.55 + u * 2, u * 9, pal.b, 0, 0.95);
    }

    else if (style === "sparkle") {
      var e = u * 3;
      out += '<path d="' + mat(w, h, e, e, e, e) + '" fill="' + pal.ink + '" fill-rule="evenodd" opacity="0.9" />';
      out += '<rect x="' + n(e * 1.6) + '" y="' + n(e * 1.6) + '" width="' + n(w - e * 3.2) + '" height="' + n(h - e * 3.2) +
        '" fill="none" stroke="' + pal.b + '" stroke-width="' + n(u * 0.55) + '" opacity="0.9" />';
      out += '<rect x="' + n(e * 2.6) + '" y="' + n(e * 2.6) + '" width="' + n(w - e * 5.2) + '" height="' + n(h - e * 5.2) +
        '" fill="none" stroke="' + pal.b + '" stroke-width="' + n(u * 0.22) + '" opacity="0.55" />';
      for (var s = 0; s < 16; s++) {
        var onTop = s % 2 === 0;
        var sxp = (s / 16) * w + rnd() * u * 5;
        var syp = onTop ? u * (3 + rnd() * 6) : h - u * (3 + rnd() * 6);
        out += PB.motif("sparkle", sxp, syp, u * (3 + rnd() * 5), pal.b, 0, 0.5 + rnd() * 0.5);
      }
      var tw = u * 40;
      out += '<rect x="' + n((w - tw) / 2) + '" y="0" width="' + n(tw) + '" height="' + n(u * 13) +
        '" rx="' + n(u * 6.5) + '" fill="' + pal.a + '" />';
      out += text(c.caption, w / 2, u * 8.6, u * 5.6, pal.light, { font: c.font, tracking: u * 0.5 });
      out += text(c.sub, w / 2, h - u * 5.5, u * 3.6, pal.b, { weight: 600, tracking: u * 1.2 });
    }

    else if (style === "badge") {
      var bm = u * 2.6;
      out += '<rect x="' + n(bm) + '" y="' + n(bm) + '" width="' + n(w - bm * 2) + '" height="' + n(h - bm * 2) +
        '" fill="none" stroke="' + pal.light + '" stroke-width="' + n(u * 1.1) + '" opacity="0.75" />';
      var R = u * 19;
      var bx = w - R - u * 7, by = h - R - u * 7;
      out += '<circle cx="' + n(bx) + '" cy="' + n(by) + '" r="' + n(R) + '" fill="' + pal.a + '" />';
      out += '<circle cx="' + n(bx) + '" cy="' + n(by) + '" r="' + n(R - u * 1.8) +
        '" fill="none" stroke="' + pal.light + '" stroke-width="' + n(u * 0.4) + '" opacity="0.7" />';
      out += PB.motif(c.motifs[0], bx, by - R * 0.28, u * 14, pal.light, 0, 0.95);
      out += text(c.badge || "", bx, by + R * 0.52, u * 4.4, pal.light, { tracking: u * 0.9 });
      /* left caption stack */
      out += text(c.caption, u * 7, h - u * 11, u * 7, pal.light, { anchor: "start", font: c.font });
      out += text(c.sub, u * 7, h - u * 5.4, u * 3.6, pal.light, { anchor: "start", weight: 500, tracking: u * 1 });
    }

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
      '" viewBox="0 0 ' + w + " " + h + '">' + out + "</svg>"
    );
  }

  /* ---- public API -------------------------------------------------------- */

  function svgToUrl(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* Every frame available for an event, at the given output size. */
  function frameSet(event, w, h, caption, sub) {
    var list = [];
    for (var i = 0; i < FRAME_STYLES.length; i++) {
      var st = FRAME_STYLES[i];
      if (st.id === "none") {
        list.push({ id: "none", name: st.name, svg: null, url: null });
        continue;
      }
      var svg = build(st.id, {
        w: w, h: h,
        pal: event.pal,
        motifs: event.motifs,
        caption: caption != null ? caption : event.name,
        sub: sub || "",
        badge: event.badge,
        font: event.font === "serif" ? SERIF : SANS,
        seed: PB.hashString(event.id + st.id)
      });
      list.push({ id: st.id, name: st.name, svg: svg, url: svgToUrl(svg) });
    }
    return list;
  }

  PB.FRAME_STYLES = FRAME_STYLES;
  PB.buildFrameSvg = build;
  PB.svgToUrl = svgToUrl;
  PB.frameSet = frameSet;
})();
