window.PB = window.PB || {};
(function () {
  "use strict";
  const { useEffect, useRef, useState } = React;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const GIF_FRAMES = 12;
  const GIF_INTERVAL = 130;   /* ms between grabs   */
  const GIF_WIDTH = 480;      /* export width       */
  const VIDEO_SECONDS = 10;
  const VIDEO_WIDTH = 960;

  PB.CameraStage = function CameraStage(props) {
    const {
      stream, ready, mode, aspect, mirror, filterCss, frameUrl, frameImg,
      devices, deviceId, onDeviceChange, onToggleMirror, onResult, onError
    } = props;

    const videoRef = useRef(null);
    const cancelRef = useRef(false);
    const fileInputRef = useRef(null);
    const [count, setCount] = useState(null);   /* 3,2,1,0 = "Smile!" */
    const [flash, setFlash] = useState(false);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [busy, setBusy] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadErr, setUploadErr] = useState(null);

    useEffect(() => {
      const v = videoRef.current;
      if (v && stream && v.srcObject !== stream) {
        v.srcObject = stream;
        v.play().catch(() => {});
      }
    }, [stream]);

    useEffect(() => () => { cancelRef.current = true; }, []);

    /* ---- capture routines ------------------------------------------------ */

    async function countdown() {
      for (let i = 3; i > 0; i--) {
        setCount(i);
        await sleep(850);
        if (cancelRef.current) return false;
      }
      setCount(0);
      await sleep(450);
      setCount(null);
      return true;
    }

    async function shootPhoto() {
      const v = videoRef.current;
      setFlash(true);
      const raw = PB.grabRaw(v, aspect.w, aspect.h, mirror);
      setTimeout(() => setFlash(false), 480);
      if (!raw) throw new Error("The camera did not return a frame. Try again.");
      onResult({ kind: "photo", raw });
    }

    async function shootGif() {
      const v = videoRef.current;
      const w = GIF_WIDTH;
      const h = Math.round((GIF_WIDTH * aspect.h) / aspect.w / 2) * 2;
      const frames = [];
      for (let i = 0; i < GIF_FRAMES; i++) {
        if (cancelRef.current) return;
        const raw = PB.grabRaw(v, w, h, mirror);
        if (raw) frames.push(raw);
        setProgress((i + 1) / GIF_FRAMES);
        await sleep(GIF_INTERVAL);
      }
      setProgress(0);
      if (!frames.length) throw new Error("No GIF frames were captured.");
      onResult({ kind: "gif", rawFrames: frames, w, h, delay: GIF_INTERVAL });
    }

    async function shootVideo() {
      const v = videoRef.current;
      const mime = PB.pickVideoMime();
      if (!mime || typeof MediaRecorder === "undefined") {
        throw new Error("This browser cannot record video (MediaRecorder is unavailable). Chrome or Edge works.");
      }

      const w = VIDEO_WIDTH;
      const h = Math.round((VIDEO_WIDTH * aspect.h) / aspect.w / 2) * 2;
      const canvas = PB.makeCanvas(w, h);
      const ctx = canvas.getContext("2d");

      /* Filter and frame are painted per rendered frame, so they end up baked
       * into the file rather than being a preview-only effect. */
      let drawing = true;
      const paint = () => {
        if (!drawing) return;
        ctx.filter = filterCss && filterCss !== "none" ? filterCss : "none";
        PB.drawSource(ctx, v, w, h, mirror);
        ctx.filter = "none";
        if (frameImg) ctx.drawImage(frameImg, 0, 0, w, h);
        requestAnimationFrame(paint);
      };
      paint();

      const out = canvas.captureStream(30);
      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getAudioTracks().forEach((t) => out.addTrack(t));
      } catch (e) {
        /* no mic, or the guest declined — record silent video */
      }

      const rec = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: 4500000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

      const done = new Promise((resolve) => { rec.onstop = resolve; });
      rec.start(200);

      const t0 = Date.now();
      while (Date.now() - t0 < VIDEO_SECONDS * 1000 && !cancelRef.current) {
        setProgress(Math.min(1, (Date.now() - t0) / (VIDEO_SECONDS * 1000)));
        await sleep(100);
      }
      rec.stop();
      await done;

      drawing = false;
      setProgress(0);
      if (micStream) micStream.getTracks().forEach((t) => t.stop());
      out.getTracks().forEach((t) => { if (t.kind === "video") t.stop(); });

      const blob = new Blob(chunks, { type: mime });
      onResult({ kind: "video", blob, mime, url: URL.createObjectURL(blob), seconds: VIDEO_SECONDS });
    }

    async function handleFiles(fileList) {
      const file = fileList && fileList[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setUploadErr("That's not an image file — pick a JPG or PNG.");
        return;
      }
      setUploadErr(null);
      const url = URL.createObjectURL(file);
      try {
        const img = await PB.loadImage(url);
        const raw = PB.grabRaw(img, aspect.w, aspect.h, false);
        if (!raw) throw new Error("Could not read that image.");
        onResult({ kind: "photo", raw });
      } catch (err) {
        setUploadErr("Could not load that image: " + (err.message || err));
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async function start() {
      if (running || !ready) return;
      setRunning(true);
      cancelRef.current = false;
      try {
        const ok = await countdown();
        if (!ok) return;
        if (mode === "photo") await shootPhoto();
        else if (mode === "gif") { setBusy("Capturing frames…"); await shootGif(); }
        else { setBusy("Recording…"); await shootVideo(); }
      } catch (err) {
        onError(err.message || String(err));
      } finally {
        setBusy(null);
        setCount(null);
        setProgress(0);
        setRunning(false);
      }
    }

    /* ---- render ----------------------------------------------------------- */

    const ratio = aspect.w / aspect.h;
    const stageStyle = {
      aspectRatio: `${aspect.w} / ${aspect.h}`,
      width: "100%",
      maxWidth: `calc(62vh * ${ratio})`
    };

    const shutterNote =
      mode === "photo" ? "3-second countdown, then one shot."
      : mode === "gif" ? `${GIF_FRAMES} frames · loops forever`
      : `${VIDEO_SECONDS} seconds with sound · filter & frame are baked in`;

    if (mode === "upload") {
      return (
        <div className="stage-wrap">
          <div
            className={"stage upload-zone" + (dragOver ? " drag" : "")}
            style={stageStyle}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {frameUrl && <img className="frame-overlay" src={frameUrl} alt="" />}
            <div className="upload-hint">
              <PB.Icons.Upload width="34" height="34" />
              <div>Click or drop a photo here</div>
              <span>JPG or PNG · cropped to fit the frame</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          <div className="shutter-note">
            {uploadErr || "Upload a guest's own photo, then style it with filters and frames like any other shot."}
          </div>
        </div>
      );
    }

    return (
      <div className="stage-wrap">
        <div className={"stage" + (mirror ? " mirrored" : "")} style={stageStyle}>
          <video ref={videoRef} autoPlay playsInline muted style={{ filter: filterCss }} />

          {!ready && <div className="hint">Waiting for camera permission…<br />Allow access to start the booth.</div>}
          {frameUrl && <img className="frame-overlay" src={frameUrl} alt="" />}

          {count !== null && (
            <div className={"countdown" + (count === 0 ? " smile" : "")} key={count}>
              {count === 0 ? "Smile!" : count}
            </div>
          )}
          {flash && <div className="flash" />}

          {busy === "Recording…" && (
            <div className="rec-badge"><i />REC</div>
          )}
          {busy && busy !== "Recording…" && (
            <div className="rec-badge"><i />{busy}</div>
          )}
          {progress > 0 && (
            <div className="progress-track"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          )}
        </div>

        <div className="shutter-row">
          <button className="shutter" onClick={start} disabled={!ready || running} title="Capture">
            {mode === "video" ? <PB.Icons.Square /> : <PB.Icons.Shutter />}
          </button>
        </div>
        <div className="shutter-note">{shutterNote}</div>

        <div className="stage-tools">
          <button
            className={"toggle" + (mirror ? " on" : "")}
            onClick={onToggleMirror}
            disabled={running}
          >
            <PB.Icons.Flip /> Mirror
          </button>

          {devices.length > 1 && (
            <select value={deviceId || ""} onChange={(e) => onDeviceChange(e.target.value)} disabled={running}>
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
              ))}
            </select>
          )}

          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-faint)" }}>
            {aspect.name} · {aspect.w}×{aspect.h}
          </span>
        </div>
      </div>
    );
  };
})();
