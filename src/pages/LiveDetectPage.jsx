import { useRef, useState, useEffect, useCallback } from "react";
import { Hands } from "@mediapipe/hands";
import * as drawingUtils from "@mediapipe/drawing_utils";
import { useApp } from "../context/AppContext";

// ─── Gesture Engine ──────────────────────────────────────────────────────────

/**
 * Returns normalised distance between two landmarks.
 */
const dist = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

/**
 * Detect ASL-style letter from MediaPipe hand landmarks.
 * Landmarks: https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
 */
const detectGesture = (lm) => {
  // Helper: finger tip above its PIP joint (finger is "up")
  const up = (tip, pip) => lm[tip].y < lm[pip].y;

  // Thumb: extended when tip is left of IP joint (right hand) or right (left hand)
  // Use x-axis heuristic relative to wrist
  const thumbOpen = lm[4].x < lm[3].x; // works for right hand facing camera

  const index  = up(8,  6);
  const middle = up(12, 10);
  const ring   = up(16, 14);
  const pinky  = up(20, 18);

  const allCurled = !index && !middle && !ring && !pinky;
  const allUp     = index && middle && ring && pinky;

  // A — fist, thumb to side
  if (allCurled && !thumbOpen) return "A";

  // B — all four fingers up, thumb tucked
  if (allUp && !thumbOpen) return "B";

  // C — curved hand (approximate: all fingers partially bent)
  {
    const curvature = (tip, pip, mcp) =>
      lm[tip].y - lm[mcp].y; // negative = extended, positive = curled
    const approxC =
      !index && !middle && !ring && !pinky &&
      dist(lm[4], lm[8]) < 0.15;
    if (approxC) return "C";
  }

  // D — index up, others curled, thumb touches middle
  if (index && !middle && !ring && !pinky && dist(lm[4], lm[12]) < 0.08)
    return "D";

  // E — all fingers curled, thumb tucked under
  if (allCurled && dist(lm[4], lm[8]) < 0.06) return "E";

  // F — index + thumb pinch, others up
  if (!index && middle && ring && pinky && dist(lm[4], lm[8]) < 0.07)
    return "F";

  // I — pinky only up
  if (!index && !middle && !ring && pinky) return "I";

  // L — index up, thumb open, others curled
  if (index && !middle && !ring && !pinky && thumbOpen) return "L";

  // O — all fingers curve toward thumb (distance heuristic)
  if (dist(lm[4], lm[8]) < 0.05 && !middle && !ring && !pinky) return "O";

  // V — index + middle up, others down
  if (index && middle && !ring && !pinky) return "V";

  // W — index + middle + ring up
  if (index && middle && ring && !pinky) return "W";

  // Y — pinky + thumb out
  if (!index && !middle && !ring && pinky && thumbOpen) return "Y";

  return "";
};

const MEANINGS = {
  A: "Letter A", B: "Letter B", C: "Letter C", D: "Letter D",
  E: "Letter E", F: "Letter F", I: "Letter I", L: "Letter L",
  O: "Letter O", V: "Victory / Peace", W: "Letter W", Y: "Letter Y",
};

// ─── Component ────────────────────────────────────────────────────────────────

