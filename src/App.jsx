window.PB = window.PB || {};
(function () {
  "use strict";
  const { useState, useEffect, useMemo, useRef, useCallback } = React;

  let seq = 0;
  const nextId = () => "cap-" + ++seq + "-" + Date.now();

  /* ?event=birthday boots straight into that event — handy for a kiosk that
   * should always come back up in the same mode. */
  const deepLinked = (function () {
    const m = /[?&]event=([\w-]+)/.exec(location.search);
    return m ? PB.findEvent(m[1]) : null;
  })();

  function cameraError(err) {
    const name = err && err.name;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return location.protocol === "file:"
        ? "Cameras are blocked on file:// pages. Run serve.ps1 and open http://localhost:8000 instead."
        : "This browser does not expose a camera API.";
    }
    if (name === "NotAllowedError" || name === "SecurityError")
      return "Camera permission was denied. Allow it from the padlock icon in the address bar, then reload.";
    if (name === "NotFoundError" || name === "OverconstrainedError")
      return "No camera was found. Plug one in or pick a different device, then reload.";
    if (name === "NotReadableError")
      return "The camera is busy in another app (Teams, Zoom, another tab). Close it and reload.";
    return "Could not start the camera: " + (err && err.message ? err.message : String(err));
  }

  PB.App = function App() {
    /* ---- session state --------------------------------------------------- */
    const [event, setEvent] = useState(deepLinked);
    const [mode, setMode] = useState("photo");
    const [aspectId, setAspectId] = useState("landscape");
    const [filterId, setFilterId] = useState("none");
    const [frameId, setFrameId] = useState("band");
    const [caption, setCaption] = useState(deepLinked ? deepLinked.name : "");
    const [sub, setSub] = useState(PB.prettyDate());
    const [mirror, setMirror] = useState(true);

    const [stream, setStream] = useState(null);
    const [devices, setDevices] = useState([]);
    const [deviceId, setDeviceId] = useState(null);
    const [error, setError] = useState(null);

    const [capture, setCapture] = useState(null);  /* immutable, one per shot  */
    const [preview, setPreview] = useState(null);  /* {id,url,blob} re-rendered */
    const [busy, setBusy] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [thumbSrc, setThumbSrc] = useState(null);
    const [frameImg, setFrameImg] = useState(null);

    const thumbVideoRef = useRef(null);
    const composedRef = useRef(null);

    const aspect = PB.aspect(aspectId);
    const filterCss = PB.filterCss(filterId);

    /* ---- frames ---------------------------------------------------------- */

    const frames = useMemo(() => {
      if (!event) return [];
      return PB.frameSet(event, aspect.w, aspect.h, caption.trim() || event.name, sub.trim());
    }, [event, aspect, caption, sub]);

    const frame = useMemo(
      () => frames.find((f) => f.id === frameId) || frames[0] || null,
      [frames, frameId]
    );

    useEffect(() => {
      let alive = true;
      if (!frame || !frame.url) { setFrameImg(null); return; }
      PB.loadImage(frame.url).then((img) => { if (alive) setFrameImg(img); }).catch(() => {});
      return () => { alive = false; };
    }, [frame]);

    /* ---- camera ---------------------------------------------------------- */

    useEffect(() => {
      if (!event) return;
      let stopped = false;
      let local = null;

      (async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("no api");
          const video = deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: "user" };
          video.width = { ideal: 1920 };
          video.height = { ideal: 1080 };

          local = await navigator.mediaDevices.getUserMedia({ video: video, audio: false });
          if (stopped) { local.getTracks().forEach((t) => t.stop()); return; }
          setStream(local);
          setError(null);

          const list = await navigator.mediaDevices.enumerateDevices();
          if (!stopped) setDevices(list.filter((d) => d.kind === "videoinput"));
        } catch (err) {
          if (!stopped) setError(cameraError(err));
        }
      })();

      return () => {
        stopped = true;
        if (local) local.getTracks().forEach((t) => t.stop());
        setStream(null);
      };
    }, [event, deviceId]);

    /* ---- live thumbnails for the filter / frame rails --------------------- */

    useEffect(() => {
      if (!stream || capture) return;
      const v = thumbVideoRef.current;
      if (!v) return;
      if (v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }

      const grab = () => {
        if (!v.videoWidth) return;
        const c = PB.grabRaw(v, 220, Math.round((220 * aspect.h) / aspect.w), mirror);
        if (c) setThumbSrc(c.toDataURL("image/jpeg", 0.72));
      };
      const first = setTimeout(grab, 700);
      const timer = setInterval(grab, 2500);
      return () => { clearTimeout(first); clearInterval(timer); };
    }, [stream, aspect, mirror, capture]);

    /* ---- publishing a rendered result ------------------------------------ */

    const publish = useCallback((id, kind, blob, ext) => {
      const url = URL.createObjectURL(blob);
      const filename = (event ? event.id : "snapbooth") + "-" + PB.stamp() + "." + ext;

      setPreview((prev) => {
        if (prev && prev.id === id && prev.url) URL.revokeObjectURL(prev.url);
        return { id: id, url: url, blob: blob, filename: filename };
      });

      setGallery((list) => {
        const item = { id: id, kind: kind, url: url, blob: blob, filename: filename };
        const at = list.findIndex((g) => g.id === id);
        if (at < 0) return list.concat(item);
        const copy = list.slice();
        copy[at] = item;
        return copy;
      });
    }, [event]);

    /* Photo: re-composite from the untouched grab whenever the look changes. */
    useEffect(() => {
      if (!capture || capture.kind !== "photo") return;
      let alive = true;
      const canvas = PB.compose(capture.raw, filterCss, frameImg);
      composedRef.current = canvas;
      PB.canvasToBlob(canvas, "image/png").then((blob) => {
        if (alive && blob) publish(capture.id, "photo", blob, "png");
      });
      return () => { alive = false; };
    }, [capture, filterCss, frameImg, publish]);

    /* GIF: same idea, but re-encoding costs real time, so debounce it. */
    useEffect(() => {
      if (!capture || capture.kind !== "gif") return;
      let alive = true;
      const timer = setTimeout(async () => {
        setBusy("Rendering GIF…");
        try {
          const buffers = capture.rawFrames.map((raw) => {
            const c = PB.compose(raw, filterCss, frameImg);
            return c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
          });
          const blob = await PB.encodeGif(buffers, capture.w, capture.h, capture.delay);
          if (!alive) return;
          publish(capture.id, "gif", blob, "gif");
        } catch (err) {
          if (alive) setError("GIF encoding failed: " + (err.message || err));
        } finally {
          if (alive) setBusy(null);
        }
      }, 350);

      return () => { alive = false; clearTimeout(timer); };
    }, [capture, filterCss, frameImg, publish]);

    /* ---- handlers -------------------------------------------------------- */

    const handleResult = useCallback((res) => {
      const id = nextId();
      if (res.kind === "video") {
        const filename = (event ? event.id : "snapbooth") + "-" + PB.stamp() + "." + PB.extFor(res.mime);
        setCapture({ id: id, kind: "video", url: res.url, blob: res.blob, mime: res.mime });
        setPreview({ id: id, url: res.url, blob: res.blob, filename: filename });
        setGallery((list) => list.concat({ id: id, kind: "video", url: res.url, blob: res.blob, filename: filename }));
        return;
      }
      if (res.kind === "photo") {
        setThumbSrc(res.raw.toDataURL("image/jpeg", 0.72));
        setCapture({ id: id, kind: "photo", raw: res.raw });
        setPreview(null);
        return;
      }
      setThumbSrc(res.rawFrames[0].toDataURL("image/jpeg", 0.72));
      setCapture({ id: id, kind: "gif", rawFrames: res.rawFrames, w: res.w, h: res.h, delay: res.delay });
      setPreview(null);
    }, [event]);

    const retake = useCallback(() => {
      setCapture(null);
      setPreview(null);
      setBusy(null);
      composedRef.current = null;
    }, []);

    const downloadCurrent = useCallback(() => {
      if (preview && preview.blob) PB.download(preview.blob, preview.filename);
    }, [preview]);

    const printCurrent = useCallback(() => {
      const canvas = composedRef.current;
      if (!canvas) return;
      if (!PB.printImage(canvas.toDataURL("image/png"))) {
        setError("The print window was blocked — allow pop-ups for this page and try again.");
      }
    }, []);

    const changeMode = useCallback((m) => { setMode(m); retake(); }, [retake]);

    const pickEvent = useCallback((ev) => {
      setEvent(ev);
      setCaption(ev.name);
      setFrameId("band");
      setFilterId("none");
      retake();
    }, [retake]);

    const leaveEvent = useCallback(() => {
      setEvent(null);
      setDevices([]);
      setDeviceId(null);
      setThumbSrc(null);
      retake();
    }, [retake]);

    const clearGallery = useCallback(() => {
      setGallery((list) => {
        list.forEach((it) => { if (!preview || it.url !== preview.url) URL.revokeObjectURL(it.url); });
        return [];
      });
    }, [preview]);

    /* ---- render ----------------------------------------------------------- */

    const result = capture
      ? { kind: capture.kind, previewUrl: preview ? preview.url : null, url: capture.url }
      : null;

    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="dot"><PB.Icons.Booth width="16" height="16" /></span>
            SnapBooth
          </div>
          <div className="spacer" />
          {event && (
            <div className="event-chip">
              <span className="swatch" style={{ background: event.pal.a }}>
                <PB.Icons.Sparkle width="14" height="14" color={event.pal.light} />
              </span>
              <b>{event.name}</b>
              <button className="change" onClick={leaveEvent}>Change event</button>
            </div>
          )}
        </header>

        {error && (
          <div className="banner">
            {error}{" "}
            <button className="btn sm ghost" style={{ marginLeft: 8 }} onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {!event ? (
          <PB.EventSelector onPick={pickEvent} />
        ) : (
          <div className="booth">
            <div className="stage-col">
              <PB.ModeBar mode={mode} onChange={changeMode} disabled={!!busy} />

              {result ? (
                <PB.Editor
                  result={result}
                  aspect={aspect}
                  busy={busy || (!preview && capture.kind !== "video" ? "Rendering…" : null)}
                  onRetake={retake}
                  onDownload={downloadCurrent}
                  onPrint={printCurrent}
                />
              ) : (
                <PB.CameraStage
                  stream={stream}
                  ready={!!stream}
                  mode={mode}
                  aspect={aspect}
                  mirror={mirror}
                  filterCss={filterCss}
                  frameUrl={frame ? frame.url : null}
                  frameImg={frameImg}
                  devices={devices}
                  deviceId={deviceId || (devices[0] ? devices[0].deviceId : "")}
                  onDeviceChange={setDeviceId}
                  onToggleMirror={() => setMirror((m) => !m)}
                  onResult={handleResult}
                  onError={setError}
                />
              )}
            </div>

            <div className="rail">
              <PB.FilterRail value={filterId} onChange={setFilterId} thumbSrc={thumbSrc} />
              <PB.FrameRail
                frames={frames}
                value={frameId}
                onChange={setFrameId}
                thumbSrc={thumbSrc}
                aspect={aspect}
              />
              <PB.TextCard
                caption={caption}
                sub={sub}
                onCaption={setCaption}
                onSub={setSub}
                aspectId={aspectId}
                onAspect={setAspectId}
                disabled={!!capture}
              />
              <PB.Gallery
                items={gallery}
                onDownload={(it) => PB.download(it.blob, it.filename)}
                onClear={clearGallery}
              />
            </div>
          </div>
        )}

        {/* hidden sampler used to build the rail thumbnails */}
        <video ref={thumbVideoRef} autoPlay muted playsInline style={{ display: "none" }} />
      </div>
    );
  };
})();
