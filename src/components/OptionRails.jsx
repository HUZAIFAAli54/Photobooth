window.PB = window.PB || {};
(function () {
  "use strict";

  const FALLBACK = "linear-gradient(135deg,#5b5460,#2a262e)";

  /* Filter picker — every swatch is the guest's own face, so the choice is
   * made on the real image rather than on a word. */
  PB.FilterRail = function FilterRail({ value, onChange, thumbSrc }) {
    return (
      <div className="card">
        <div className="section-label">Filter</div>
        <div className="thumb-row">
          {PB.FILTERS.map((f) => (
            <button
              key={f.id}
              className={"tile" + (value === f.id ? " on" : "")}
              onClick={() => onChange(f.id)}
              title={f.name}
            >
              {thumbSrc
                ? <img src={thumbSrc} alt="" style={{ filter: f.css }} />
                : <div style={{ position: "absolute", inset: 0, background: FALLBACK, filter: f.css }} />}
              <span className="cap">{f.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* Frame picker — previews are the exact SVGs that get baked into the export. */
  PB.FrameRail = function FrameRail({ frames, value, onChange, thumbSrc, aspect }) {
    const ratio = `${aspect.w} / ${aspect.h}`;
    return (
      <div className="card">
        <div className="section-label">Frame · {frames.length - 1} for this event</div>
        <div className="thumb-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {frames.map((f) => (
            <button
              key={f.id}
              className={"tile" + (value === f.id ? " on" : "")}
              style={{ aspectRatio: ratio }}
              onClick={() => onChange(f.id)}
              title={f.name}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: thumbSrc ? `url(${thumbSrc}) center / cover` : FALLBACK
                }}
              />
              {f.url && (
                <img
                  src={f.url}
                  alt=""
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
                />
              )}
              <span className="cap">{f.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* Caption text + output shape. Both feed straight back into frame generation. */
  PB.TextCard = function TextCard({ caption, sub, onCaption, onSub, aspectId, onAspect, disabled }) {
    return (
      <div className="card">
        <div className="section-label">Frame text</div>
        <label className="field">
          <span>Headline</span>
          <input value={caption} maxLength={28} onChange={(e) => onCaption(e.target.value)} placeholder="Sarah &amp; Tom" />
        </label>
        <label className="field">
          <span>Sub-line</span>
          <input value={sub} maxLength={34} onChange={(e) => onSub(e.target.value)} placeholder="September 2, 2026" />
        </label>

        <div className="section-label" style={{ marginTop: 16 }}>Shape</div>
        <div className="chips">
          {PB.ASPECTS.map((a) => (
            <button
              key={a.id}
              className={"chip" + (aspectId === a.id ? " on" : "")}
              onClick={() => onAspect(a.id)}
              disabled={disabled}
            >
              {a.name}
            </button>
          ))}
        </div>
        {disabled && <p className="note">Shape is locked while a capture is open — retake to change it.</p>}
      </div>
    );
  };
})();
