window.PB = window.PB || {};
(function () {
  "use strict";
  const { useMemo } = React;

  /* Each card previews one of the event's own frames, so the guest picks the
   * look, not just the word. */
  const THUMB_STYLES = ["band", "polaroid", "arch", "corners", "confetti", "ribbon", "sparkle", "badge"];

  function EventCard({ event, index, onPick }) {
    const url = useMemo(() => {
      const style = THUMB_STYLES[index % THUMB_STYLES.length];
      const svg = PB.buildFrameSvg(style, {
        w: 300, h: 170,
        pal: event.pal,
        motifs: event.motifs,
        caption: event.name,
        sub: "PREVIEW",
        badge: event.badge,
        font: event.font === "serif" ? "Georgia, Times New Roman, serif" : "Segoe UI, Arial, sans-serif",
        seed: PB.hashString(event.id)
      });
      return PB.svgToUrl(svg);
    }, [event, index]);

    return (
      <button className="event-card" onClick={() => onPick(event)}>
        <div
          className="thumb"
          style={{ background: `linear-gradient(135deg, ${event.pal.a} 0%, ${event.pal.ink} 55%, ${event.pal.b} 160%)` }}
        >
          <img src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        </div>
        <div className="meta">
          <h3>{event.name}</h3>
          <p>{event.blurb}</p>
          <div className="count">8 frames · 12 filters</div>
        </div>
      </button>
    );
  }

  PB.EventSelector = function EventSelector({ onPick }) {
    return (
      <div className="chooser">
        <h1>Create a new event</h1>
        <p className="sub">
          Pick the occasion first — it sets the frame collection, colours and captions the booth
          will offer for every photo, GIF and video of the night.
        </p>

        <div className="event-grid">
          {PB.EVENTS.map((ev, i) => (
            <EventCard key={ev.id} event={ev} index={i} onPick={onPick} />
          ))}
        </div>
      </div>
    );
  };
})();
