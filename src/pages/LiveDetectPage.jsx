import { useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";

// ─── Gesture Engine ───────────────────────────────────────────────────────────
const detectGesture = (lm) => {
  // Helper functions
  const up = (tip, pip) => lm[tip].y < lm[pip].y;
  const down = (tip, pip) => lm[tip].y > lm[pip].y;
  const distance = (a, b) => Math.sqrt(Math.pow(lm[a].x - lm[b].x, 2) + Math.pow(lm[a].y - lm[b].y, 2));
  
  // Thumb (right hand: x increases left, left hand: x increases right)
  const thumbOpen = lm[4].x < lm[3].x; // Works for right hand
  const thumbClosed = !thumbOpen;
  const thumbUp = up(4, 2);
  
  // Fingers extended/curled
  const index  = up(8,  6);
  const middle = up(12, 10);
  const ring   = up(16, 14);
  const pinky  = up(20, 18);
  
  const indexCurled  = !index;
  const middleCurled = !middle;
  const ringCurled   = !ring;
  const pinkyCurled  = !pinky;
  
  // Common patterns
  const allCurled = indexCurled && middleCurled && ringCurled && pinkyCurled;
  const allUp     = index && middle && ring && pinky;
  const onlyIndex = index && middleCurled && ringCurled && pinkyCurled;
  const onlyPinky = indexCurled && middleCurled && ringCurled && pinky;
  
  // Finger proximity checks
  const indexMiddleClose = distance(8, 12) < 0.05;
  const thumbIndexClose = distance(4, 8) < 0.05;
  
  // A - Fist with thumb on side
  if (allCurled && thumbClosed) return "A";
  
  // B - Flat hand, fingers up, thumb across palm
  if (allUp && thumbClosed) return "B";
  
  // C - Curved hand (all fingers curved)
  if (allCurled && thumbOpen && distance(4, 8) > 0.1 && distance(4, 8) < 0.2) return "C";
  
  // D - Index up, others curled, thumb touches middle
  if (onlyIndex && thumbOpen && distance(4, 12) < 0.08) return "D";
  
  // E - All fingers curled, thumb curled over
  if (allCurled && thumbClosed && lm[4].y > lm[8].y) return "E";
  
  // F - Index and thumb form circle, others up
  if (thumbIndexClose && middle && ring && pinky) return "F";
  
  // G - Index pointing sideways, thumb up
  if (index && middleCurled && ringCurled && pinkyCurled && thumbUp) return "G";
  
  // H - Index and middle pointing sideways, others curled
  if (index && middle && ringCurled && pinkyCurled && thumbClosed) return "H";
  
  // I - Pinky up, others curled
  if (onlyPinky && thumbClosed) return "I";
  
  // J - Pinky up with motion (same as I for static detection)
  // (J requires motion, so we'll detect it as I in static mode)
  
  // K - Index and middle up in V, thumb touches middle
  if (index && middle && ringCurled && pinkyCurled && thumbOpen && distance(4, 12) < 0.1) return "K";
  
  // L - Index up, thumb out at 90 degrees
  if (onlyIndex && thumbOpen && Math.abs(lm[4].x - lm[8].x) > 0.1) return "L";
  
  // M - Three fingers over thumb (index, middle, ring curled over thumb)
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbClosed && lm[8].y < lm[4].y) return "M";
  
  // N - Two fingers over thumb (index, middle curled over thumb)
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbClosed && lm[8].y < lm[12].y) return "N";
  
  // O - All fingers form circle with thumb
  if (thumbIndexClose && middleCurled && ringCurled && pinkyCurled && distance(4, 12) < 0.1) return "O";
  
  // P - Index down, middle out, thumb between
  if (down(8, 6) && middle && ringCurled && pinkyCurled && thumbOpen) return "P";
  
  // Q - Index and thumb pointing down
  if (down(8, 6) && down(4, 2) && middleCurled && ringCurled && pinkyCurled) return "Q";
  
  // R - Index and middle crossed
  if (index && middle && ringCurled && pinkyCurled && indexMiddleClose) return "R";
  
  // S - Fist with thumb across fingers
  if (allCurled && thumbClosed && lm[4].y < lm[8].y) return "S";
  
  // T - Thumb between index and middle
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbUp && lm[4].y < lm[8].y) return "T";
  
  // U - Index and middle up together
  if (index && middle && ringCurled && pinkyCurled && !indexMiddleClose && thumbClosed) return "U";
  
  // V - Index and middle up in V shape
  if (index && middle && ringCurled && pinkyCurled && !indexMiddleClose && thumbOpen) return "V";
  
  // W - Three fingers up (index, middle, ring)
  if (index && middle && ring && pinkyCurled) return "W";
  
  // X - Index bent at knuckle (hook shape)
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbOpen && lm[8].y < lm[5].y) return "X";
  
  // Y - Thumb and pinky out
  if (onlyPinky && thumbOpen && Math.abs(lm[4].x - lm[20].x) > 0.15) return "Y";
  
  // Z - Index pointing, making Z motion (same as pointing for static)
  if (onlyIndex && thumbClosed && !thumbUp) return "Z";
  
  return "";
};

