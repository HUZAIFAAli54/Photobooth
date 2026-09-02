window.PB = window.PB || {};
(function () {
  "use strict";

  PB.MODES = [
    { id: "photo", label: "Photo",       icon: "Camera" },
    { id: "gif",   label: "GIF",         icon: "Layers" },
    { id: "video", label: "Video (10s)", icon: "Video" }
  ];

  PB.ModeBar = function ModeBar({ mode, onChange, disabled }) {
    return (
      <div className="modebar">
        {PB.MODES.map((m) => {
          const Icon = PB.Icons[m.icon];
          return (
            <button
              key={m.id}
              className={"mode" + (mode === m.id ? " on" : "")}
              onClick={() => onChange(m.id)}
              disabled={disabled}
              title={m.label}
            >
              <span className="bubble"><Icon width="100%" height="100%" /></span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  };
})();
