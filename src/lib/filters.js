/* Photo filters.
 * One CSS filter string per look — used for the live <video> preview AND for
 * canvas export (ctx.filter accepts the exact same syntax), so what the guest
 * sees on screen is what lands in the file. */
window.PB = window.PB || {};
(function () {
  "use strict";

  var FILTERS = [
    { id: "none",    name: "Original",  css: "none" },
    { id: "vivid",   name: "Vivid",     css: "saturate(1.55) contrast(1.12) brightness(1.04)" },
    { id: "pop",     name: "Pop",       css: "saturate(2) contrast(1.28) brightness(1.02)" },
    { id: "bw",      name: "B & W",     css: "grayscale(1) contrast(1.18)" },
    { id: "noir",    name: "Noir",      css: "grayscale(1) contrast(1.55) brightness(0.9)" },
    { id: "sepia",   name: "Sepia",     css: "sepia(0.78) contrast(1.06) brightness(1.05)" },
    { id: "vintage", name: "Vintage",   css: "sepia(0.42) saturate(1.35) contrast(0.92) brightness(1.06) hue-rotate(-8deg)" },
    { id: "warm",    name: "Warm",      css: "sepia(0.28) saturate(1.45) hue-rotate(-12deg) brightness(1.06)" },
    { id: "cool",    name: "Cool",      css: "saturate(1.2) hue-rotate(14deg) brightness(1.04) contrast(1.05)" },
    { id: "fade",    name: "Fade",      css: "contrast(0.82) saturate(0.78) brightness(1.14)" },
    { id: "glow",    name: "Soft Glow", css: "brightness(1.12) saturate(1.12) contrast(0.94) blur(0.6px)" },
    { id: "candy",   name: "Candy",     css: "saturate(1.7) hue-rotate(-18deg) brightness(1.08) contrast(1.05)" }
  ];

  PB.FILTERS = FILTERS;

  PB.filterCss = function (id) {
    for (var i = 0; i < FILTERS.length; i++) if (FILTERS[i].id === id) return FILTERS[i].css;
    return "none";
  };
})();
