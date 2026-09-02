window.PB = window.PB || {};
(function () {
  "use strict";

  /* Everything shot this session. Click a tile to download it again. */
  PB.Gallery = function Gallery({ items, onDownload, onClear }) {
    return (
      <div className="card">
        <div className="section-label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>This session · {items.length}</span>
          {items.length > 0 && (
            <button className="btn sm ghost" style={{ padding: "2px 10px" }} onClick={onClear}>Clear</button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="empty-state">Nothing captured yet. Everything you shoot tonight collects here — click any tile to download it again.</p>
        ) : (
          <div className="gallery-grid">
            {items.map((it) => (
              <button key={it.id} className="tile" onClick={() => onDownload(it)} title={"Download " + it.filename}>
                {it.kind === "video"
                  ? <video src={it.url} muted playsInline />
                  : <img src={it.url} alt="" />}
                <span className="kind">{it.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
})();