const MEANINGS = {
  A: "Letter A - Fist",
  B: "Letter B - Flat Hand",
  C: "Letter C - Curved Hand",
  D: "Letter D - Pointing Up",
  E: "Letter E - Closed Fist",
  F: "Letter F - OK Sign",
  G: "Letter G - Pointing Side",
  H: "Letter H - Two Fingers Side",
  I: "Letter I - Pinky Up",
  K: "Letter K - Two Fingers",
  L: "Letter L - L Shape",
  M: "Letter M - Three Over Thumb",
  N: "Letter N - Two Over Thumb",
  O: "Letter O - Circle",
  P: "Letter P - Pointing Down",
  Q: "Letter Q - Pointing Down",
  R: "Letter R - Crossed Fingers",
  S: "Letter S - Fist",
  T: "Letter T - Thumb Between",
  U: "Letter U - Two Up",
  V: "Letter V - Peace Sign",
  W: "Letter W - Three Up",
  X: "Letter X - Hook",
  Y: "Letter Y - Hang Loose",
  Z: "Letter Z - Pointing",
};

// ─── Load MediaPipe scripts dynamically ──────────────────────────────────────
const CDN_PRIMARY = "https://cdn.jsdelivr.net/npm/@mediapipe";
const CDN_FALLBACK = "https://unpkg.com/@mediapipe";

const loadScript = (src, fallbackSrc = null) => new Promise((resolve, reject) => {
  const existingScript = document.querySelector(`script[src="${src}"]`) || 
                         (fallbackSrc && document.querySelector(`script[src="${fallbackSrc}"]`));
  if (existingScript) { 
    console.log(`✓ Script already loaded: ${src}`);
    resolve(); 
    return; 
  }
  
  const s = document.createElement("script");
  s.src = src; 
  s.async = true;
  s.crossOrigin = "anonymous";
  
  s.onload = () => {
    console.log(`✓ Loaded: ${src}`);
    resolve();
  };
  
  s.onerror = () => {
    console.error(`✗ Failed: ${src}`);
    if (fallbackSrc) {
      console.log(`Trying fallback CDN: ${fallbackSrc}`);
      document.head.removeChild(s);
      const fallback = document.createElement("script");
      fallback.src = fallbackSrc;
      fallback.async = true;
      fallback.crossOrigin = "anonymous";
      fallback.onload = () => {
        console.log(`✓ Loaded from fallback: ${fallbackSrc}`);
        resolve();
      };
      fallback.onerror = () => {
        console.error(`✗ Fallback also failed: ${fallbackSrc}`);
        reject(new Error(`Failed to load from both CDNs: ${src}`));
      };
      document.head.appendChild(fallback);
    } else {
      reject(new Error(`Failed to load: ${src}`));
    }
  };
  
  document.head.appendChild(s);
});

