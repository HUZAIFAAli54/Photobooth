/* Inline SVG icons — no icon library, no font. */
window.PB = window.PB || {};
(function () {
  "use strict";

  function base(props) {
    return Object.assign(
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        width: "1em",
        height: "1em"
      },
      props
    );
  }

  const Camera = (p) => (
    <svg {...base(p)}>
      <rect x="2.5" y="6" width="19" height="14" rx="4" />
      <circle cx="12" cy="13" r="4" />
      <path d="M8.5 6l1.2-2h4.6L15.5 6" />
    </svg>
  );

  const Layers = (p) => (
    <svg {...base(p)}>
      <rect x="3" y="7" width="13" height="13" rx="2.5" />
      <path d="M7 7V5.5A1.5 1.5 0 018.5 4H19a1.5 1.5 0 011.5 1.5V16" />
    </svg>
  );

  const Video = (p) => (
    <svg {...base(p)}>
      <rect x="2.5" y="6.5" width="13" height="11" rx="3" />
      <path d="M15.5 11l5-3v8l-5-3z" />
    </svg>
  );

  const Shutter = (p) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  );

  const Square = (p) => (
    <svg {...base(p)}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );

  const Download = (p) => (
    <svg {...base(p)}>
      <path d="M12 4v11" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4.5 19h15" />
    </svg>
  );

  const Printer = (p) => (
    <svg {...base(p)}>
      <path d="M7 9V4h10v5" />
      <rect x="3.5" y="9" width="17" height="7" rx="2" />
      <rect x="7" y="14" width="10" height="6" rx="1" />
    </svg>
  );

  const Retake = (p) => (
    <svg {...base(p)}>
      <path d="M4 12a8 8 0 018-8c2.7 0 5 1.3 6.4 3.3" />
      <path d="M20 12a8 8 0 01-8 8c-2.7 0-5-1.3-6.4-3.3" />
      <path d="M18.5 3.6v4h-4" />
      <path d="M5.5 20.4v-4h4" />
    </svg>
  );

  const Flip = (p) => (
    <svg {...base(p)}>
      <path d="M12 3v18" strokeDasharray="3 3" />
      <path d="M9 7L4 12l5 5z" />
      <path d="M15 7l5 5-5 5z" />
    </svg>
  );

  const Close = (p) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );

  const Sparkle = (p) => (
    <svg {...base(p)}>
      <path d="M12 3.5l1.8 4.9 4.9 1.8-4.9 1.8L12 16.9l-1.8-4.9L5.3 10.2l4.9-1.8z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );

  const Booth = (p) => (
    <svg {...base(p)} strokeWidth="2">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" fill="currentColor" stroke="none" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" fill="currentColor" stroke="none" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" fill="currentColor" stroke="none" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" fill="currentColor" stroke="none" />
    </svg>
  );

  PB.Icons = { Camera, Layers, Video, Shutter, Square, Download, Printer, Retake, Flip, Close, Sparkle, Booth };
})();
