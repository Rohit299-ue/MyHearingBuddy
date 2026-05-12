import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, BookOpen, Target,
  RotateCcw, Trophy, Zap, Clock, CheckCircle,
  XCircle, BarChart2, Hand, Star, ArrowRight,
  Volume2, Eye, Grid, List
} from "lucide-react";

/* ─────────────────────────────────────────
   ASL hand-sign images from public CDN
   Using Wikimedia ASL fingerspelling images
───────────────────────────────────────── */
const ASL_IMAGES = {
  A: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Sign_language_A.svg/120px-Sign_language_A.svg.png",
  B: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Sign_language_B.svg/120px-Sign_language_B.svg.png",
  C: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Sign_language_C.svg/120px-Sign_language_C.svg.png",
  D: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sign_language_D.svg/120px-Sign_language_D.svg.png",
  E: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Sign_language_E.svg/120px-Sign_language_E.svg.png",
  F: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Sign_language_F.svg/120px-Sign_language_F.svg.png",
  G: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Sign_language_G.svg/120px-Sign_language_G.svg.png",
  H: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Sign_language_H.svg/120px-Sign_language_H.svg.png",
  I: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Sign_language_I.svg/120px-Sign_language_I.svg.png",
  J: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Sign_language_J.svg/120px-Sign_language_J.svg.png",
  K: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Sign_language_K.svg/120px-Sign_language_K.svg.png",
  L: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Sign_language_L.svg/120px-Sign_language_L.svg.png",
  M: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Sign_language_M.svg/120px-Sign_language_M.svg.png",
  N: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Sign_language_N.svg/120px-Sign_language_N.svg.png",
  O: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Sign_language_O.svg/120px-Sign_language_O.svg.png",
  P: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Sign_language_P.svg/120px-Sign_language_P.svg.png",
  Q: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Sign_language_Q.svg/120px-Sign_language_Q.svg.png",
  R: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Sign_language_R.svg/120px-Sign_language_R.svg.png",
  S: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Sign_language_S.svg/120px-Sign_language_S.svg.png",
  T: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Sign_language_T.svg/120px-Sign_language_T.svg.png",
  U: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Sign_language_U.svg/120px-Sign_language_U.svg.png",
  V: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Sign_language_V.svg/120px-Sign_language_V.svg.png",
  W: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Sign_language_W.svg/120px-Sign_language_W.svg.png",
  X: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Sign_language_X.svg/120px-Sign_language_X.svg.png",
  Y: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Sign_language_Y.svg/120px-Sign_language_Y.svg.png",
  Z: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Sign_language_Z.svg/120px-Sign_language_Z.svg.png",
};

/* Fallback emoji per letter for when image fails */
const HAND_EMOJIS = {
 A:"✊", B:"🖐", C:"🤏", D:"☝️", E:"✊",
F:"👌", G:"👉", H:"✌️", I:"🤙", J:"🤙",
K:"✌️", L:"🤟", M:"✊", N:"✊", O:"👌",
P:"👇", Q:"👇", R:"🤞", S:"✊", T:"✊",
U:"✌️", V:"✌️", W:"🖖", X:"☝️",
Y:"🤙", Z:"✍️",
};

const LETTER_TIPS = {
  A:"Close all fingers into a fist with thumb resting on side.",
  B:"Hold all four fingers straight up, thumb folded across palm.",
  C:"Curve hand into a C-shape with fingers together.",
  D:"Index finger points up, other fingers and thumb form an O.",
  E:"Curl all fingers downward, thumb tucked under fingers.",
  F:"Touch index finger to thumb, other three fingers spread up.",
  G:"Point index finger sideways, thumb parallel pointing out.",
  H:"Point index and middle fingers sideways together.",
  I:"Raise only the pinky finger, others curled into fist.",
  J:"Make I handshape then trace a J in the air.",
  K:"Index and middle fingers up in V, thumb between them.",
  L:"Make an L-shape with index finger up and thumb out.",
  M:"Three fingers folded over the thumb.",
  N:"Two fingers folded over the thumb.",
  O:"All fingers and thumb curved to meet, forming an O.",
  P:"Like K but pointing downward.",
  Q:"Like G but pointing downward.",
  R:"Cross index and middle fingers together.",
  S:"Make a fist with thumb wrapped over the fingers.",
  T:"Thumb tucked between index and middle fingers.",
  U:"Index and middle fingers up together, others curled.",
  V:"Index and middle fingers spread in a V, others curled.",
  W:"Index, middle, and ring fingers spread in a W shape.",
  X:"Hook the index finger into a bent shape.",
  Y:"Extend thumb and pinky, curl other fingers.",
  Z:"Trace a Z in the air with your index finger.",
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const generateQuestion = () => {
  const correct = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  const opts = [correct];
  while (opts.length < 4) {
    const r = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!opts.includes(r)) opts.push(r);
  }
  return { correct, options: opts.sort(() => Math.random() - 0.5) };
};

