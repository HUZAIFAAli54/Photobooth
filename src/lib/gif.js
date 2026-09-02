/* Animated GIF encoder — GIF89a, written from scratch (no gif.js / omggif).
 *
 * Two pieces are doing the work here:
 *   1. Colour quantization. RGB is bucketed into a 32768-bin 5-bit histogram,
 *      then median-cut splits the occupied bins into <=256 boxes; each box's
 *      weighted average becomes a palette entry.
 *   2. LZW compression, the variable-code-width flavour the GIF spec requires,
 *      emitted LSB-first and chopped into 255-byte sub-blocks.
 *
 * One global colour table is shared by every frame, which keeps both the file
 * small and the animation free of palette flicker. */
window.PB = window.PB || {};
(function () {
  "use strict";

  var BINS = 32768; /* 32 * 32 * 32 */

  function binOf(r, g, b) {
    return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  }

  /* ---- median cut -------------------------------------------------------- */

  function quantize(frames, maxColors, sampleStep) {
    var counts = new Uint32Array(BINS);
    var sumR = new Uint32Array(BINS);
    var sumG = new Uint32Array(BINS);
    var sumB = new Uint32Array(BINS);

    var f, px, i, bin;
    for (f = 0; f < frames.length; f++) {
      px = frames[f];
      for (i = 0; i < px.length; i += 4 * sampleStep) {
        bin = binOf(px[i], px[i + 1], px[i + 2]);
        counts[bin]++;
        sumR[bin] += px[i];
        sumG[bin] += px[i + 1];
        sumB[bin] += px[i + 2];
      }
    }

    var occupied = [];
    for (i = 0; i < BINS; i++) if (counts[i]) occupied.push(i);
    if (!occupied.length) occupied.push(0);
    var bins = Int32Array.from(occupied);

    function makeBox(lo, hi) {
      var rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0, total = 0;
      for (var j = lo; j < hi; j++) {
        var b2 = bins[j];
        var r = (b2 >> 10) & 31, g = (b2 >> 5) & 31, bl = b2 & 31;
        if (r < rMin) rMin = r; if (r > rMax) rMax = r;
        if (g < gMin) gMin = g; if (g > gMax) gMax = g;
        if (bl < bMin) bMin = bl; if (bl > bMax) bMax = bl;
        total += counts[b2];
      }
      var dr = rMax - rMin, dg = gMax - gMin, db = bMax - bMin;
      var axis = dr >= dg && dr >= db ? 0 : dg >= db ? 1 : 2;
      return {
        lo: lo, hi: hi, count: total, axis: axis,
        /* volume-weighted priority keeps large, colourful regions splitting first */
        score: total * (dr + 1) * (dg + 1) * (db + 1),
        splittable: hi - lo > 1 && dr + dg + db > 0
      };
    }

    var boxes = [makeBox(0, bins.length)];
    while (boxes.length < maxColors) {
      var best = -1, bestScore = -1;
      for (i = 0; i < boxes.length; i++) {
        if (boxes[i].splittable && boxes[i].score > bestScore) { bestScore = boxes[i].score; best = i; }
      }
      if (best < 0) break;

      var box = boxes[best];
      var shift = box.axis === 0 ? 10 : box.axis === 1 ? 5 : 0;
      var slice = Array.prototype.slice.call(bins.subarray(box.lo, box.hi));
      slice.sort(function (x, y) { return ((x >> shift) & 31) - ((y >> shift) & 31); });
      for (i = 0; i < slice.length; i++) bins[box.lo + i] = slice[i];

      /* cut at the weighted median so both halves carry similar pixel mass */
      var half = box.count / 2, run = 0, cut = box.lo;
      for (i = box.lo; i < box.hi - 1; i++) {
        run += counts[bins[i]];
        cut = i + 1;
        if (run >= half) break;
      }
      if (cut <= box.lo) cut = box.lo + 1;
      if (cut >= box.hi) cut = box.hi - 1;

      boxes.splice(best, 1, makeBox(box.lo, cut), makeBox(cut, box.hi));
    }

    var palette = new Uint8Array(768);
    for (i = 0; i < boxes.length; i++) {
      var bx = boxes[i], tr = 0, tg = 0, tb = 0, tc = 0;
      for (var j = bx.lo; j < bx.hi; j++) {
        var bb = bins[j];
        tr += sumR[bb]; tg += sumG[bb]; tb += sumB[bb]; tc += counts[bb];
      }
      if (!tc) tc = 1;
      palette[i * 3] = Math.round(tr / tc);
      palette[i * 3 + 1] = Math.round(tg / tc);
      palette[i * 3 + 2] = Math.round(tb / tc);
    }
    return { palette: palette, size: Math.max(2, boxes.length) };
  }

  /* Nearest-palette lookup, memoised per 5-bit bin (32k entries max). */
  function makeMapper(palette, size) {
    var cache = new Int16Array(BINS).fill(-1);
    return function (r, g, b) {
      var key = binOf(r, g, b);
      var hit = cache[key];
      if (hit >= 0) return hit;
      var best = 0, bestD = Infinity;
      for (var i = 0; i < size; i++) {
        var dr = r - palette[i * 3], dg = g - palette[i * 3 + 1], db = b - palette[i * 3 + 2];
        var d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
        if (d < bestD) { bestD = d; best = i; }
      }
      cache[key] = best;
      return best;
    };
  }

  /* ---- LZW --------------------------------------------------------------- */

  function lzwEncode(indices, minCodeSize, out) {
    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;
    var nextCode = eoiCode + 1;
    var codeSize = minCodeSize + 1;
    var table = new Map();

    var bytes = [];
    var acc = 0, accBits = 0;

    function emit(code) {
      acc |= code << accBits;
      accBits += codeSize;
      while (accBits >= 8) {
        bytes.push(acc & 0xff);
        acc >>= 8;
        accBits -= 8;
      }
    }

    emit(clearCode);
    var prev = indices[0];
    for (var i = 1; i < indices.length; i++) {
      var k = indices[i];
      var key = (prev << 8) | k;
      var found = table.get(key);
      if (found !== undefined) {
        prev = found;
      } else {
        emit(prev);
        if (nextCode === 4096) {
          emit(clearCode);
          table.clear();
          nextCode = eoiCode + 1;
          codeSize = minCodeSize + 1;
        } else {
          if (nextCode >= 1 << codeSize) codeSize++;
          table.set(key, nextCode++);
        }
        prev = k;
      }
    }
    emit(prev);
    emit(eoiCode);
    if (accBits > 0) bytes.push(acc & 0xff);

    /* sub-blocks: <=255 data bytes each, terminated by a zero-length block */
    out.push(minCodeSize);
    for (var p = 0; p < bytes.length; p += 255) {
      var chunk = bytes.slice(p, p + 255);
      out.push(chunk.length);
      for (var q = 0; q < chunk.length; q++) out.push(chunk[q]);
    }
    out.push(0);
  }

  /* ---- container --------------------------------------------------------- */

  function u16(out, v) { out.push(v & 0xff, (v >> 8) & 0xff); }

  function writeString(out, s) {
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  }

  /* frames: array of Uint8ClampedArray (RGBA, w*h*4). Returns a Blob. */
  function encodeGif(frames, width, height, delayMs, onProgress) {
    return new Promise(function (resolve) {
      var pixels = width * height;
      var step = pixels > 200000 ? 4 : pixels > 90000 ? 3 : 2;
      var q = quantize(frames, 256, step);
      var map = makeMapper(q.palette, q.size);

      var out = [];
      writeString(out, "GIF89a");
      u16(out, width);
      u16(out, height);
      out.push(0xf7, 0, 0); /* GCT present, 8-bit colour, 256-entry table */
      for (var i = 0; i < 768; i++) out.push(q.palette[i] || 0);

      /* Netscape looping extension */
      out.push(0x21, 0xff, 0x0b);
      writeString(out, "NETSCAPE2.0");
      out.push(0x03, 0x01);
      u16(out, 0); /* 0 = loop forever */
      out.push(0x00);

      var delay = Math.max(2, Math.round(delayMs / 10)); /* GIF ticks = 1/100s */
      var f = 0;

      function nextFrame() {
        if (f >= frames.length) {
          out.push(0x3b); /* trailer */
          resolve(new Blob([new Uint8Array(out)], { type: "image/gif" }));
          return;
        }

        var px = frames[f];
        var idx = new Uint8Array(pixels);
        for (var p = 0, j = 0; p < pixels; p++, j += 4) {
          idx[p] = map(px[j], px[j + 1], px[j + 2]);
        }

        out.push(0x21, 0xf9, 0x04, 0x04); /* GCE, disposal = do not dispose */
        u16(out, delay);
        out.push(0x00, 0x00);

        out.push(0x2c);
        u16(out, 0); u16(out, 0);
        u16(out, width); u16(out, height);
        out.push(0x00);

        lzwEncode(idx, 8, out);

        f++;
        if (onProgress) onProgress(f / frames.length);
        setTimeout(nextFrame, 0); /* yield so the UI keeps breathing */
      }

      setTimeout(nextFrame, 0);
    });
  }

  PB.encodeGif = encodeGif;
})();
