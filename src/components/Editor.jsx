window.PB = window.PB || {};
(function () {
  "use strict";
  const { useState, useMemo, useCallback } = React;

  /* MediaRecorder writes no duration into the WebM header, so a fresh recording
   * reports duration=Infinity and the scrubber is dead. Seeking far past the end
   * forces the browser to measure it, then we rewind. */
  function fixDuration(e) {
    const v = e.target;
    if (v.duration !== Infinity) return;
    const onUpdate = () => {
      v.removeEventListener("timeupdate", onUpdate);
      v.currentTime = 0;
    };
    v.addEventListener("timeupdate", onUpdate);
    v.currentTime = 1e101;
  }

  /* Review screen for whatever was just captured. Photos and GIFs stay live —
   * changing a filter or frame re-renders them from the untouched original. */
  PB.Editor = function Editor({ result, aspect, busy, shareText, onRetake, onDownload, onPrint }) {
    const ratio = aspect.w / aspect.h;
    const stageStyle = {
      aspectRatio: `${aspect.w} / ${aspect.h}`,
      width: "100%",
      maxWidth: `calc(62vh * ${ratio})`
    };

    const kindName = result.kind === "photo" ? "photo" : result.kind === "gif" ? "GIF" : "video";

    const [shareErr, setShareErr] = useState(null);
    const [showFallback, setShowFallback] = useState(false);
    const [qrOpen, setQrOpen] = useState(false);
    const [qrBusy, setQrBusy] = useState(false);
    const [qrImg, setQrImg] = useState(null);
    const [qrErr, setQrErr] = useState(null);

    const canNativeShare = useMemo(() => {
      if (!result.blob) return false;
      try {
        const file = new File([result.blob], result.filename || "snapbooth", { type: result.blob.type });
        return PB.canShareFile(file);
      } catch (e) {
        return false;
      }
    }, [result.blob, result.filename]);

    const message = (shareText ? shareText + " — " : "") + "captured with SnapBooth!";

    const handleShare = useCallback(async () => {
      setShareErr(null);
      if (!result.blob) return;
      if (canNativeShare) {
        try {
          await PB.shareFile(result.blob, result.filename, "SnapBooth", message);
        } catch (err) {
          setShareErr("Sharing failed: " + (err.message || err) + " — try Download instead.");
        }
        return;
      }
      onDownload();
      setShowFallback(true);
    }, [result.blob, result.filename, canNativeShare, message, onDownload]);

    const openQr = useCallback(async () => {
      setQrOpen(true);
      setQrErr(null);
      setQrImg(null);
      if (result.kind === "video") {
        setQrErr("QR preview isn't available for video — use Share or Download instead.");
        return;
      }
      setQrBusy(true);
      try {
        const src = result.previewUrl || result.url;
        const thumb = src ? await PB.qrThumbnail(src) : null;
        if (!thumb) {
          setQrErr("This capture is too detailed to fit in a QR code. Use Share or Download instead.");
          return;
        }
        const img = PB.makeQrImage(thumb);
        if (!img) {
          setQrErr("Could not build a QR code for this capture.");
          return;
        }
        setQrImg(img);
      } catch (err) {
        setQrErr("Could not build a QR code: " + (err.message || err));
      } finally {
        setQrBusy(false);
      }
    }, [result]);

    return (
      <div className="stage-wrap">
        <div className="stage" style={stageStyle}>
          {result.kind === "video" ? (
            <video className="playback" src={result.url} controls loop playsInline onLoadedMetadata={fixDuration} />
          ) : result.previewUrl ? (
            <img className="shot" src={result.previewUrl} alt="Your capture" />
          ) : null}

          {busy && (
            <div className="busy">
              <div className="spinner" />
              <div>{busy}</div>
            </div>
          )}
        </div>

        <div className="editor-actions">
          <button className="btn primary" onClick={onDownload} disabled={!!busy}>
            <PB.Icons.Download /> Save {kindName}
          </button>
          <button className="btn" onClick={handleShare} disabled={!!busy || !result.blob}>
            <PB.Icons.Share /> Share
          </button>
          <button className="btn" onClick={openQr} disabled={!!busy}>
            <PB.Icons.QrCode /> QR code
          </button>
          {result.kind === "photo" && (
            <button className="btn" onClick={onPrint} disabled={!!busy}>
              <PB.Icons.Printer /> Print
            </button>
          )}
          <button className="btn ghost" onClick={onRetake}>
            <PB.Icons.Retake /> Retake
          </button>
        </div>

        {shareErr && <p className="note warn">{shareErr}</p>}

        {showFallback && !canNativeShare && (
          <div className="share-fallback">
            <p className="note">
              Your browser can't attach files directly to other apps, so the {kindName} was saved to your
              downloads — attach it manually after opening one of these:
            </p>
            <div className="share-links">
              <a className="btn sm" href={PB.whatsappLink(message)} target="_blank" rel="noopener noreferrer">
                <PB.Icons.Chat /> WhatsApp
              </a>
              <a
                className="btn sm"
                href={PB.gmailLink("A " + kindName + " from " + (shareText || "SnapBooth"), message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <PB.Icons.Mail /> Gmail
              </a>
              <button className="btn sm ghost" onClick={() => setShowFallback(false)}>Close</button>
            </div>
          </div>
        )}

        <p className="note">
          {result.kind === "video"
            ? "The filter and frame you picked before recording are baked into this clip — set them on the live preview next time to change the look."
            : "Filters and frames re-render from the untouched original, so keep trying combinations until it looks right."}
        </p>

        {qrOpen && (
          <div className="modal-backdrop" onClick={() => setQrOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <b>Scan to view</b>
                <button className="icon-btn" onClick={() => setQrOpen(false)}><PB.Icons.Close /></button>
              </div>
              {qrBusy && (
                <div className="modal-busy"><div className="spinner" /> Building QR code…</div>
              )}
              {qrErr && <p className="note warn">{qrErr}</p>}
              {qrImg && (
                <React.Fragment>
                  <div className="qr-frame"><img src={qrImg} alt="QR code" /></div>
                  <p className="note">
                    A lightweight preview only — this device can't host the full file for other phones to
                    fetch, so full quality stays here. Use Share or Download to send the original.
                  </p>
                </React.Fragment>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
})();
