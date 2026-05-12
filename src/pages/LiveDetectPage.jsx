import { useRef, useState, useEffect } from "react";
import { Hands } from "@mediapipe/hands";
import * as drawingUtils from "@mediapipe/drawing_utils";
import { useApp } from "../context/AppContext";
import bgImage from "../assets/live-detect-bg.png";

const LiveDetectPage = () => {
  const { addHistory } = useApp();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [gestureText, setGestureText] = useState("-");
  const [meaningText, setMeaningText] = useState("-");
  const [word, setWord] = useState("");
  const [pulseActive, setPulseActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const detectFromVideo = async () => {
    if (videoRef.current && handsRef.current && videoRef.current.readyState === 4) {
      await handsRef.current.send({ image: videoRef.current });
    }
    if (isDetecting) {
      requestAnimationFrame(detectFromVideo);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setCameraError(null);

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser. Please use Chrome, Firefox, or Safari.");
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      });

      streamRef.current = stream;

      // Set video source and wait for it to load
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });
      }

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults((results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        // Clear and draw video frame
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // Draw hand landmarks
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
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

            // Detect gesture
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

        ctx.restore();
      });

      handsRef.current = hands;
      setIsDetecting(true);
      setIsLoading(false);

      // Start detection loop
      detectFromVideo();

    } catch (error) {
      console.error("Camera error:", error);
      setIsLoading(false);

      let errorMessage = "Failed to access camera. ";

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage += "Please allow camera access in your browser settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage += "No camera found. Please connect a camera.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage += "Camera is already in use by another application.";
      } else if (error.message && error.message.includes("not supported")) {
        errorMessage = error.message;
      } else {
        errorMessage += "Please check your camera permissions and try again.";
      }

      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    // Save word to history
    if (word) {
      addHistory({
        type: "detection",
        original: word,
        corrected: null
      });
    }

    // Stop detection
    setIsDetecting(false);

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Close hands
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

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
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
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

        /* Video Section */
        .ld-video-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

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
          background: url(${bgImage}) center/cover;
        }

        video, canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        video { z-index: 1; }
        canvas { z-index: 2; }

        .ld-camera-status {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(10,15,26,0.9);
          border: 1px solid rgba(0,245,255,0.3);
          border-radius: 100px;
          padding: 8px 20px;
          font-size: 12px;
          font-weight: 600;
          color: #00f5ff;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Syne Mono', monospace;
          letter-spacing: 1px;
        }

        .ld-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isDetecting ? '#4ade80' : '#ef4444'};
          animation: ${isDetecting ? 'pulse 2s ease-in-out infinite' : 'none'};
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Control Panel */
        .ld-panel {
          width: 380px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 1024px) {
          .ld-panel { width: 100%; }
        }

        .ld-card {
          background: rgba(10,15,26,0.8);
          border: 1px solid rgba(0,245,255,0.15);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(10px);
        }

        .ld-card-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(0,245,255,0.6);
          margin-bottom: 12px;
          font-family: 'Syne Mono', monospace;
        }

        .ld-gesture-display {
          text-align: center;
          padding: 20px;
        }

        .ld-gesture-letter {
          font-size: 72px;
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          background: linear-gradient(135deg, #00f5ff, #ff4fa3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
          margin-bottom: 12px;
          animation: ${pulseActive ? 'letterPulse 0.4s ease' : 'none'};
        }

        @keyframes letterPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .ld-gesture-meaning {
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          font-weight: 500;
        }

        .ld-word-display {
          background: rgba(0,245,255,0.05);
          border: 1px solid rgba(0,245,255,0.2);
          border-radius: 12px;
          padding: 16px;
          min-height: 60px;
          font-size: 24px;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          color: #00f5ff;
          word-break: break-all;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ld-btn-row {
          display: flex;
          gap: 8px;
        }

        .ld-btn {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.7);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }

        .ld-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          color: #fff;
        }

        .ld-btn-clear {
          border-color: rgba(239,68,68,0.3);
          color: #ef4444;
        }

        .ld-btn-clear:hover {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.5);
        }

        .ld-main-btn {
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          border: none;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          font-family: 'Syne', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .ld-main-btn.start {
          background: linear-gradient(135deg, #00f5ff, #00d4ff);
          color: #060a12;
          box-shadow: 0 4px 20px rgba(0,245,255,0.4);
        }

        .ld-main-btn.start:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(0,245,255,0.6);
        }

        .ld-main-btn.stop {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 4px 20px rgba(239,68,68,0.4);
        }

        .ld-main-btn.stop:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(239,68,68,0.6);
        }

        .ld-main-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ld-error-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          color: #fca5a5;
          font-size: 14px;
          line-height: 1.5;
          text-align: center;
        }

        .ld-error-title {
          font-weight: 600;
          margin-bottom: 8px;
        }

        .ld-error-btn {
          margin-top: 12px;
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 8px;
          color: #fca5a5;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
        }

        .ld-error-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }
      `}</style>

      <div className="ld-root">
        <div className="ld-container">
          {/* Video Section */}
          <div className="ld-video-section">
            <div className="ld-video-wrap">
              <div className="ld-video-inner">
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} />
                <div className="ld-camera-status">
                  <span className="ld-status-dot" />
                  {isDetecting ? "CAMERA ACTIVE" : "CAMERA INACTIVE"}
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="ld-panel">
            {/* Gesture Display */}
            <div className="ld-card">
              <div className="ld-card-title">Detected Gesture</div>
              <div className="ld-gesture-display">
                <div className="ld-gesture-letter">{gestureText}</div>
                <div className="ld-gesture-meaning">{meaningText}</div>
              </div>
            </div>

            {/* Word Display */}
            <div className="ld-card">
              <div className="ld-card-title">Generated Word</div>
              <div className="ld-word-display">
                {word || "START SIGNING"}
              </div>
              <div className="ld-btn-row">
                <button
                  className="ld-btn ld-btn-clear"
                  onClick={() => {
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

            {/* Control Buttons */}
            <div className="ld-card">
              {cameraError && (
                <div className="ld-error-box">
                  <div className="ld-error-title">⚠️ Camera Error</div>
                  <div>{cameraError}</div>
                  <button className="ld-error-btn" onClick={() => setCameraError(null)}>
                    Try Again
                  </button>
                </div>
              )}
              {!isDetecting ? (
                <button
                  className="ld-main-btn start"
                  onClick={startCamera}
                  disabled={isLoading}
                >
                  <span>{isLoading ? '⏳' : '▶'}</span>
                  {isLoading ? 'Loading...' : 'Start Detection'}
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
