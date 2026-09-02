/* Event catalogue.
 * Palette + motif list drive the whole themed frame set for that event, so
 * adding a new event here is enough to get 8 matching frames for it. */
window.PB = window.PB || {};
(function () {
  "use strict";

  PB.EVENTS = [
    {
      id: "birthday",
      name: "Birthday Party",
      blurb: "Balloons, cake and confetti in hot pink and gold.",
      badge: "BIRTHDAY",
      font: "sans",
      motifs: ["balloon", "cake", "star", "dot"],
      pal: { a: "#ff3d7f", b: "#ffd166", light: "#fff7fa", ink: "#2b0b1a" }
    },
    {
      id: "wedding",
      name: "Wedding",
      blurb: "Champagne gold, rings and florals with a serif finish.",
      badge: "WEDDING",
      font: "serif",
      motifs: ["ring", "heart", "flower", "sparkle"],
      pal: { a: "#b2914f", b: "#f4e7ce", light: "#fffdf7", ink: "#2c2519" }
    },
    {
      id: "anniversary",
      name: "Anniversary",
      blurb: "Deep rose and blush — hearts, rings and soft sparkle.",
      badge: "ANNIVERSARY",
      font: "serif",
      motifs: ["heart", "sparkle", "ring", "petal"],
      pal: { a: "#a3123c", b: "#f0b7c2", light: "#fff5f7", ink: "#2a0710" }
    },
    {
      id: "family",
      name: "Family Gathering",
      blurb: "Warm terracotta and garden green with leaves and blooms.",
      badge: "FAMILY",
      font: "sans",
      motifs: ["leaf", "flower", "petal", "dot"],
      pal: { a: "#c2652a", b: "#4c8f6b", light: "#fff6ee", ink: "#2a1608" }
    },
    {
      id: "baby",
      name: "Baby Shower",
      blurb: "Powder blue and blush pink, stars and tiny hearts.",
      badge: "BABY SHOWER",
      font: "sans",
      motifs: ["star", "heart", "dot", "flower"],
      pal: { a: "#7fb0e8", b: "#ffc2d6", light: "#f9fcff", ink: "#13273d" }
    },
    {
      id: "graduation",
      name: "Graduation",
      blurb: "Navy and gold, caps and stars for the class photo.",
      badge: "CLASS OF",
      font: "serif",
      motifs: ["cap", "star", "sparkle", "diamond"],
      pal: { a: "#1f2f66", b: "#f2c14e", light: "#f5f7ff", ink: "#0d142c" }
    },
    {
      id: "corporate",
      name: "Corporate Event",
      blurb: "Midnight blue and teal — clean, brandable, understated.",
      badge: "EVENT",
      font: "sans",
      motifs: ["diamond", "bar", "dot", "sparkle"],
      pal: { a: "#12283f", b: "#31cfc4", light: "#eef6fb", ink: "#08131f" }
    },
    {
      id: "holiday",
      name: "Holiday Party",
      blurb: "Pine green, gold and snowflakes for the end-of-year bash.",
      badge: "HOLIDAY",
      font: "serif",
      motifs: ["snow", "star", "gift", "sparkle"],
      pal: { a: "#0f5132", b: "#e0b64f", light: "#f6fff9", ink: "#07281a" }
    }
  ];

  PB.findEvent = function (id) {
    for (var i = 0; i < PB.EVENTS.length; i++) if (PB.EVENTS[i].id === id) return PB.EVENTS[i];
    return null;
  };
})();
