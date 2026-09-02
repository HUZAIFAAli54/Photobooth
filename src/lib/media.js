/* Camera / canvas plumbing shared by every capture mode. */
window.PB = window.PB || {};
(function () {
  "use strict";

  /* Output sizes. Frames are generated at the same ratio so nothing stretches. */
  var ASPECTS = [
    { id: "landscape", name: "4:3",  w: 1440, h: 1080 },
    { id: "square",    name: "1:1",  w: 1200, h: 1200 },
    { id: "portrait",  name: "3:4",  w: 1080, h: 1440 }
  ];

  function aspect(id) {
    for (var i = 0; i < ASPECTS.length; i++) if (ASPECTS[i].id === id) return ASPECTS[i];
    return ASPECTS[0];
  }

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* object-fit: cover, expressed as a source rectangle. */
  function coverRect(sw, sh, dw, dh) {
    var scale = Math.max(dw / sw, dh / sh);
    var cw = dw / scale, ch = dh / scale;
    return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, sw: cw, sh: ch };
  }

  /* Draws a video/canvas/image cover-cropped into ctx, mirrored if asked. */
  function drawSource(ctx, src, w, h, mirror) {
    var sw = src.videoWidth || src.width;
    var sh = src.videoHeight || src.height;
    if (!sw || !sh) return false;
    var r = coverRect(sw, sh, w, h);
    ctx.save();
    if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(src, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
    ctx.restore();
    return true;
  }

  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  /* Raw grab: cover-cropped, mirrored, but no filter and no frame — this is the
   * negative we keep so filters/frames stay re-editable after the shot. */
  function grabRaw(video, w, h, mirror) {
    var c = makeCanvas(w, h);
    var ctx = c.getContext("2d");
    if (!drawSource(ctx, video, w, h, mirror)) return null;
    return c;
  }

  /* Bakes filter + frame onto a copy of a raw canvas. */
  function compose(raw, filterCss, frameImg) {
    var c = makeCanvas(raw.width, raw.height);
    var ctx = c.getContext("2d");
    ctx.filter = filterCss && filterCss !== "none" ? filterCss : "none";
    ctx.drawImage(raw, 0, 0);
    ctx.filter = "none";
    if (frameImg) ctx.drawImage(frameImg, 0, 0, c.width, c.height);
    return c;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) { resolve(b); }, type || "image/png", quality);
    });
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function stamp() {
    var d = new Date();
    var p = function (v) { return String(v).padStart(2, "0"); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function prettyDate() {
    var d = new Date();
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  function printImage(dataUrl) {
    var win = window.open("", "_blank", "width=900,height=700");
    if (!win) return false;
    win.document.write(
      '<!doctype html><title>Print</title><style>' +
      "html,body{margin:0;height:100%;background:#fff}" +
      "img{max-width:100%;max-height:100vh;display:block;margin:auto}" +
      "@media print{@page{margin:10mm}}</style>" +
      '<img src="' + dataUrl + '" onload="window.focus();window.print()">'
    );
    win.document.close();
    return true;
  }

  /* MediaRecorder mime negotiation — Chrome/Edge prefer vp9, Safari mp4. */
  function pickVideoMime() {
    var candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4"
    ];
    if (typeof MediaRecorder === "undefined") return null;
    for (var i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return null;
  }

  function extFor(mime) { return mime && mime.indexOf("mp4") > -1 ? "mp4" : "webm"; }

  PB.ASPECTS = ASPECTS;
  PB.aspect = aspect;
  PB.loadImage = loadImage;
  PB.coverRect = coverRect;
  PB.drawSource = drawSource;
  PB.makeCanvas = makeCanvas;
  PB.grabRaw = grabRaw;
  PB.compose = compose;
  PB.canvasToBlob = canvasToBlob;
  PB.download = download;
  PB.stamp = stamp;
  PB.prettyDate = prettyDate;
  PB.printImage = printImage;
  PB.pickVideoMime = pickVideoMime;
  PB.extFor = extFor;
})();