const LiveDetectPage = () => {
  const { addHistory } = useApp();

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const handsRef    = useRef(null);
  const streamRef   = useRef(null);
  const loopRef     = useRef(false);   // ← replaces stale isDetecting closure
  const rafRef      = useRef(null);
  const lastLetterRef = useRef("");
  const holdCountRef  = useRef(0);     // debounce: require N consecutive frames
  const lastAddTime   = useRef(0);

  const [isDetecting, setIsDetecting] = useState(false);
  const [gestureText, setGestureText] = useState("—");
  const [meaningText, setMeaningText] = useState("Show your hand to the camera");
  const [word, setWord]               = useState("");
  const [pulseActive, setPulseActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [confidence, setConfidence]   = useState(0); // visual feedback

  // ── Gesture → word builder ────────────────────────────────────────────────
  const addToWord = useCallback((letter) => {
    if (!letter) { holdCountRef.current = 0; return; }

    const now = Date.now();
    if (letter === lastLetterRef.current) {
      holdCountRef.current += 1;
    } else {
      holdCountRef.current  = 1;
      lastLetterRef.current = letter;
    }

    // Require 8 stable frames AND 800 ms gap before appending
    if (holdCountRef.current === 8 && now - lastAddTime.current > 800) {
      setWord((prev) => prev + letter);
      lastAddTime.current = now;
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 400);
    }

    // Confidence bar: 0–100 based on hold count
    setConfidence(Math.min(100, (holdCountRef.current / 8) * 100));
  }, []);

  // ── Detection loop ────────────────────────────────────────────────────────
  const runLoop = useCallback(async () => {
    if (!loopRef.current) return;

    const video = videoRef.current;
    const hands = handsRef.current;

    if (video && hands && video.readyState >= 2) {
      try {
        await hands.send({ image: video });
      } catch {
        // ignore transient frame errors
      }
    }

    // Throttle to ~30 fps
    rafRef.current = requestAnimationFrame(() => {
      setTimeout(() => runLoop(), 33);
    });
  }, []);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setIsLoading(true);
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("Camera API not supported in this browser."), { name: "UnsupportedError" });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((res, rej) => {
          videoRef.current.onloadedmetadata = () => videoRef.current.play().then(res).catch(rej);
        });
      }

      // Init MediaPipe Hands
      const hands = new Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.75,
        minTrackingConfidence: 0.75,
      });

      hands.onResults((results) => {
        const canvas = canvasRef.current;
        const video  = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Mirror flip so it feels natural
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        if (results.multiHandLandmarks?.length) {
          for (const landmarks of results.multiHandLandmarks) {
            // Mirror-adjusted drawing
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            drawingUtils.drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, {
              color: "#00f5ff", lineWidth: 2,
            });
            drawingUtils.drawLandmarks(ctx, landmarks, {
              color: "#ff4fa3", lineWidth: 1, radius: 4,
            });
            ctx.restore();

            const letter = detectGesture(landmarks);
            setGestureText(letter || "—");
            setMeaningText(letter ? MEANINGS[letter] ?? `Letter ${letter}` : "Detecting…");
            addToWord(letter);
          }
        } else {
          setGestureText("—");
          setMeaningText("Show your hand to the camera");
          setConfidence(0);
          holdCountRef.current = 0;
        }
      });

      handsRef.current = hands;
      loopRef.current  = true;
      setIsDetecting(true);
      setIsLoading(false);
      runLoop();

    } catch (err) {
      setIsLoading(false);
      const msgs = {
        NotAllowedError:      "Camera permission denied. Allow camera access in your browser settings.",
        PermissionDeniedError:"Camera permission denied. Allow camera access in your browser settings.",
        NotFoundError:        "No camera found. Please connect a camera.",
        DevicesNotFoundError: "No camera found. Please connect a camera.",
        NotReadableError:     "Camera is in use by another app. Close it and try again.",
        TrackStartError:      "Camera is in use by another app. Close it and try again.",
        UnsupportedError:     err.message,
      };
      setCameraError(msgs[err.name] ?? "Could not start camera. Check permissions and try again.");
    }
  };

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = () => {
    if (word) addHistory({ type: "detection", original: word, corrected: null });

    loopRef.current = false;
    cancelAnimationFrame(rafRef.current);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    handsRef.current?.close();
    handsRef.current = null;

    setIsDetecting(false);
    setGestureText("—");
    setMeaningText("Show your hand to the camera");
    setConfidence(0);
    holdCountRef.current  = 0;
    lastLetterRef.current = "";
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    loopRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    handsRef.current?.close();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne+Mono&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ld-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #060a12;
          font-family: 'DM Sans', sans-serif;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .ld-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
          pointer-events: none;
        }

        @keyframes gridMove {
          to { transform: translate(50px, 50px); }
        }

        .ld-container {
          display: flex;
          gap: 24px;
          max-width: 1400px;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 1024px) {
          .ld-container { flex-direction: column; }
        }

        /* ── Video Section ── */
        .ld-video-section { flex: 1; display: flex; flex-direction: column; gap: 20px; }

        .ld-video-wrap {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #0a0f1a;
          border: 2px solid rgba(0,245,255,0.2);
          box-shadow: 0 0 40px rgba(0,245,255,0.15);
        }

        .ld-video-inner {
          position: relative;
          padding-bottom: 75%;
          background: #0a0f1a;
        }

        .ld-video-inner video,
        .ld-video-inner canvas {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }

        .ld-video-inner video  { z-index: 1; opacity: 0; } /* hidden — canvas mirrors it */
        .ld-video-inner canvas { z-index: 2; }

        .ld-camera-status {
          position: absolute;
          top: 16px; left: 50%;
          transform: translateX(-50%);
          background: rgba(6,10,18,0.85);
          border: 1px solid rgba(0,245,255,0.3);
          border-radius: 100px;
          padding: 6px 18px;
          font-size: 11px;
          font-weight: 600;
          color: #00f5ff;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Syne Mono', monospace;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .ld-status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ld-status-dot.active  { background: #4ade80; animation: blink 2s ease-in-out infinite; }
        .ld-status-dot.inactive { background: #ef4444; }

        @keyframes blink {
          0%,100% { opacity:1; } 50% { opacity:.4; }
        }

        /* Confidence bar at bottom of video */
        .ld-confidence-bar-wrap {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 4px;
          background: rgba(255,255,255,0.1);
          z-index: 4;
        }
        .ld-confidence-bar {
          height: 100%;
          background: linear-gradient(90deg, #00f5ff, #ff4fa3);
          transition: width 0.1s linear;
          border-radius: 0 2px 2px 0;
        }

        /* ── Control Panel ── */
        .ld-panel {
          width: 380px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 1024px) { .ld-panel { width: 100%; } }

        .ld-card {
          background: rgba(10,15,26,0.85);
          border: 1px solid rgba(0,245,255,0.15);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(10px);
        }

        .ld-card-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(0,245,255,0.55);
          margin-bottom: 14px;
          font-family: 'Syne Mono', monospace;
        }

        .ld-gesture-display { text-align: center; padding: 12px 0; }

        .ld-gesture-letter {
          font-size: 80px;
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          background: linear-gradient(135deg, #00f5ff, #ff4fa3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 10px;
          display: block;
          transition: transform 0.15s ease;
        }

        .ld-gesture-letter.pulse {
          animation: letterPop 0.35s cubic-bezier(.36,.07,.19,.97);
        }

        @keyframes letterPop {
          0%,100% { transform: scale(1); }
          40%      { transform: scale(1.25); }
        }

        .ld-gesture-meaning {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          font-weight: 400;
          min-height: 20px;
        }

        /* Word display */
        .ld-word-display {
          background: rgba(0,245,255,0.05);
          border: 1px solid rgba(0,245,255,0.2);
          border-radius: 12px;
          padding: 14px 16px;
          min-height: 58px;
          font-size: 26px;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          color: #00f5ff;
          word-break: break-all;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 4px;
        }

        .ld-word-placeholder {
          font-size: 12px;
          letter-spacing: 2px;
          color: rgba(0,245,255,0.3);
          font-family: 'Syne Mono', monospace;
        }

        .ld-btn-row { display: flex; gap: 8px; margin-top: 12px; }

        .ld-btn {
          flex: 1;
          padding: 9px;
          border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.6);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }

        .ld-btn:hover {
          background: rgba(255,255,255,0.09);
          color: #fff;
        }

        .ld-btn-clear { border-color: rgba(239,68,68,0.3); color: #ef4444; }
        .ld-btn-clear:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.5); }

        .ld-btn-space { border-color: rgba(0,245,255,0.2); color: rgba(0,245,255,0.7); }
        .ld-btn-space:hover { background: rgba(0,245,255,0.1); border-color: rgba(0,245,255,0.4); color: #00f5ff; }

        .ld-main-btn {
          width: 100%;
          padding: 15px;
          border-radius: 12px;
          border: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          font-family: 'Syne', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: 1px;
        }

        .ld-main-btn.start {
          background: linear-gradient(135deg, #00f5ff, #00b8d4);
          color: #060a12;
          box-shadow: 0 4px 24px rgba(0,245,255,0.35);
        }
        .ld-main-btn.start:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,245,255,0.5);
        }

        .ld-main-btn.stop {
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          color: #fff;
          box-shadow: 0 4px 24px rgba(239,68,68,0.35);
        }
        .ld-main-btn.stop:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(239,68,68,0.5);
        }

        .ld-main-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; }

        /* Error box */
        .ld-error-box {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 14px;
          color: #fca5a5;
          font-size: 13px;
          line-height: 1.6;
        }

        .ld-error-title {
          font-weight: 700;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .ld-dismiss {
          margin-top: 10px;
          background: none;
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 7px;
          color: #fca5a5;
          padding: 5px 12px;
          font-size: 12px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .ld-dismiss:hover { background: rgba(239,68,68,0.15); }

        /* Tips */
        .ld-tips {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          line-height: 1.8;
          font-family: 'Syne Mono', monospace;
        }
        .ld-tips span { color: rgba(0,245,255,0.5); }
      `}</style>

      <div className="ld-root">
        <div className="ld-container">

          {/* ── Video ── */}
          <div className="ld-video-section">
            <div className="ld-video-wrap">
              <div className="ld-video-inner">
                {/* video is hidden; canvas shows the mirrored+annotated feed */}
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} />

                <div className="ld-camera-status">
                  <span className={`ld-status-dot ${isDetecting ? "active" : "inactive"}`} />
                  {isLoading ? "INITIALISING…" : isDetecting ? "CAMERA ACTIVE" : "CAMERA INACTIVE"}
                </div>

                {/* confidence bar */}
                <div className="ld-confidence-bar-wrap">
                  <div className="ld-confidence-bar" style={{ width: `${confidence}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Panel ── */}
          <div className="ld-panel">

            {/* Gesture */}
            <div className="ld-card">
              <div className="ld-card-title">Detected Gesture</div>
              <div className="ld-gesture-display">
                <span className={`ld-gesture-letter ${pulseActive ? "pulse" : ""}`}>
                  {gestureText}
                </span>
                <div className="ld-gesture-meaning">{meaningText}</div>
              </div>
            </div>

            {/* Word */}
            <div className="ld-card">
              <div className="ld-card-title">Generated Word</div>
              <div className="ld-word-display">
                {word
                  ? word
                  : <span className="ld-word-placeholder">START SIGNING</span>
                }
              </div>
              <div className="ld-btn-row">
                <button
                  className="ld-btn ld-btn-space"
                  onClick={() => setWord((w) => w + " ")}
                >
                  ␣ Space
                </button>
                <button
                  className="ld-btn"
                  onClick={() => setWord((w) => w.slice(0, -1))}
                >
                  ⌫ Delete
                </button>
                <button
                  className="ld-btn ld-btn-clear"
                  onClick={() => {
                    if (word) addHistory({ type: "detection", original: word, corrected: null });
                    setWord("");
                    lastLetterRef.current = "";
                    holdCountRef.current  = 0;
                  }}
                >
                  ✕ Clear
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="ld-card">
              {cameraError && (
                <div className="ld-error-box">
                  <div className="ld-error-title">⚠ Camera Error</div>
                  {cameraError}
                  <br />
                  <button className="ld-dismiss" onClick={() => setCameraError(null)}>
                    Dismiss
                  </button>
                </div>
              )}

              {!isDetecting ? (
                <button className="ld-main-btn start" onClick={startCamera} disabled={isLoading}>
                  {isLoading ? "⏳  Loading Model…" : "▶  Start Detection"}
                </button>
              ) : (
                <button className="ld-main-btn stop" onClick={stopCamera}>
                  ⏹  Stop Detection
                </button>
              )}
            </div>

            {/* Tips */}
            <div className="ld-card">
              <div className="ld-card-title">Quick Tips</div>
              <div className="ld-tips">
                <span>A</span> = closed fist &nbsp;|&nbsp;
                <span>B</span> = all fingers up<br />
                <span>D</span> = index only, touch middle<br />
                <span>V</span> = index + middle up<br />
                <span>L</span> = index up + thumb out<br />
                <span>Y</span> = pinky + thumb out<br />
                <br />
                Hold each sign still for ~½ sec.<br />
                The bar below the camera fills as confidence grows.
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default LiveDetectPage;