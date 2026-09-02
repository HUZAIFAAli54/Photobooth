window.PB = window.PB || {};
(function () {
  "use strict";

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
  PB.Editor = function Editor({ result, aspect, busy, onRetake, onDownload, onPrint }) {
    const ratio = aspect.w / aspect.h;
    const stageStyle = {
      aspectRatio: `${aspect.w} / ${aspect.h}`,
      width: "100%",
      maxWidth: `calc(62vh * ${ratio})`
    };

    const kindName = result.kind === "photo" ? "photo" : result.kind === "gif" ? "GIF" : "video";

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
          {result.kind === "photo" && (
            <button className="btn" onClick={onPrint} disabled={!!busy}>
              <PB.Icons.Printer /> Print
            </button>
          )}
          <button className="btn ghost" onClick={onRetake}>
            <PB.Icons.Retake /> Retake
          </button>
        </div>

        <p className="note">
          {result.kind === "video"
            ? "The filter and frame you picked before recording are baked into this clip — set them on the live preview next time to change the look."
            : "Filters and frames re-render from the untouched original, so keep trying combinations until it looks right."}
        </p>
      </div>
    );
  };
})();
