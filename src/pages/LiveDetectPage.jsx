import { useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as drawingUtils from "@mediapipe/drawing_utils";
import { useApp } from "../context/AppContext";
import bgImage from "../assets/live-detect-bg.png";

const LiveDetectPage = () => {
  const { addHistory } = useApp();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [gestureText, setGestureText] = useState("-");
  const [meaningText, setMeaningText] = useState("-");
  const [word, setWord] = useState("");
  const [pulseActive, setPulseActive] = useState(false);

  const lastLetterRef = useRef("");

  const getMeaning = (letter) => {
    switch (letter) {
      case "A": return "Letter A";
      case "B": return "Letter B";
      case "D": return "Letter D";
      case "V": return "Victory";
      default: return "Detecting...";
    }
  };

  const detectGesture = (landmarks) => {
    const isFingerUp = (tip, pip) => landmarks[tip].y < landmarks[pip].y;
    const indexUp = isFingerUp(8, 6);
    const middleUp = isFingerUp(12, 10);
    const ringUp = isFingerUp(16, 14);
    const pinkyUp = isFingerUp(20, 18);

    if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "A";
    if (indexUp && middleUp && ringUp && pinkyUp) return "B";
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return "D";
    if (indexUp && middleUp && !ringUp && !pinkyUp) return "V";
    return "";
  };

  const addToWord = (letter) => {
    if (!letter) return;
    if (letter !== lastLetterRef.current) {
      setWord((prev) => prev + letter);
      lastLetterRef.current = letter;
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 400);
    }
  };

  const startCamera = async () => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          drawingUtils.drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, {
            color: "#00f5ff",
            lineWidth: 2,
          });
          drawingUtils.drawLandmarks(ctx, landmarks, {
            color: "#ff4fa3",
            lineWidth: 1,
            radius: 3,
          });
          const letter = detectGesture(landmarks);
          if (letter) {
            setGestureText(letter);
            setMeaningText(getMeaning(letter));
            addToWord(letter);
          }
        }
      } else {
        setGestureText("-");
        setMeaningText("-");
      }
    });

    cameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cameraRef.current.start();
    setIsDetecting(true);
  };

  const stopCamera = () => {
    // Save current word to history before stopping
    if (word) {
      addHistory({
        type: "detection",
        original: word,
        corrected: null
      });
    }
    
    if (cameraRef.current) cameraRef.current.stop();
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    setIsDetecting(false);
  };

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

        /* Animated grid background */
        .ld-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        /* Glow corners */
        .ld-glow-tl {
          position: fixed;
          top: -150px; left: -150px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .ld-glow-br {
          position: fixed;
          bottom: -150px; right: -150px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(255,79,163,0.07) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* ── LAYOUT ── */
        .ld-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 1200px;
          position: relative;
          z-index: 5;
        }

        @media (min-width: 1024px) {
          .ld-layout {
            flex-direction: row;
            height: 82vh;
          }
        }

        /* ── CAMERA PANEL ── */
        .ld-camera-wrap {
          position: relative;
          flex: 1;
          min-height: 320px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(0,245,255,0.12);
          box-shadow: 0 0 0 1px rgba(0,245,255,0.04), 0 24px 60px rgba(0,0,0,0.6);
        }

        .ld-camera-wrap video,
        .ld-camera-wrap canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
        }

        .ld-camera-wrap canvas { z-index: 2; }

        /* Camera overlay UI */
        .ld-cam-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }

        /* Corner brackets */
        .ld-bracket {
          position: absolute;
          width: 28px; height: 28px;
          border-color: rgba(0,245,255,0.5);
          border-style: solid;
          border-width: 0;
        }
        .ld-bracket.tl { top: 14px; left: 14px; border-top-width: 2px; border-left-width: 2px; border-radius: 4px 0 0 0; }
        .ld-bracket.tr { top: 14px; right: 14px; border-top-width: 2px; border-right-width: 2px; border-radius: 0 4px 0 0; }
        .ld-bracket.bl { bottom: 14px; left: 14px; border-bottom-width: 2px; border-left-width: 2px; border-radius: 0 0 0 4px; }
        .ld-bracket.br { bottom: 14px; right: 14px; border-bottom-width: 2px; border-right-width: 2px; border-radius: 0 0 4px 0; }

        /* Status badge */
        .ld-status-badge {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(6,10,18,0.75);
          border: 1px solid rgba(0,245,255,0.18);
          backdrop-filter: blur(8px);
          border-radius: 100px;
          padding: 5px 14px;
          font-family: 'Syne Mono', monospace;
          font-size: 11px;
          color: rgba(0,245,255,0.8);
          letter-spacing: 1px;
        }

        .ld-status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #00f5ff;
          flex-shrink: 0;
        }

        .ld-status-dot.live {
          background: #4ade80;
          animation: livePulse 1.2s ease-in-out infinite;
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }

        /* Inactive overlay */
        .ld-inactive-overlay {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(6,10,18,0.82);
          backdrop-filter: blur(6px);
          gap: 12px;
        }

        .ld-cam-icon {
          width: 64px; height: 64px;
          border-radius: 50%;
          border: 1.5px solid rgba(0,245,255,0.25);
          display: flex; align-items: center; justify-content: center;
          color: rgba(0,245,255,0.4);
          font-size: 26px;
        }

        .ld-inactive-label {
          font-family: 'Syne Mono', monospace;
          font-size: 12px;
          color: rgba(148,163,184,0.5);
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        /* ── RIGHT PANEL ── */
        .ld-panel {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (min-width: 1024px) {
          .ld-panel { width: 320px; flex-shrink: 0; }
        }

        .ld-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          padding: 20px 22px;
          transition: border-color 0.3s;
        }

        .ld-card:hover {
          border-color: rgba(0,245,255,0.12);
        }

        .ld-card-label {
          font-family: 'Syne Mono', monospace;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(148,163,184,0.45);
          margin-bottom: 10px;
        }

        /* Gesture display */
        .ld-gesture-box {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .ld-gesture-letter {
          font-family: 'Syne', sans-serif;
          font-size: 80px;
          font-weight: 800;
          line-height: 1;
          color: #00f5ff;
          text-shadow: 0 0 30px rgba(0,245,255,0.4);
          transition: all 0.15s ease;
          min-width: 70px;
        }

        .ld-gesture-letter.pulse-anim {
          transform: scale(1.12);
          text-shadow: 0 0 50px rgba(0,245,255,0.7);
        }

        .ld-gesture-meta { flex: 1; }

        .ld-gesture-meaning {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          line-height: 1.2;
        }

        .ld-gesture-sub {
          font-size: 12px;
          color: rgba(148,163,184,0.5);
          margin-top: 4px;
        }

        .ld-confidence-bar {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 10px;
          margin-top: 14px;
          overflow: hidden;
        }

        .ld-confidence-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #00f5ff, #7c3aed);
          border-radius: 10px;
          transition: width 0.4s ease;
        }

        .ld-confidence-fill.active { width: 87%; }

        /* Word builder */
        .ld-word-display {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: 3px;
          word-break: break-all;
          min-height: 38px;
          line-height: 1.2;
        }

        .ld-word-placeholder {
          font-family: 'Syne Mono', monospace;
          font-size: 13px;
          color: rgba(148,163,184,0.3);
          letter-spacing: 1px;
        }

        .ld-word-count {
          font-family: 'Syne Mono', monospace;
          font-size: 11px;
          color: rgba(148,163,184,0.4);
          margin-top: 6px;
        }

        /* Buttons */
        .ld-btn-row {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .ld-btn {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          border: none;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: all 0.2s ease;
        }

        .ld-btn-clear {
          background: rgba(255,79,163,0.1);
          border: 1px solid rgba(255,79,163,0.2);
          color: #ff4fa3;
        }

        .ld-btn-clear:hover {
          background: rgba(255,79,163,0.18);
          border-color: rgba(255,79,163,0.35);
        }

        /* Main control button */
        .ld-control-wrap {
          margin-top: auto;
        }

        .ld-main-btn {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: none;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .ld-main-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.2s;
          background: rgba(255,255,255,0.06);
        }

        .ld-main-btn:hover::before { opacity: 1; }
        .ld-main-btn:hover { transform: translateY(-1px); }
        .ld-main-btn:active { transform: translateY(0); }

        .ld-main-btn.start {
          background: linear-gradient(135deg, #00c8c8, #00f5ff);
          color: #060a12;
          box-shadow: 0 8px 28px rgba(0,245,255,0.25);
        }

        .ld-main-btn.stop {
          background: linear-gradient(135deg, #e11d48, #ff4fa3);
          color: white;
          box-shadow: 0 8px 28px rgba(225,29,72,0.3);
        }

        /* Stats row */
        .ld-stats-row {
          display: flex;
          gap: 10px;
        }

        .ld-mini-stat {
          flex: 1;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 14px;
          text-align: center;
        }

        .ld-mini-stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #00f5ff;
        }

        .ld-mini-stat-label {
          font-size: 10px;
          color: rgba(148,163,184,0.45);
          margin-top: 3px;
          font-family: 'Syne Mono', monospace;
          letter-spacing: 0.5px;
        }

        /* Scan line animation on camera */
        @keyframes scanLine {
          0% { top: 0%; opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }

        .ld-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent);
          z-index: 3;
          animation: scanLine 3s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="ld-root">
        <div className="ld-glow-tl" />
        <div className="ld-glow-br" />

        <div className="ld-layout">

          {/* ── CAMERA PANEL ── */}
          <div className="ld-camera-wrap">
            <video ref={videoRef} autoPlay playsInline />
            <canvas ref={canvasRef} />

            {/* Overlay UI */}
            <div className="ld-cam-overlay">
              <div className="ld-bracket tl" />
              <div className="ld-bracket tr" />
              <div className="ld-bracket bl" />
              <div className="ld-bracket br" />

              <div className="ld-status-badge">
                <div className={`ld-status-dot ${isDetecting ? "live" : ""}`} />
                {isDetecting ? "LIVE · DETECTING" : "CAMERA · IDLE"}
              </div>

              {isDetecting && <div className="ld-scan-line" />}
            </div>

            {/* Inactive overlay */}
            {!isDetecting && (
              <div className="ld-inactive-overlay">
                <div className="ld-cam-icon">📷</div>
                <p className="ld-inactive-label">Camera Inactive</p>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="ld-panel">

            {/* Gesture card */}
            <div className="ld-card">
              <p className="ld-card-label">Detected Gesture</p>
              <div className="ld-gesture-box">
                <div className={`ld-gesture-letter ${pulseActive ? "pulse-anim" : ""}`}>
                  {gestureText}
                </div>
                <div className="ld-gesture-meta">
                  <p className="ld-gesture-meaning">{meaningText}</p>
                  <p className="ld-gesture-sub">ASL Recognition</p>
                </div>
              </div>
              <div className="ld-confidence-bar">
                <div className={`ld-confidence-fill ${gestureText !== "-" ? "active" : ""}`} />
              </div>
            </div>

            {/* Word builder */}
            <div className="ld-card" style={{ flex: 1 }}>
              <p className="ld-card-label">Generated Word</p>

              {word
                ? <p className="ld-word-display">{word}</p>
                : <p className="ld-word-placeholder">START SIGNING...</p>
              }

              {word && (
                <p className="ld-word-count">{word.length} CHARACTERS</p>
              )}

              <div className="ld-btn-row">
                <button
                  className="ld-btn ld-btn-clear"
                  onClick={() => { 
                    // Save to history before clearing
                    if (word) {
                      addHistory({
                        type: "detection",
                        original: word,
                        corrected: null
                      });
                    }
                    setWord(""); 
                    lastLetterRef.current = ""; 
                  }}
                >
                  ✕ Clear
                </button>
              </div>
            </div>

            {/* Mini stats */}
            <div className="ld-stats-row">
              <div className="ld-mini-stat">
                <div className="ld-mini-stat-val">{word.length}</div>
                <div className="ld-mini-stat-label">CHARS</div>
              </div>
              <div className="ld-mini-stat">
                <div className="ld-mini-stat-val" style={{ color: "#a78bfa" }}>
                  {gestureText !== "-" ? "87%" : "—"}
                </div>
                <div className="ld-mini-stat-label">ACCURACY</div>
              </div>
              <div className="ld-mini-stat">
                <div className="ld-mini-stat-val" style={{ color: "#4ade80" }}>
                  {isDetecting ? "ON" : "OFF"}
                </div>
                <div className="ld-mini-stat-label">STATUS</div>
              </div>
            </div>

            {/* Main CTA */}
            <div className="ld-control-wrap">
              {!isDetecting ? (
                <button className="ld-main-btn start" onClick={startCamera}>
                  <span>▶</span> Start Detection
                </button>
              ) : (
                <button className="ld-main-btn stop" onClick={stopCamera}>
                  <span>⏹</span> Stop Detection
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default LiveDetectPage;