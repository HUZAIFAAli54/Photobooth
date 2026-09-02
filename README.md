# SnapBooth — event photo booth

A dslrBooth-style booth in React. Pick an event, and the booth loads that event's
frame collection, colours and captions; then shoot a photo, a looping GIF or a
10-second video, restyle it, and save or print it.

**React and plain JavaScript only** — no UI kit, no CSS framework, no image
library, no GIF library. React itself loads from a CDN and JSX is compiled in the
browser, so there is no build step and nothing to install.

## Run it

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open <http://localhost:8000>.

The server is only there because browsers refuse `getUserMedia` on `file://`
pages — any static server works (`npx serve`, VS Code Live Server, …). Chrome or
Edge recommended; Firefox works, Safari has no VP9/WebM recording.

`http://localhost:8000/?event=birthday` boots straight into an event, for a
kiosk that should always come back up the same way.

## The flow

1. **Event selector** — 8 events, each card previewing one of its own frames.
2. **Booth** — Photo / GIF / Video (10s) as the three mode bubbles, a live
   preview with the frame overlaid and the filter applied, and a 3-2-1 countdown.
3. **Review** — the shot with filter and frame rails beside it. Photos and GIFs
   re-render from the untouched original every time you change something, so you
   can keep trying looks. Save, Print, or Retake.
4. **Session gallery** — everything shot so far; click a tile to download it again.

## What's in the box

- **8 events** — birthday, wedding, anniversary, family gathering, baby shower,
  graduation, corporate, holiday.
- **8 frames per event** — classic band, polaroid, ribbon, corners, confetti,
  arch, sparkle, badge. Editable headline and sub-line.
- **12 filters** — vivid, pop, B&W, noir, sepia, vintage, warm, cool, fade,
  soft glow, candy.
- **3 shapes** — 4:3, 1:1, 3:4.

## How it works

| Piece | Where | Note |
| --- | --- | --- |
| Frames | `src/lib/frames.js`, `src/lib/shapes.js` | Generated as SVG strings from the event's palette + motifs. Zero image assets. The same SVG is the live overlay *and* what gets drawn onto the export canvas, so preview and file cannot drift. |
| Filters | `src/lib/filters.js` | One CSS filter string per look. The browser accepts the identical syntax in `ctx.filter`, so the preview and the export use literally the same string. |
| Photo | `src/lib/media.js` | The raw cover-cropped grab is kept unfiltered; filter + frame are composited onto a copy on every change. |
| GIF | `src/lib/gif.js` | Hand-written GIF89a encoder: 5-bit histogram → median-cut palette → LZW with variable code width. 12 frames, one shared global colour table, loops forever. |
| Video | `src/components/CameraStage.jsx` | A canvas is repainted every frame with the filter and frame baked in, then `canvas.captureStream()` + the mic feed a `MediaRecorder`. |

### Adding an event

Append to `PB.EVENTS` in `src/data/events.js`:

```js
{
  id: "reunion",
  name: "Class Reunion",
  blurb: "Shown on the event card.",
  badge: "REUNION",             // small text in ribbon / badge frames
  font: "serif",                // or "sans"
  motifs: ["star", "sparkle", "diamond", "dot"],
  pal: { a: "#123456", b: "#e0b64f", light: "#f6fff9", ink: "#07281a" }
}
```

That is the whole change — all 8 frames are generated from it. Motif names come
from `PB.MOTIF_KINDS` in `src/lib/shapes.js`; add a new one by dropping another
case into `motif()`.

## Verified

`selftest.html` exercises the non-React half end to end — frame rasterisation
for all 8×8 frames, canvas compositing, every filter, the GIF encoder (the
result is handed back to the browser's own decoder to prove the LZW and palette
are valid) and the recorder path. Open it in a browser, or headless:

```powershell
msedge --headless=new --use-fake-device-for-media-stream --use-fake-ui-for-media-stream `
  "http://localhost:8000/selftest.html"
```

Last run: 12/12 pass in Edge 151.

## Known limits

- A downloaded WebM carries no duration in its header (a MediaRecorder trait);
  it plays fine, and the in-app player patches the scrubber, but some desktop
  players show an unknown length. Re-muxing it would need a library.
- `ctx.filter` is required for baking filters into exports — fine in Chrome,
  Edge, Firefox and Safari 18+, absent in older Safari (the preview still works,
  the saved file would be unfiltered).
- Captures live in memory for the session only; nothing is uploaded anywhere.