/* ─── TIMER HOOK ─── */
const useTimer = (running) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const reset = () => setSeconds(0);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return { seconds, fmt: fmt(seconds), reset };
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
const PracticePage = () => {
  const navigate = useNavigate();

  /* ── Learn state ── */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState("card"); // card | grid
  const [visited, setVisited] = useState(new Set([0]));
  const [imgError, setImgError] = useState({});
  const [showTip, setShowTip] = useState(false);
  const [slideDir, setSlideDir] = useState("right");

  /* ── Quiz state ── */
  const [mode, setMode] = useState("learn");
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(generateQuestion);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [quizHistory, setQuizHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const TOTAL_Q = 10;

  const timer = useTimer(quizStarted && !quizDone);

  /* ── Keyboard nav for learn mode ── */
  useEffect(() => {
    const handler = (e) => {
      if (mode !== "learn") return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, currentIndex]);

  const handleNext = () => {
    if (currentIndex < ALPHABET.length - 1) {
      setSlideDir("right");
      setCurrentIndex(i => {
        const ni = i + 1;
        setVisited(v => new Set([...v, ni]));
        return ni;
      });
      setShowTip(false);
      setImgError({});
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSlideDir("left");
      setCurrentIndex(i => i - 1);
      setShowTip(false);
      setImgError({});
    }
  };

  const jumpTo = (i) => {
    setSlideDir(i > currentIndex ? "right" : "left");
    setCurrentIndex(i);
    setVisited(v => new Set([...v, i]));
    setShowTip(false);
    setImgError({});
    setViewMode("card");
  };

  /* ── Quiz handlers ── */
  const startQuiz = () => {
    setQuizStarted(true);
    setQuizDone(false);
    setScore(0);
    setQuestionNumber(1);
    setAnswered(false);
    setSelectedAnswer(null);
    setCurrentQuestion(generateQuestion());
    setQuizHistory([]);
    setStreak(0);
    setBestStreak(0);
    timer.reset();
  };

  const handleAnswer = (answer) => {
    if (answered) return;
    const correct = answer === currentQuestion.correct;
    setSelectedAnswer(answer);
    setAnswered(true);
    if (correct) {
      setScore(s => s + 1);
      setStreak(s => {
        const ns = s + 1;
        setBestStreak(b => Math.max(b, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }
    setQuizHistory(h => [...h, { q: currentQuestion.correct, selected: answer, correct }]);
  };

  const nextQuestion = () => {
    if (questionNumber < TOTAL_Q) {
      setQuestionNumber(q => q + 1);
      setAnswered(false);
      setSelectedAnswer(null);
      setCurrentQuestion(generateQuestion());
    } else {
      setQuizDone(true);
      setQuizStarted(false);
    }
  };

  const letter = ALPHABET[currentIndex];
  const learnProgress = ((visited.size) / ALPHABET.length) * 100;
  const quizProgress = (questionNumber / TOTAL_Q) * 100;
  const pct = Math.round((score / TOTAL_Q) * 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pp-shell {
          display: flex;
          min-height: 100vh;
          background: #f5f4f0;
          font-family: 'Outfit', sans-serif;
          color: #1a1917;
        }

        /* ── SIDEBAR ── */
        .pp-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: #fff;
          border-right: 1px solid #e8e6e0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        .pp-sb-logo {
          padding: 22px 20px 18px;
          border-bottom: 1px solid #e8e6e0;
          display: flex; align-items: center; gap: 11px;
        }
        .pp-sb-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #059669, #34d399);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pp-sb-name { font-size: 15px; font-weight: 800; color: #1a1917; }
        .pp-sb-sub { font-size: 10px; color: #a09d96; font-family: 'Space Mono', monospace; }

        .pp-sb-section {
          padding: 18px 20px 7px;
          font-size: 10px; font-weight: 700;
          color: #c5c2b8; letter-spacing: 1.5px;
          text-transform: uppercase; font-family: 'Space Mono', monospace;
        }

        .pp-sb-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; margin: 1px 10px;
          border-radius: 9px; cursor: pointer;
          font-size: 13px; font-weight: 600; color: #6b6860;
          transition: all 0.15s; border: none; background: transparent;
          text-align: left; width: calc(100% - 20px);
        }
        .pp-sb-item:hover { background: #f5f4f0; color: #1a1917; }
        .pp-sb-item.active-learn { background: #ecfdf5; color: #059669; }
        .pp-sb-item.active-quiz  { background: #f5f3ff; color: #7c3aed; }

        .pp-sb-divider { height: 1px; background: #e8e6e0; margin: 12px 16px; }

        .pp-sb-stats {
          margin: 8px 14px;
          background: #f5f4f0;
          border-radius: 10px;
          padding: 14px;
        }
        .pp-sb-stats-title {
          font-size: 10px; font-weight: 700; color: #c5c2b8;
          letter-spacing: 1px; text-transform: uppercase;
          font-family: 'Space Mono', monospace; margin-bottom: 10px;
        }
        .pp-sb-stat {
          display: flex; justify-content: space-between;
          align-items: center; padding: 4px 0;
        }
        .pp-sb-stat-label { font-size: 12px; color: #6b6860; }
        .pp-sb-stat-val { font-size: 13px; font-weight: 700; color: #1a1917; font-family: 'Space Mono', monospace; }

        .pp-sb-back {
          margin: auto 14px 18px;
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 9px;
          border: 1px solid #e8e6e0; background: #fff;
          font-size: 12px; font-weight: 600; color: #6b6860;
          cursor: pointer; transition: all 0.15s;
        }
        .pp-sb-back:hover { background: #f5f4f0; color: #1a1917; }

        /* ── MAIN ── */
        .pp-main {
          flex: 1; display: flex; flex-direction: column; min-width: 0;
        }

        /* ── TOPBAR ── */
        .pp-topbar {
          background: #fff;
          border-bottom: 1px solid #e8e6e0;
          padding: 0 32px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10; flex-shrink: 0;
        }
        .pp-topbar-left { display: flex; align-items: center; gap: 14px; }
        .pp-topbar-title {
          font-size: 18px; font-weight: 800; color: #1a1917;
          display: flex; align-items: center; gap: 10px;
        }
        .pp-mode-badge {
          font-size: 11px; font-weight: 600;
          padding: 4px 12px; border-radius: 20px;
          font-family: 'Space Mono', monospace;
        }
        .pp-mode-badge.learn { background: #ecfdf5; color: #059669; }
        .pp-mode-badge.quiz  { background: #f5f3ff; color: #7c3aed; }

        .pp-topbar-right { display: flex; align-items: center; gap: 10px; }
        .pp-kbd-hint {
          font-size: 11px; color: #c5c2b8;
          font-family: 'Space Mono', monospace;
          display: flex; align-items: center; gap: 5px;
        }
        .pp-kbd {
          border: 1px solid #e8e6e0; border-radius: 4px;
          padding: 1px 6px; font-size: 10px; color: #a09d96;
          background: #f5f4f0;
        }

        .pp-topbar-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px;
          border: 1px solid #e8e6e0; background: #fff;
          font-size: 12px; font-weight: 600; color: #6b6860;
          cursor: pointer; font-family: 'Outfit', sans-serif;
          transition: all 0.15s;
        }
        .pp-topbar-btn:hover { background: #f5f4f0; }

        /* ── CONTENT ── */
        .pp-content {
          flex: 1; padding: 28px 32px;
          overflow-y: auto;
        }

        /* ── CARD ── */
        .pp-card {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 16px;
          padding: 24px;
        }
        .pp-card-title {
          font-size: 14px; font-weight: 700; color: #1a1917; margin-bottom: 3px;
        }
        .pp-card-sub {
          font-size: 11px; color: #c5c2b8;
          font-family: 'Space Mono', monospace; margin-bottom: 18px;
        }

        /* ── LEARN LAYOUT ── */
        .pp-learn-layout {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 20px;
          align-items: start;
        }

        /* ── LETTER CARD ── */
        .pp-letter-card {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 20px;
          overflow: hidden;
        }
        .pp-letter-card-header {
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          padding: 28px;
          text-align: center;
          border-bottom: 1px solid #e8e6e0;
          position: relative;
        }
        .pp-letter-big {
          font-size: 120px; font-weight: 900; line-height: 1;
          color: #059669;
          filter: drop-shadow(0 4px 16px rgba(5,150,105,0.15));
          display: block; margin-bottom: 8px;
          transition: all 0.2s ease;
        }
        .pp-letter-counter {
          font-size: 11px; color: #6ee7b7;
          font-family: 'Space Mono', monospace;
          letter-spacing: 2px;
        }
        .pp-letter-nav-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          pointer-events: none;
        }
        .pp-letter-nav-btn {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1.5px solid rgba(5,150,105,0.2);
          background: rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s;
          pointer-events: all; color: #059669;
          backdrop-filter: blur(4px);
        }
        .pp-letter-nav-btn:hover:not(:disabled) {
          background: #fff; border-color: #059669;
          box-shadow: 0 4px 12px rgba(5,150,105,0.15);
        }
        .pp-letter-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .pp-hand-area {
          padding: 20px;
          text-align: center;
        }
        .pp-hand-img {
          width: 160px; height: 160px;
          object-fit: contain;
          margin: 0 auto 12px;
          display: block;
          border-radius: 12px;
        }
        .pp-hand-emoji {
          font-size: 100px; line-height: 1;
          margin-bottom: 12px; display: block;
        }
        .pp-hand-label {
          font-size: 12px; font-weight: 600; color: #a09d96;
          margin-bottom: 16px;
          font-family: 'Space Mono', monospace;
        }

        .pp-tip-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 12px; color: #166534;
          line-height: 1.5;
          text-align: left;
          margin-top: 4px;
        }
        .pp-tip-toggle {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: #059669;
          cursor: pointer; background: none; border: none;
          padding: 4px 0; margin-bottom: 8px;
          transition: color 0.15s;
        }
        .pp-tip-toggle:hover { color: #047857; }

        .pp-nav-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid #e8e6e0;
        }
        .pp-nav-btn {
          padding: 12px 16px; border-radius: 10px;
          font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          border: 1.5px solid transparent;
        }
        .pp-nav-btn.prev {
          background: #f5f4f0; color: #6b6860;
          border-color: #e8e6e0;
        }
        .pp-nav-btn.prev:hover:not(:disabled) { background: #eceae4; color: #1a1917; }
        .pp-nav-btn.next-learn {
          background: linear-gradient(135deg, #059669, #10b981);
          color: #fff;
          box-shadow: 0 4px 14px rgba(5,150,105,0.25);
        }
        .pp-nav-btn.next-learn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(5,150,105,0.35); transform: translateY(-1px); }
        .pp-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none !important; }

        /* ── RIGHT PANEL ── */
        .pp-right-panel {
          display: flex; flex-direction: column; gap: 16px;
        }

        /* ── PROGRESS CARD ── */
        .pp-progress-card {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 16px;
          padding: 20px;
        }
        .pp-progress-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 14px;
        }
        .pp-progress-title { font-size: 14px; font-weight: 700; color: #1a1917; }
        .pp-progress-pct {
          font-size: 20px; font-weight: 800; color: #059669;
          font-family: 'Space Mono', monospace;
        }
        .pp-bar-bg {
          height: 8px; border-radius: 100px;
          background: #f0fdf4; overflow: hidden; margin-bottom: 14px;
        }
        .pp-bar-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, #059669, #34d399);
          transition: width 0.4s ease;
        }
        .pp-bar-fill.quiz-bar {
          background: linear-gradient(90deg, #7c3aed, #a78bfa);
        }
        .pp-progress-stats {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
        }
        .pp-progress-stat {
          background: #f5f4f0; border-radius: 10px; padding: 10px 12px;
        }
        .pp-ps-val { font-size: 18px; font-weight: 800; color: #1a1917; }
        .pp-ps-lbl { font-size: 10px; color: #a09d96; margin-top: 2px; }

        /* ── ALPHABET GRID ── */
        .pp-alpha-grid {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 16px;
          padding: 20px;
        }
        .pp-alpha-grid-title {
          font-size: 13px; font-weight: 700; color: #1a1917;
          margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
        }
        .pp-alpha-letters {
          display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px;
        }
        .pp-alpha-cell {
          aspect-ratio: 1;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          border: 1.5px solid transparent;
          color: #c5c2b8;
          background: #f5f4f0;
        }
        .pp-alpha-cell.visited { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
        .pp-alpha-cell.current { background: #059669; color: #fff; border-color: #059669; box-shadow: 0 2px 8px rgba(5,150,105,0.3); }
        .pp-alpha-cell:hover:not(.current) { background: #ecfdf5; color: #059669; }

        /* ── FULL GRID VIEW ── */
        .pp-full-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 14px;
        }
        .pp-grid-cell {
          background: #fff;
          border: 1.5px solid #e8e6e0;
          border-radius: 14px;
          padding: 16px 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pp-grid-cell:hover { border-color: #a7f3d0; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(5,150,105,0.1); }
        .pp-grid-cell.current-cell { border-color: #059669; background: #ecfdf5; }
        .pp-grid-cell-emoji { font-size: 28px; margin-bottom: 6px; display: block; }
        .pp-grid-cell-letter { font-size: 20px; font-weight: 900; color: #1a1917; }
        .pp-grid-cell-status { font-size: 10px; color: #a09d96; margin-top: 3px; font-family: 'Space Mono', monospace; }
        .pp-grid-cell.visited-cell .pp-grid-cell-letter { color: #059669; }

        /* ── QUIZ LAYOUT ── */
        .pp-quiz-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        /* ── QUIZ START ── */
        .pp-quiz-start {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 20px;
          padding: 48px 40px;
          text-align: center;
        }
        .pp-quiz-start-icon { font-size: 64px; margin-bottom: 20px; display: block; }
        .pp-quiz-start-title { font-size: 28px; font-weight: 900; color: #1a1917; margin-bottom: 10px; }
        .pp-quiz-start-desc { font-size: 14px; color: #6b6860; line-height: 1.7; margin-bottom: 28px; }
        .pp-quiz-rules {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          margin-bottom: 28px; text-align: left;
        }
        .pp-quiz-rule {
          background: #f5f3ff;
          border: 1px solid #ede9fe;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: #5b21b6; font-weight: 600;
        }
        .pp-start-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: #fff; border: none; cursor: pointer;
          padding: 15px 40px; border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px; font-weight: 800;
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          transition: all 0.2s;
        }
        .pp-start-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(124,58,237,0.4); }

        /* ── QUIZ ACTIVE ── */
        .pp-quiz-card {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 20px;
          padding: 28px;
        }
        .pp-quiz-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 22px;
        }
        .pp-q-num {
          font-size: 12px; color: #a09d96;
          font-family: 'Space Mono', monospace;
          letter-spacing: 1px;
        }
        .pp-score-badge {
          display: flex; align-items: center; gap: 6px;
          background: #ecfdf5; border: 1px solid #a7f3d0;
          border-radius: 20px; padding: 5px 14px;
          font-size: 14px; font-weight: 800; color: #059669;
        }
        .pp-question-area {
          text-align: center; margin-bottom: 24px;
        }
        .pp-q-hand-img {
          width: 140px; height: 140px; object-fit: contain;
          margin: 0 auto 12px; display: block;
          border-radius: 16px;
          background: #f5f4f0; padding: 10px;
        }
        .pp-q-hand-emoji { font-size: 90px; display: block; margin-bottom: 10px; }
        .pp-q-text { font-size: 16px; font-weight: 700; color: #6b6860; }
        .pp-q-label { font-size: 11px; color: #c5c2b8; font-family: 'Space Mono', monospace; margin-top: 4px; }

        .pp-options {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          margin-bottom: 16px;
        }
        .pp-option {
          padding: 20px 12px;
          border-radius: 14px;
          border: 1.5px solid #e8e6e0;
          background: #f5f4f0;
          font-family: 'Outfit', sans-serif;
          font-size: 32px; font-weight: 900;
          color: #1a1917; cursor: pointer;
          transition: all 0.18s ease; text-align: center;
        }
        .pp-option:hover:not(:disabled) {
          border-color: #c4b5fd; background: #f5f3ff; color: #7c3aed;
          transform: translateY(-2px);
        }
        .pp-option:disabled { cursor: not-allowed; }
        .pp-option.correct {
          background: #ecfdf5 !important; border-color: #34d399 !important;
          color: #059669 !important; box-shadow: 0 0 0 3px rgba(52,211,153,0.15);
        }
        .pp-option.wrong {
          background: #fef2f2 !important; border-color: #fca5a5 !important;
          color: #dc2626 !important;
        }
        .pp-option.dim { opacity: 0.3; }

        .pp-next-btn {
          width: 100%; padding: 14px;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: #fff; cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 800;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(124,58,237,0.25);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .pp-next-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.35); }

        /* ── QUIZ SIDEBAR ── */
        .pp-quiz-sidebar { display: flex; flex-direction: column; gap: 14px; }

        .pp-quiz-stat-card {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 14px;
          padding: 18px 20px;
        }
        .pp-quiz-stat-title { font-size: 11px; font-weight: 700; color: #c5c2b8; letter-spacing: 1px; text-transform: uppercase; font-family: 'Space Mono', monospace; margin-bottom: 12px; }
        .pp-quiz-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pp-qs { background: #f5f4f0; border-radius: 10px; padding: 10px 12px; }
        .pp-qs-val { font-size: 22px; font-weight: 900; }
        .pp-qs-lbl { font-size: 10px; color: #a09d96; font-family: 'Space Mono', monospace; margin-top: 2px; }

        .pp-history-list { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; }
        .pp-history-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 9px;
          font-size: 12px; font-weight: 600;
        }
        .pp-history-item.correct-h { background: #ecfdf5; color: #059669; }
        .pp-history-item.wrong-h { background: #fef2f2; color: #dc2626; }
        .pp-history-item-icon { width: 20px; flex-shrink: 0; text-align: center; }
        .pp-history-item-text { flex: 1; }

        /* ── QUIZ RESULT ── */
        .pp-result-card {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
        }
        .pp-result-emoji { font-size: 64px; display: block; margin-bottom: 16px; }
        .pp-result-title { font-size: 26px; font-weight: 900; color: #1a1917; margin-bottom: 4px; }
        .pp-result-sub { font-size: 14px; color: #6b6860; margin-bottom: 24px; }
        .pp-result-score-big {
          font-size: 72px; font-weight: 900; line-height: 1;
          color: #059669; margin-bottom: 24px;
        }
        .pp-result-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 28px;
        }
        .pp-result-stat {
          background: #f5f4f0; border-radius: 12px; padding: 14px;
        }
        .pp-rs-val { font-size: 22px; font-weight: 900; color: #1a1917; }
        .pp-rs-lbl { font-size: 11px; color: #a09d96; margin-top: 2px; }
        .pp-result-btns { display: flex; gap: 10px; justify-content: center; }
        .pp-retry-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: #fff; border: none; cursor: pointer;
          padding: 13px 28px; border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 800;
          box-shadow: 0 6px 20px rgba(124,58,237,0.25);
          transition: all 0.2s;
        }
        .pp-retry-btn:hover { transform: translateY(-1px); }
        .pp-learn-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #ecfdf5; border: 1.5px solid #a7f3d0;
          color: #059669; cursor: pointer;
          padding: 13px 28px; border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 800;
          transition: all 0.2s;
        }
        .pp-learn-btn:hover { background: #d1fae5; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .pp-learn-layout { grid-template-columns: 320px 1fr; }
          .pp-full-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 860px) {
          .pp-sidebar { display: none; }
          .pp-learn-layout { grid-template-columns: 1fr; }
          .pp-quiz-layout { grid-template-columns: 1fr; }
          .pp-full-grid { grid-template-columns: repeat(3, 1fr); }
          .pp-alpha-letters { grid-template-columns: repeat(7, 1fr); }
        }
      `}</style>

      <div className="pp-shell">

        {/* ── SIDEBAR ── */}
        <aside className="pp-sidebar">
          <div className="pp-sb-logo">
            <div className="pp-sb-logo-icon">
              <Hand size={18} color="#fff" />
            </div>
            <div>
              <div className="pp-sb-name">SignLearn</div>
              <div className="pp-sb-sub">ISL Practice</div>
            </div>
          </div>

          <div className="pp-sb-section">Mode</div>
          <button className={`pp-sb-item ${mode === "learn" ? "active-learn" : ""}`} onClick={() => setMode("learn")}>
            <BookOpen size={15} /> Learn Alphabet
          </button>
          <button className={`pp-sb-item ${mode === "quiz" ? "active-quiz" : ""}`} onClick={() => setMode("quiz")}>
            <Target size={15} /> Take Quiz
          </button>

          <div className="pp-sb-divider" />
          <div className="pp-sb-section">Learn View</div>
          <button className={`pp-sb-item ${viewMode === "card" ? "active-learn" : ""}`} onClick={() => setViewMode("card")}>
            <Eye size={15} /> Card View
          </button>
          <button className={`pp-sb-item ${viewMode === "grid" ? "active-learn" : ""}`} onClick={() => setViewMode("grid")}>
            <Grid size={15} /> Grid View
          </button>

          <div className="pp-sb-divider" />
          <div className="pp-sb-stats">
            <div className="pp-sb-stats-title">Progress</div>
            <div className="pp-sb-stat">
              <span className="pp-sb-stat-label">Letters seen</span>
              <span className="pp-sb-stat-val">{visited.size}/26</span>
            </div>
            <div className="pp-sb-stat">
              <span className="pp-sb-stat-label">Completion</span>
              <span className="pp-sb-stat-val">{Math.round(learnProgress)}%</span>
            </div>
            <div className="pp-sb-stat">
              <span className="pp-sb-stat-label">Current</span>
              <span className="pp-sb-stat-val">{letter}</span>
            </div>
          </div>

          <button className="pp-sb-back" onClick={() => navigate("/")}>
            <ChevronLeft size={14} /> Back to Home
          </button>
        </aside>

        {/* ── MAIN ── */}
        <div className="pp-main">

          {/* ── TOPBAR ── */}
          <div className="pp-topbar">
            <div className="pp-topbar-left">
              <button className="pp-topbar-btn" onClick={() => navigate("/")}>
                <ChevronLeft size={14} /> Home
              </button>
              <div className="pp-topbar-title">
                ISL Practice
                <span className={`pp-mode-badge ${mode}`}>
                  {mode === "learn" ? "Learn Mode" : "Quiz Mode"}
                </span>
              </div>
            </div>
            <div className="pp-topbar-right">
              {mode === "learn" && viewMode === "card" && (
                <span className="pp-kbd-hint">
                  <span className="pp-kbd">←</span>
                  <span className="pp-kbd">→</span>
                  navigate
                </span>
              )}
              <button
                className="pp-topbar-btn"
                onClick={() => setViewMode(v => v === "card" ? "grid" : "card")}
              >
                {viewMode === "card" ? <><Grid size={13} /> Grid View</> : <><Eye size={13} /> Card View</>}
              </button>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div className="pp-content">

            {/* ════════ LEARN MODE ════════ */}
            {mode === "learn" && viewMode === "card" && (
              <div className="pp-learn-layout">

                {/* Left: Letter card */}
                <div className="pp-letter-card">
                  <div className="pp-letter-card-header">
                    <div className="pp-letter-nav-overlay">
                      <button className="pp-letter-nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>
                        <ChevronLeft size={16} />
                      </button>
                      <button className="pp-letter-nav-btn" onClick={handleNext} disabled={currentIndex === ALPHABET.length - 1}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <span className="pp-letter-big">{letter}</span>
                    <div className="pp-letter-counter">
                      {String(currentIndex + 1).padStart(2, "0")} / {ALPHABET.length}
                    </div>
                  </div>

                  <div className="pp-hand-area">
                    {!imgError[letter] ? (
                      <img
                        key={letter}
                        src={ASL_IMAGES[letter]}
                        alt={`ASL sign for ${letter}`}
                        className="pp-hand-img"
                        onError={() => setImgError(e => ({ ...e, [letter]: true }))}
                      />
                    ) : (
                      <span className="pp-hand-emoji">{HAND_EMOJIS[letter]}</span>
                    )}
                    <div className="pp-hand-label">ASL Handshape · Letter {letter}</div>

                    <button className="pp-tip-toggle" onClick={() => setShowTip(t => !t)}>
                      <Eye size={13} />
                      {showTip ? "Hide tip" : "Show how-to tip"}
                    </button>
                    {showTip && (
                      <div className="pp-tip-box">
                        💡 {LETTER_TIPS[letter]}
                      </div>
                    )}
                  </div>

                  <div className="pp-nav-row">
                    <button className="pp-nav-btn prev" onClick={handlePrev} disabled={currentIndex === 0}>
                      <ChevronLeft size={15} /> Prev
                    </button>
                    <button className="pp-nav-btn next-learn" onClick={handleNext} disabled={currentIndex === ALPHABET.length - 1}>
                      Next <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                {/* Right panel */}
                <div className="pp-right-panel">

                  {/* Progress */}
                  <div className="pp-progress-card">
                    <div className="pp-progress-header">
                      <span className="pp-progress-title">Learning Progress</span>
                      <span className="pp-progress-pct">{Math.round(learnProgress)}%</span>
                    </div>
                    <div className="pp-bar-bg">
                      <div className="pp-bar-fill" style={{ width: `${learnProgress}%` }} />
                    </div>
                    <div className="pp-progress-stats">
                      <div className="pp-progress-stat">
                        <div className="pp-ps-val" style={{ color: "#059669" }}>{visited.size}</div>
                        <div className="pp-ps-lbl">Letters Seen</div>
                      </div>
                      <div className="pp-progress-stat">
                        <div className="pp-ps-val" style={{ color: "#7c3aed" }}>{26 - visited.size}</div>
                        <div className="pp-ps-lbl">Remaining</div>
                      </div>
                      <div className="pp-progress-stat">
                        <div className="pp-ps-val" style={{ color: "#ea580c" }}>{currentIndex + 1}</div>
                        <div className="pp-ps-lbl">Position</div>
                      </div>
                    </div>
                  </div>

                  {/* Alphabet mini-grid */}
                  <div className="pp-alpha-grid">
                    <div className="pp-alpha-grid-title">
                      <Grid size={14} color="#059669" />
                      All Letters
                    </div>
                    <div className="pp-alpha-letters">
                      {ALPHABET.map((l, i) => (
                        <div
                          key={l}
                          className={`pp-alpha-cell ${visited.has(i) && i !== currentIndex ? "visited" : ""} ${i === currentIndex ? "current" : ""}`}
                          onClick={() => jumpTo(i)}
                          title={l}
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick action */}
                  <div className="pp-card" style={{ textAlign: "center", padding: "20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1917", marginBottom: 6 }}>
                      Ready to test yourself?
                    </div>
                    <div style={{ fontSize: 12, color: "#a09d96", marginBottom: 14 }}>
                      You've seen {visited.size} letters
                    </div>
                    <button
                      className="pp-start-btn"
                      style={{ padding: "11px 24px", fontSize: 13 }}
                      onClick={() => { setMode("quiz"); startQuiz(); }}
                    >
                      <Target size={14} /> Take Quiz Now
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* ════════ GRID VIEW ════════ */}
            {mode === "learn" && viewMode === "grid" && (
              <>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1917" }}>All 26 ASL Signs</div>
                    <div style={{ fontSize: 12, color: "#a09d96", marginTop: 2 }}>Click any letter to study it in card view</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 12, background: "#ecfdf5", color: "#059669", padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
                      ✓ {visited.size} visited
                    </span>
                    <span style={{ fontSize: 12, background: "#f5f4f0", color: "#a09d96", padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
                      {26 - visited.size} remaining
                    </span>
                  </div>
                </div>
                <div className="pp-full-grid">
                  {ALPHABET.map((l, i) => (
                    <div
                      key={l}
                      className={`pp-grid-cell ${visited.has(i) ? "visited-cell" : ""} ${i === currentIndex ? "current-cell" : ""}`}
                      onClick={() => jumpTo(i)}
                    >
                      {!imgError[l] ? (
                        <img
                          src={ASL_IMAGES[l]}
                          alt={`ASL ${l}`}
                          style={{ width: 60, height: 60, objectFit: "contain", display: "block", margin: "0 auto 8px" }}
                          onError={() => setImgError(e => ({ ...e, [l]: true }))}
                        />
                      ) : (
                        <span className="pp-grid-cell-emoji">{HAND_EMOJIS[l]}</span>
                      )}
                      <div className="pp-grid-cell-letter">{l}</div>
                      <div className="pp-grid-cell-status">{visited.has(i) ? "✓ seen" : "not seen"}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ════════ QUIZ MODE ════════ */}
            {mode === "quiz" && (
              <>
                {!quizStarted && !quizDone && (
                  <div className="pp-quiz-start">
                    <span className="pp-quiz-start-icon">🎯</span>
                    <h2 className="pp-quiz-start-title">ISL Sign Quiz</h2>
                    <p className="pp-quiz-start-desc">
                      Test your ASL fingerspelling knowledge.<br />
                      {TOTAL_Q} questions · Multiple choice · Timed
                    </p>
                    <div className="pp-quiz-rules">
                      {[
                        { icon: <Target size={16} />, text: `${TOTAL_Q} Questions` },
                        { icon: <Clock size={16} />, text: "Timed Session" },
                        { icon: <Zap size={16} />, text: "Streak Bonus" },
                        { icon: <BarChart2 size={16} />, text: "Score Tracking" },
                      ].map((r, i) => (
                        <div key={i} className="pp-quiz-rule">
                          {r.icon} {r.text}
                        </div>
                      ))}
                    </div>
                    <button className="pp-start-btn" onClick={startQuiz}>
                      <ArrowRight size={16} /> Start Quiz
                    </button>
                  </div>
                )}

                {quizStarted && !quizDone && (
                  <div className="pp-quiz-layout">
                    {/* Main quiz card */}
                    <div>
                      <div className="pp-quiz-card">
                        <div className="pp-quiz-header">
                          <span className="pp-q-num">Question {questionNumber} of {TOTAL_Q}</span>
                          <span className="pp-score-badge">
                            <Star size={13} /> {score} pts
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="pp-bar-bg" style={{ marginBottom: 22 }}>
                          <div className="pp-bar-fill quiz-bar" style={{ width: `${quizProgress}%` }} />
                        </div>

                        <div className="pp-question-area">
                          {!imgError[currentQuestion.correct] ? (
                            <img
                              key={currentQuestion.correct}
                              src={ASL_IMAGES[currentQuestion.correct]}
                              alt="Identify this ASL sign"
                              className="pp-q-hand-img"
                              onError={() => setImgError(e => ({ ...e, [currentQuestion.correct]: true }))}
                            />
                          ) : (
                            <span className="pp-q-hand-emoji">{HAND_EMOJIS[currentQuestion.correct]}</span>
                          )}
                          <p className="pp-q-text">Which letter does this sign represent?</p>
                          <p className="pp-q-label">ASL Fingerspelling</p>
                        </div>

                        <div className="pp-options">
                          {currentQuestion.options.map((opt) => {
                            const isCorrect = opt === currentQuestion.correct;
                            const isSelected = opt === selectedAnswer;
                            let cls = "pp-option";
                            if (answered) {
                              if (isCorrect) cls += " correct";
                              else if (isSelected) cls += " wrong";
                              else cls += " dim";
                            }
                            return (
                              <button
                                key={opt}
                                className={cls}
                                onClick={() => handleAnswer(opt)}
                                disabled={answered}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {answered && (
                          <button className="pp-next-btn" onClick={nextQuestion}>
                            {questionNumber < TOTAL_Q ? <>Next Question <ChevronRight size={16} /></> : <>See Results <Trophy size={16} /></>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quiz sidebar */}
                    <div className="pp-quiz-sidebar">
                      <div className="pp-quiz-stat-card">
                        <div className="pp-quiz-stat-title">Live Stats</div>
                        <div className="pp-quiz-stats-grid">
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#059669" }}>{score}</div>
                            <div className="pp-qs-lbl">Score</div>
                          </div>
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#7c3aed" }}>{timer.fmt}</div>
                            <div className="pp-qs-lbl">Time</div>
                          </div>
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#ea580c" }}>{streak}</div>
                            <div className="pp-qs-lbl">Streak</div>
                          </div>
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#0369a1" }}>{TOTAL_Q - questionNumber + 1}</div>
                            <div className="pp-qs-lbl">Left</div>
                          </div>
                        </div>
                      </div>

                      <div className="pp-quiz-stat-card">
                        <div className="pp-quiz-stat-title">Answer History</div>
                        {quizHistory.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#c5c2b8", textAlign: "center", padding: "12px 0" }}>
                            No answers yet
                          </div>
                        ) : (
                          <div className="pp-history-list">
                            {[...quizHistory].reverse().map((h, i) => (
                              <div key={i} className={`pp-history-item ${h.correct ? "correct-h" : "wrong-h"}`}>
                                <span className="pp-history-item-icon">
                                  {h.correct ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                </span>
                                <span className="pp-history-item-text">
                                  {h.correct
                                    ? `Correct — ${h.q}`
                                    : `Wrong — picked ${h.selected}, was ${h.q}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── RESULTS ── */}
                {quizDone && (
                  <div className="pp-quiz-layout">
                    <div className="pp-result-card">
                      <span className="pp-result-emoji">
                        {pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "💪"}
                      </span>
                      <h2 className="pp-result-title">Quiz Complete!</h2>
                      <p className="pp-result-sub">
                        {pct >= 80 ? "Outstanding performance!" : pct >= 60 ? "Good job, keep practicing!" : "Keep going, you're improving!"}
                      </p>
                      <div className="pp-result-score-big">{score}/{TOTAL_Q}</div>
                      <div className="pp-result-grid">
                        <div className="pp-result-stat">
                          <div className="pp-rs-val" style={{ color: "#059669" }}>{pct}%</div>
                          <div className="pp-rs-lbl">Accuracy</div>
                        </div>
                        <div className="pp-result-stat">
                          <div className="pp-rs-val" style={{ color: "#7c3aed" }}>{timer.fmt}</div>
                          <div className="pp-rs-lbl">Time Taken</div>
                        </div>
                        <div className="pp-result-stat">
                          <div className="pp-rs-val" style={{ color: "#ea580c" }}>{bestStreak}</div>
                          <div className="pp-rs-lbl">Best Streak</div>
                        </div>
                      </div>

                      {/* Answer breakdown */}
                      <div style={{ marginBottom: 24, maxHeight: 200, overflowY: "auto" }}>
                        {quizHistory.map((h, i) => (
                          <div key={i} className={`pp-history-item ${h.correct ? "correct-h" : "wrong-h"}`} style={{ marginBottom: 6 }}>
                            <span className="pp-history-item-icon">
                              {h.correct ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            </span>
                            <span className="pp-history-item-text">
                              Q{i + 1}: {h.correct ? `Correct — ${h.q}` : `Picked ${h.selected}, answer was ${h.q}`}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pp-result-btns">
                        <button className="pp-retry-btn" onClick={startQuiz}>
                          <RotateCcw size={14} /> Try Again
                        </button>
                        <button className="pp-learn-btn" onClick={() => { setMode("learn"); setQuizDone(false); }}>
                          <BookOpen size={14} /> Back to Learn
                        </button>
                      </div>
                    </div>

                    <div className="pp-quiz-sidebar">
                      <div className="pp-quiz-stat-card">
                        <div className="pp-quiz-stat-title">Final Stats</div>
                        <div className="pp-quiz-stats-grid">
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#059669" }}>{score}</div>
                            <div className="pp-qs-lbl">Correct</div>
                          </div>
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#dc2626" }}>{TOTAL_Q - score}</div>
                            <div className="pp-qs-lbl">Wrong</div>
                          </div>
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#ea580c" }}>{bestStreak}</div>
                            <div className="pp-qs-lbl">Best Streak</div>
                          </div>
                          <div className="pp-qs">
                            <div className="pp-qs-val" style={{ color: "#7c3aed" }}>{timer.fmt}</div>
                            <div className="pp-qs-lbl">Time</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default PracticePage;