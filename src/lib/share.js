/* Sharing helpers: the native Share sheet (real file, full quality) and a
 * QR-code fallback (a small downscaled preview, since there is no server to
 * host the full file at a URL — the QR can only carry what fits inside it). */
window.PB = window.PB || {};
(function () {
  "use strict";

  /* A QR code at error-correction level L tops out around 2953 bytes (byte
   * mode, version 40). Stay well under that so the code is still reliably
   * scannable. */
  var QR_BUDGET_CHARS = 2400;

  function canShareFile(file) {
    try {
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
    } catch (e) {
      return false;
    }
  }

  /* Resolves true (shared or cancelled) or throws on a real failure. */
  function shareFile(blob, filename, title, text) {
    var file = new File([blob], filename, { type: blob.type });
    return navigator.share({ files: [file], title: title, text: text }).then(
      function () { return true; },
      function (err) {
        if (err && err.name === "AbortError") return true;
        throw err;
      }
    );
  }

  /* Downscales an image URL to a JPEG data URL small enough to fit a QR
   * code, shrinking quality then dimensions until it clears the budget.
   * Returns null if even the smallest attempt doesn't fit. */
  function qrThumbnail(url, maxChars) {
    maxChars = maxChars || QR_BUDGET_CHARS;
    return PB.loadImage(url).then(function (img) {
      var w = 260;
      var quality = 0.6;
      for (var i = 0; i < 10; i++) {
        var h = Math.max(1, Math.round((w * img.height) / img.width));
        var c = PB.makeCanvas(w, h);
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        var dataUrl = c.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= maxChars) return dataUrl;
        if (quality > 0.32) quality -= 0.08;
        else w = Math.round(w * 0.82);
        if (w < 60) break;
      }
      return null;
    });
  }

  /* Builds a QR code image (as a data URL) encoding the given text. */
  function makeQrImage(text) {
    try {
      var qr = qrcode(0, "L");
      qr.addData(text);
      qr.make();
      return qr.createDataURL(6, 8);
    } catch (err) {
      return null;
    }
  }

  function whatsappLink(text) {
    return "https://wa.me/?text=" + encodeURIComponent(text);
  }

  function gmailLink(subject, body) {
    return "https://mail.google.com/mail/?view=cm&fs=1&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  PB.QR_BUDGET_CHARS = QR_BUDGET_CHARS;
  PB.canShareFile = canShareFile;
  PB.shareFile = shareFile;
  PB.qrThumbnail = qrThumbnail;
  PB.makeQrImage = makeQrImage;
  PB.whatsappLink = whatsappLink;
  PB.gmailLink = gmailLink;
})();