const loadMediaPipe = async () => {
  try {
    console.log("Loading MediaPipe scripts...");
    
    // Try primary CDN with fallback
    await loadScript(
      `${CDN_PRIMARY}/drawing_utils@0.3.1620248257/drawing_utils.js`,
      `${CDN_FALLBACK}/drawing_utils@0.3.1620248257/drawing_utils.js`
    );
    
    await loadScript(
      `${CDN_PRIMARY}/hands@0.4.1646424915/hands.js`,
      `${CDN_FALLBACK}/hands@0.4.1646424915/hands.js`
    );

    // Wait for globals to appear (up to 10 seconds)
    console.log("Waiting for MediaPipe globals...");
    for (let i = 0; i < 50; i++) {
      const hasHands = typeof window.Hands !== 'undefined';
      const hasDrawConnectors = typeof window.drawConnectors !== 'undefined';
      const hasDrawLandmarks = typeof window.drawLandmarks !== 'undefined';
      const hasHandConnections = typeof window.HAND_CONNECTIONS !== 'undefined';
      
      console.log(`Check ${i + 1}/50:`, { hasHands, hasDrawConnectors, hasDrawLandmarks, hasHandConnections });
      
      if (hasHands) {
        console.log("✓ MediaPipe Hands loaded successfully");
        if (!hasDrawConnectors || !hasDrawLandmarks) {
          console.warn("⚠ Drawing utilities not available, will use manual fallback");
        }
        return;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error("MediaPipe Hands did not initialize within 10 seconds. Please check your internet connection and try again.");
  } catch (error) {
    console.error("MediaPipe loading error:", error);
    throw error;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────
const LiveDetectPage = () => {
  const { addHistory } = useApp();

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const handsRef      = useRef(null);
  const streamRef     = useRef(null);
  const loopRef       = useRef(false);
  const rafRef        = useRef(null);
  const lastLetterRef = useRef("");
  const holdCountRef  = useRef(0);
  const lastAddTime   = useRef(0);

  const [status, setStatus]         = useState("idle"); // idle | loading | active | error
  const [loadStep, setLoadStep]     = useState("");
  const [gestureText, setGestureText] = useState("—");
  const [meaningText, setMeaningText] = useState("Show your hand to the camera");
  const [word, setWord]             = useState("");
  const [pulse, setPulse]           = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [errorMsg, setErrorMsg]     = useState("");
  const [errorHint, setErrorHint]   = useState("");

  // ── letter builder ────────────────────────────────────────────────────────
  const tryAddLetter = useCallback((letter) => {
    if (!letter) { holdCountRef.current = 0; setConfidence(0); return; }
    if (letter === lastLetterRef.current) holdCountRef.current++;
    else { holdCountRef.current = 1; lastLetterRef.current = letter; }

    setConfidence(Math.min(100, (holdCountRef.current / 8) * 100));

    if (holdCountRef.current === 8 && Date.now() - lastAddTime.current > 800) {
      setWord(w => w + letter);
      lastAddTime.current = Date.now();
      setPulse(true);
      setTimeout(() => setPulse(false), 400);
    }
  }, []);

  // ── detection loop ────────────────────────────────────────────────────────
  const runLoop = useCallback(() => {
    if (!loopRef.current) {
      console.log("Loop stopped");
      return;
    }
    const video = videoRef.current;
    const hands = handsRef.current;
    if (video && hands && video.readyState >= 2) {
      hands.send({ image: video }).catch((err) => {
        console.error("Error sending frame to MediaPipe:", err);
      });
    } else {
      console.warn("Video or hands not ready:", { 
        hasVideo: !!video, 
        hasHands: !!hands, 
        readyState: video?.readyState 
      });
    }
    rafRef.current = requestAnimationFrame(() => setTimeout(runLoop, 33));
  }, []);

  // ── start ─────────────────────────────────────────────────────────────────
  const start = async () => {
    setStatus("loading");
    setErrorMsg("");
    setErrorHint("");

    try {
      // ── Step 1: Camera permission ─────────────────────────────────────────
      setLoadStep("Requesting camera access…");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(
          new Error("Your browser does not support camera access. Please use Chrome, Firefox, or Edge."),
          { userFacing: true }
        );
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        });
      } catch (err) {
        const map = {
          NotAllowedError:       "Camera permission was denied.\n→ Click the 🔒 lock in your address bar, set Camera to Allow, then refresh.",
          PermissionDeniedError: "Camera permission was denied.\n→ Click the 🔒 lock in your address bar, set Camera to Allow, then refresh.",
          NotFoundError:         "No camera found on this device.\n→ Plug in a webcam and try again.",
          DevicesNotFoundError:  "No camera found on this device.\n→ Plug in a webcam and try again.",
          NotReadableError:      "Camera is in use by another app (Zoom, Teams, OBS…).\n→ Close that app and try again.",
          TrackStartError:       "Camera is in use by another app.\n→ Close that app and try again.",
          OverconstrainedError:  "Camera doesn't support the requested settings. Trying again…",
        };
        throw Object.assign(
          new Error(map[err.name] ?? `Camera failed to start: ${err.message}`),
          { userFacing: true }
        );
      }

      streamRef.current = stream;

      // ── Step 2: Attach to video element ───────────────────────────────────
      setLoadStep("Starting video stream…");
      const video = videoRef.current;
      video.srcObject = stream;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video load timed out after 5 s.")), 5000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          video.play().then(resolve).catch(reject);
        };
      });

      // ── Step 3: Load MediaPipe ────────────────────────────────────────────
      setLoadStep("Downloading hand-tracking model… (this may take a moment)");
      try {
        await loadMediaPipe();
      } catch (mpError) {
        throw Object.assign(
          new Error("Failed to load hand detection model. Please check your internet connection and try again."),
          { userFacing: true }
        );
      }

      // ── Step 4: Init Hands ────────────────────────────────────────────────
      setLoadStep("Initialising detector…");
      const hands = new window.Hands({
        locateFile: (f) => `${CDN_PRIMARY}/hands@0.4.1646424915/${f}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.75,
        minTrackingConfidence:  0.75,
      });

      hands.onResults((results) => {
        console.log("onResults called", { 
          hasImage: !!results.image, 
          hasLandmarks: !!results.multiHandLandmarks?.length,
          landmarkCount: results.multiHandLandmarks?.length || 0
        });
        
        const canvas = canvasRef.current;
        const vid    = videoRef.current;
        if (!canvas || !vid) {
          console.warn("Canvas or video ref missing");
          return;
        }

        const ctx = canvas.getContext("2d");
        
        // Set canvas size to match video
        if (canvas.width !== vid.videoWidth || canvas.height !== vid.videoHeight) {
          canvas.width  = vid.videoWidth  || 640;
          canvas.height = vid.videoHeight || 480;
          console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame (mirrored for selfie effect)
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        
        // Draw the actual video frame
        if (results.image) {
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback: draw directly from video element
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        }
        
        ctx.restore();

        if (results.multiHandLandmarks?.length) {
          console.log(`✓ Drawing ${results.multiHandLandmarks.length} hand(s)`);
          
          for (const lm of results.multiHandLandmarks) {
            // Draw landmarks mirrored
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            
            // Check if MediaPipe drawing utilities are available
            const hasDrawingUtils = typeof window.drawConnectors === 'function' && 
                                   typeof window.drawLandmarks === 'function' &&
                                   typeof window.HAND_CONNECTIONS !== 'undefined';
            
            console.log("Drawing utilities available:", hasDrawingUtils);
            
            if (hasDrawingUtils) {
              // Use MediaPipe drawing utilities
              try {
                window.drawConnectors(ctx, lm, window.HAND_CONNECTIONS, { 
                  color: "#00f5ff", 
                  lineWidth: 2 
                });
                window.drawLandmarks(ctx, lm, { 
                  color: "#ff4fa3", 
                  lineWidth: 1, 
                  radius: 4 
                });
                console.log("✓ Drew using MediaPipe utilities");
              } catch (err) {
                console.error("Error using MediaPipe drawing utilities:", err);
                // Fall through to manual drawing
              }
            } else {
              // Manual fallback drawing
              console.log("Using manual fallback drawing");
              
              // Draw connections (hand skeleton)
              ctx.strokeStyle = "#00f5ff";
              ctx.lineWidth = 2;
              
              // Hand connection indices (MediaPipe hand model)
              const connections = [
                [0,1],[1,2],[2,3],[3,4],        // Thumb
                [0,5],[5,6],[6,7],[7,8],        // Index
                [0,9],[9,10],[10,11],[11,12],   // Middle
                [0,13],[13,14],[14,15],[15,16], // Ring
                [0,17],[17,18],[18,19],[19,20], // Pinky
                [5,9],[9,13],[13,17]            // Palm
              ];
              
              connections.forEach(([a, b]) => {
                if (lm[a] && lm[b]) {
                  ctx.beginPath();
                  ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height);
                  ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height);
                  ctx.stroke();
                }
              });
              
              // Draw landmark points
              ctx.fillStyle = "#ff4fa3";
              lm.forEach((point, idx) => {
                if (point) {
                  ctx.beginPath();
                  ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI);
                  ctx.fill();
                }
              });
              
              console.log("✓ Drew using manual fallback");
            }
            
            ctx.restore();

            // Detect gesture
            const letter = detectGesture(lm);
            console.log(`Detected gesture: ${letter || 'none'}`);
            setGestureText(letter || "—");
            setMeaningText(letter ? (MEANINGS[letter] ?? `Letter ${letter}`) : "Detecting…");
            tryAddLetter(letter);
          }
        } else {
          console.log("No hands detected in frame");
          setGestureText("—");
          setMeaningText("Show your hand to the camera");
          setConfidence(0);
          holdCountRef.current = 0;
        }
      });

      handsRef.current = hands;
      loopRef.current  = true;
      setStatus("active");
      setLoadStep("");
      
      // Test: Draw something on canvas to verify it's working
      const testCanvas = canvasRef.current;
      if (testCanvas) {
        const testCtx = testCanvas.getContext("2d");
        testCanvas.width = 640;
        testCanvas.height = 480;
        testCtx.fillStyle = "rgba(0, 245, 255, 0.3)";
        testCtx.fillRect(10, 10, 100, 50);
        testCtx.fillStyle = "#00f5ff";
        testCtx.font = "20px Arial";
        testCtx.fillText("Camera Active", 20, 40);
        console.log("✓ Canvas test draw successful");
      }
      
      runLoop();

    } catch (err) {
      // Cleanup any partial stream
      loopRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;

      setStatus("error");
      if (err.userFacing) {
        setErrorMsg(err.message);
        setErrorHint("");
      } else {
        setErrorMsg("Something went wrong. See details below.");
        setErrorHint(err.message);
      }
    }
  };

  // ── stop ──────────────────────────────────────────────────────────────────
  const stop = () => {
    if (word) addHistory({ type: "detection", original: word, corrected: null });

    loopRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    handsRef.current?.close();
    handsRef.current = null;

    setStatus("idle");
    setGestureText("—");
    setMeaningText("Show your hand to the camera");
    setConfidence(0);
    holdCountRef.current  = 0;
    lastLetterRef.current = "";
  };

  // ── cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    loopRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    handsRef.current?.close();
  }, []);

  const isActive  = status === "active";
  const isLoading = status === "loading";
  const isError   = status === "error";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne+Mono&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ld-root {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: #060a12;
          font-family: 'DM Sans', sans-serif;
          padding: 20px; position: relative; overflow: hidden;
        }
        .ld-root::before {
          content: ''; position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
          pointer-events: none;
        }
        @keyframes gridMove { to { transform: translate(50px, 50px); } }

        .ld-container {
          display: flex; gap: 24px;
          max-width: 1400px; width: 100%;
          position: relative; z-index: 1;
        }
        @media (max-width: 1024px) { .ld-container { flex-direction: column; } }

        /* Video */
        .ld-video-section { flex: 1; display: flex; flex-direction: column; gap: 20px; }

        .ld-video-wrap {
          position: relative; border-radius: 20px; overflow: hidden;
          background: #0a0f1a;
          border: 2px solid rgba(0,245,255,0.2);
          box-shadow: 0 0 40px rgba(0,245,255,0.15);
        }
        .ld-video-inner { position: relative; padding-bottom: 75%; background: #060a12; }

        .ld-video-inner video,
        .ld-video-inner canvas {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%; object-fit: cover;
        }
        .ld-video-inner video  { z-index: 1; }
        .ld-video-inner canvas { z-index: 2; background: transparent; }

        .ld-placeholder {
          position: absolute; inset: 0; z-index: 3;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
          color: rgba(0,245,255,0.3);
          font-family: 'Syne Mono', monospace;
          font-size: 12px; letter-spacing: 2px;
        }
        .ld-placeholder-icon { font-size: 48px; opacity: 0.35; }
        .ld-placeholder-icon.anim { animation: iconPulse 1.4s ease-in-out infinite; }
        @keyframes iconPulse { 0%,100%{opacity:.2} 50%{opacity:.6} }
        .ld-placeholder-step { font-size: 11px; color: rgba(0,245,255,0.5); margin-top: 4px; text-align: center; padding: 0 20px; }

        .ld-badge {
          position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
          background: rgba(6,10,18,0.85);
          border: 1px solid rgba(0,245,255,0.3); border-radius: 100px;
          padding: 6px 18px; font-size: 11px; font-weight: 600; color: #00f5ff;
          z-index: 5; display: flex; align-items: center; gap: 8px;
          font-family: 'Syne Mono', monospace; letter-spacing: 1px; white-space: nowrap;
        }
        .ld-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .ld-dot.on      { background: #4ade80; animation: blink 2s ease-in-out infinite; }
        .ld-dot.off     { background: #ef4444; }
        .ld-dot.loading { background: #f59e0b; animation: blink 0.8s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

        .ld-conf-track { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.08); z-index: 4; }
        .ld-conf-fill  { height: 100%; background: linear-gradient(90deg, #00f5ff, #ff4fa3); transition: width 0.1s linear; border-radius: 0 2px 2px 0; }

        /* Panel */
        .ld-panel { width: 380px; display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 1024px) { .ld-panel { width: 100%; } }

        .ld-card {
          background: rgba(10,15,26,0.85);
          border: 1px solid rgba(0,245,255,0.15);
          border-radius: 16px; padding: 20px;
          backdrop-filter: blur(10px);
        }
        .ld-card-title {
          font-size: 10px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: rgba(0,245,255,0.55);
          margin-bottom: 14px; font-family: 'Syne Mono', monospace;
        }

        .ld-gesture-display { text-align: center; padding: 12px 0; }
        .ld-gesture-letter {
          font-size: 80px; font-weight: 800; font-family: 'Syne', sans-serif;
          background: linear-gradient(135deg, #00f5ff, #ff4fa3);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1; margin-bottom: 10px; display: block;
        }
        .ld-gesture-letter.pop { animation: letterPop 0.35s cubic-bezier(.36,.07,.19,.97); }
        @keyframes letterPop { 0%,100%{transform:scale(1)} 40%{transform:scale(1.25)} }
        .ld-gesture-meaning { font-size: 13px; color: rgba(255,255,255,0.45); min-height: 20px; }

        .ld-word-display {
          background: rgba(0,245,255,0.05); border: 1px solid rgba(0,245,255,0.2);
          border-radius: 12px; padding: 14px 16px; min-height: 58px;
          font-size: 26px; font-weight: 700; font-family: 'Syne', sans-serif;
          color: #00f5ff; word-break: break-all; text-align: center;
          display: flex; align-items: center; justify-content: center; letter-spacing: 4px;
        }
        .ld-word-ph { font-size: 11px; letter-spacing: 2px; color: rgba(0,245,255,0.3); font-family: 'Syne Mono', monospace; }

        .ld-btn-row { display: flex; gap: 8px; margin-top: 12px; }
        .ld-btn {
          flex: 1; padding: 9px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6);
          font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .ld-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .ld-btn-clear { border-color: rgba(239,68,68,0.3); color: #ef4444; }
        .ld-btn-clear:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.5); }
        .ld-btn-space { border-color: rgba(0,245,255,0.2); color: rgba(0,245,255,0.7); }
        .ld-btn-space:hover { background: rgba(0,245,255,0.1); color: #00f5ff; }

        .ld-main-btn {
          width: 100%; padding: 15px; border-radius: 12px; border: none;
          font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.25s;
          font-family: 'Syne', sans-serif;
          display: flex; align-items: center; justify-content: center;
          gap: 10px; letter-spacing: 1px;
        }
        .ld-main-btn.start { background: linear-gradient(135deg, #00f5ff, #00b8d4); color: #060a12; box-shadow: 0 4px 24px rgba(0,245,255,0.35); }
        .ld-main-btn.start:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,245,255,0.5); }
        .ld-main-btn.stop  { background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; box-shadow: 0 4px 24px rgba(239,68,68,0.35); }
        .ld-main-btn.stop:hover  { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(239,68,68,0.5); }
        .ld-main-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; }

        .ld-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(6,10,18,0.3); border-top-color: #060a12; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ld-error-box { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.35); border-radius: 12px; padding: 16px; margin-bottom: 14px; }
        .ld-error-title { font-weight: 700; font-size: 13px; color: #fca5a5; margin-bottom: 6px; }
        .ld-error-body  { font-size: 13px; color: #fca5a5; line-height: 1.7; white-space: pre-line; }
        .ld-error-hint  { font-size: 11px; color: rgba(252,165,165,0.55); margin-top: 8px; font-family: 'Syne Mono', monospace; }
        .ld-dismiss { margin-top: 10px; background: none; border: 1px solid rgba(239,68,68,0.3); border-radius: 7px; color: #fca5a5; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .ld-dismiss:hover { background: rgba(239,68,68,0.15); }

        .ld-help {
          background: rgba(0,245,255,0.03); border: 1px solid rgba(0,245,255,0.1);
          border-radius: 12px; padding: 16px;
          font-size: 11px; color: rgba(255,255,255,0.35);
          line-height: 2; font-family: 'Syne Mono', monospace;
        }
        .ld-help b { color: rgba(0,245,255,0.55); }
      `}</style>

      <div className="ld-root">
        <div className="ld-container">

          {/* ── Video ── */}
          <div className="ld-video-section">
            <div className="ld-video-wrap">
              <div className="ld-video-inner">
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} />

                {!isActive && (
                  <div className="ld-placeholder">
                    <div className={`ld-placeholder-icon ${isLoading ? "anim" : ""}`}>
                      {isLoading ? "⏳" : isError ? "⚠️" : "📷"}
                    </div>
                    <div>{isLoading ? "LOADING" : isError ? "CAMERA ERROR" : "CAMERA INACTIVE"}</div>
                    {isLoading && <div className="ld-placeholder-step">{loadStep}</div>}
                  </div>
                )}

                <div className="ld-badge">
                  <span className={`ld-dot ${isActive ? "on" : isLoading ? "loading" : "off"}`} />
                  {isLoading ? "LOADING…" : isActive ? "CAMERA ACTIVE" : "CAMERA INACTIVE"}
                </div>

                <div className="ld-conf-track">
                  <div className="ld-conf-fill" style={{ width: `${confidence}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Panel ── */}
          <div className="ld-panel">

            <div className="ld-card">
              <div className="ld-card-title">Detected Gesture</div>
              <div className="ld-gesture-display">
                <span className={`ld-gesture-letter ${pulse ? "pop" : ""}`}>{gestureText}</span>
                <div className="ld-gesture-meaning">{meaningText}</div>
              </div>
            </div>

            <div className="ld-card">
              <div className="ld-card-title">Generated Word</div>
              <div className="ld-word-display">
                {word ? word : <span className="ld-word-ph">START SIGNING</span>}
              </div>
              <div className="ld-btn-row">
                <button className="ld-btn ld-btn-space" onClick={() => setWord(w => w + " ")}>␣ Space</button>
                <button className="ld-btn" onClick={() => setWord(w => w.slice(0, -1))}>⌫ Delete</button>
                <button className="ld-btn ld-btn-clear" onClick={() => {
                  if (word) addHistory({ type: "detection", original: word, corrected: null });
                  setWord(""); lastLetterRef.current = ""; holdCountRef.current = 0;
                }}>✕ Clear</button>
              </div>
            </div>

            <div className="ld-card">
              {isError && (
                <div className="ld-error-box">
                  <div className="ld-error-title">⚠ Camera Error</div>
                  <div className="ld-error-body">{errorMsg}</div>
                  {errorHint && <div className="ld-error-hint">Details: {errorHint}</div>}
                  <button className="ld-dismiss" onClick={() => setStatus("idle")}>Dismiss</button>
                </div>
              )}

              {!isActive
                ? <button className="ld-main-btn start" onClick={start} disabled={isLoading}>
                    {isLoading
                      ? <><div className="ld-spinner" />{loadStep || "Loading…"}</>
                      : "▶  Start Detection"}
                  </button>
                : <button className="ld-main-btn stop" onClick={stop}>⏹  Stop Detection</button>
              }
            </div>

            <div className="ld-help">
              <b>Camera not working?</b><br />
              1. Click 🔒 in address bar → Camera → <b>Allow</b><br />
              2. Refresh the page and try again<br />
              3. Close any app using your camera (Zoom, Teams…)<br /><br />
              <b>Supported ASL signs:</b><br />
              A-Z (All 26 letters of American Sign Language)<br />
              Hold each sign still — the bar fills as confidence builds.
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default LiveDetectPage;