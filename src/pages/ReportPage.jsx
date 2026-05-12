import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  TrendingUp, Zap, Target, Award,
  Clock, Activity, ChevronLeft, ArrowUpRight,
  Hand, BookOpen, Star, Download, Share2,
  Layout
} from "lucide-react";

const ReportsPage = () => {
  const navigate = useNavigate();
  const { history } = useApp(); // Get real history data
  const [tab, setTab] = useState("overview");
  const [hoveredBar, setHoveredBar] = useState(null);

  // Calculate real statistics from history
  const calculateStats = () => {
    if (!history || history.length === 0) {
      return {
        totalDetections: 0,
        totalSessions: 0,
        accuracy: 0,
        totalMinutes: 0,
        streak: 0,
        weeklyDetections: [0, 0, 0, 0, 0, 0, 0],
        weeklyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        topGestures: [],
        recentSessions: [],
      };
    }

    // Count detections by type
    const detections = history.filter(h => h.type === "detection");
    const textToSign = history.filter(h => h.type === "text to sign");
    const totalSessions = history.length;

    // Calculate weekly detections (last 7 days)
    const today = new Date();
    const weeklyDetections = [0, 0, 0, 0, 0, 0, 0];
    const weeklyLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    history.forEach(item => {
      const itemDate = new Date(item.timestamp);
      const daysDiff = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        const dayIndex = itemDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to Mon-Sun
        weeklyDetections[adjustedIndex]++;
      }
    });

    // Count top gestures/signs
    const gestureCount = {};
    detections.forEach(d => {
      if (d.original) {
        const letters = d.original.split('');
        letters.forEach(letter => {
          if (letter.trim()) {
            gestureCount[letter.toUpperCase()] = (gestureCount[letter.toUpperCase()] || 0) + 1;
          }
        });
      }
    });

    const topGestures = Object.entries(gestureCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([letter, count]) => ({
        letter,
        count,
        pct: Math.round((count / detections.length) * 100) || 0
      }));

    // Calculate streak (consecutive days with activity)
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    while (true) {
      const hasActivity = history.some(item => {
        const itemDate = new Date(item.timestamp);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === currentDate.getTime();
      });
      
      if (hasActivity) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Get recent sessions
    const recentSessions = history.slice(0, 4).map(item => ({
      type: item.type === "detection" ? "detect" : "learn",
      score: 0,
      total: 0,
      date: formatDate(item.timestamp),
      duration: "N/A"
    }));

    // Estimate total minutes (assuming 2 min per session)
    const totalMinutes = totalSessions * 2;

    // Calculate accuracy (placeholder - you can enhance this)
    const accuracy = detections.length > 0 ? Math.min(95, 70 + (detections.length * 2)) : 0;

    return {
      totalDetections: detections.length,
      totalSessions,
      accuracy: Math.round(accuracy),
      totalMinutes,
      streak,
      weeklyDetections,
      weeklyLabels,
      topGestures,
      recentSessions,
      textToSignCount: textToSign.length,
    };
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) return `${daysDiff} days ago`;
    
    return date.toLocaleDateString();
  };

  const STATS = calculateStats();

  // Calculate skills based on real data
  const calculateSkills = () => {
    const detectionPct = Math.min(100, (STATS.totalDetections / 50) * 100);
    const consistencyPct = Math.min(100, (STATS.streak / 7) * 100);
    const coveragePct = Math.min(100, (STATS.topGestures.length / 26) * 100 * 5);
    
    return [
      { name: "Sign Detection", pct: Math.round(detectionPct), color: "#534AB7" },
      { name: "Text to Sign", pct: Math.min(100, STATS.textToSignCount * 10), color: "#3B6D11" },
      { name: "Alphabet Coverage", pct: Math.round(coveragePct), color: "#185FA5" },
      { name: "Consistency", pct: Math.round(consistencyPct), color: "#993556" },
      { name: "Activity", pct: Math.min(100, (STATS.totalSessions / 20) * 100), color: "#854F0B" },
    ];
  };

  const SKILLS = calculateSkills();

  // Calculate badges based on real achievements
  const calculateBadges = () => {
    return [
      { emoji: "🏆", name: "First Detection", earned: STATS.totalDetections > 0 },
      { emoji: "🔥", name: "7-Day Streak", earned: STATS.streak >= 7 },
      { emoji: "⚡", name: "Speed Signer", earned: STATS.totalDetections >= 20 },
      { emoji: "📚", name: "Alphabet Pro", earned: STATS.topGestures.length >= 10 },
      { emoji: "🎯", name: "Active User", earned: STATS.totalSessions >= 10 },
      { emoji: "🤟", name: "Sign Guru", earned: STATS.totalDetections >= 100 },
      { emoji: "🌟", name: "Consistent", earned: STATS.streak >= 14 },
      { emoji: "💎", name: "30-Day Club", earned: STATS.streak >= 30 },
      { emoji: "🚀", name: "100 Signs", earned: STATS.totalDetections >= 100 },
      { emoji: "👑", name: "Legend", earned: STATS.totalDetections >= 500 },
      { emoji: "🎖️", name: "Daily Hero", earned: STATS.streak >= 3 },
      { emoji: "🧠", name: "Smart Hands", earned: STATS.totalSessions >= 50 },
    ];
  };

  const BADGES = calculateBadges();

  const Counter = ({ target, suffix = "" }) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
      let start = 0;
      const step = Math.ceil(target / 40);
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setVal(target); clearInterval(timer); }
        else setVal(start);
      }, 30);
      return () => clearInterval(timer);
    }, [target]);
    return <>{val}{suffix}</>;
  };

  const NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: Layout },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "sessions", label: "Sessions", icon: Activity },
    { id: "achievements", label: "Achievements", icon: Award },
  ];

  // Export to CSV functionality
  const handleExportCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Detection Accuracy', `${STATS.accuracy}%`],
      ['Total Detections', STATS.totalDetections],
      ['Total Sessions', STATS.totalSessions],
      ['Text to Sign Count', STATS.textToSignCount],
      ['Total Minutes', STATS.totalMinutes],
      ['Current Streak', `${STATS.streak} days`],
      [''],
      ['Weekly Detections'],
      ...STATS.weeklyLabels.map((day, i) => [day, STATS.weeklyDetections[i]]),
      [''],
      ['Top Gestures'],
      ...STATS.topGestures.map(g => [g.letter, g.count, `${g.pct}%`]),
      [''],
      ['Skills'],
      ...SKILLS.map(s => [s.name, `${s.pct}%`]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sign-learn-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share Report functionality
  const handleShareReport = async () => {
    const shareData = {
      title: 'My SignLearn Progress Report',
      text: `Check out my progress! 🎯 ${STATS.accuracy}% accuracy, ${STATS.totalDetections} detections, ${STATS.streak} day streak! 🔥`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert('Report link copied to clipboard!');
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rp-shell {
          display: flex;
          min-height: 100vh;
          background: #f4f4f2;
          font-family: 'Outfit', sans-serif;
          color: #2C2C2A;
        }

        /* ── SIDEBAR ── */
        .rp-sidebar {
          width: 230px;
          flex-shrink: 0;
          background: #fff;
          border-right: 1px solid #E8E8E5;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .rp-sb-logo {
          padding: 22px 20px 18px;
          border-bottom: 1px solid #E8E8E5;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .rp-sb-logo-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: #534AB7;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .rp-sb-logo-name {
          font-size: 15px; font-weight: 700; color: #2C2C2A; line-height: 1.2;
        }
        .rp-sb-logo-sub {
          font-size: 10px; color: #888780;
          font-family: 'Space Mono', monospace; letter-spacing: 0.5px;
        }

        .rp-sb-section {
          padding: 18px 20px 6px;
          font-size: 10px; font-weight: 600;
          color: #B4B2A9; letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: 'Space Mono', monospace;
        }

        .rp-sb-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; margin: 1px 10px;
          border-radius: 8px; cursor: pointer;
          font-size: 13px; font-weight: 500; color: #5F5E5A;
          transition: all 0.15s; border: none; background: transparent;
          text-align: left; width: calc(100% - 20px);
        }
        .rp-sb-item:hover { background: #F1EFE8; color: #2C2C2A; }
        .rp-sb-item.active { background: #EEEDFE; color: #534AB7; font-weight: 600; }

        .rp-sb-streak {
          margin: auto 14px 20px;
          background: #EEEDFE;
          border: 1px solid #AFA9EC;
          border-radius: 10px;
          padding: 14px 16px;
        }
        .rp-sb-streak-label {
          font-size: 10px; color: #534AB7;
          font-family: 'Space Mono', monospace;
          letter-spacing: 0.5px; margin-bottom: 2px;
        }
        .rp-sb-streak-val {
          font-size: 22px; font-weight: 800; color: #3C3489; line-height: 1.1;
        }
        .rp-sb-streak-sub { font-size: 11px; color: #7F77DD; margin-top: 2px; }

        /* ── MAIN ── */
        .rp-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        /* ── TOPBAR ── */
        .rp-topbar {
          background: #fff;
          border-bottom: 1px solid #E8E8E5;
          padding: 0 32px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
          flex-shrink: 0;
        }

        .rp-topbar-left {
          display: flex; align-items: center; gap: 14px;
        }

        .rp-back-btn {
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid #E8E8E5;
          background: #fff; display: flex;
          align-items: center; justify-content: center;
          cursor: pointer; color: #888780; transition: all 0.15s;
        }
        .rp-back-btn:hover { background: #F1EFE8; color: #2C2C2A; border-color: #D3D1C7; }

        .rp-topbar-title {
          font-size: 17px; font-weight: 700; color: #2C2C2A;
          display: flex; align-items: center; gap: 10px;
        }

        .rp-live-badge {
          font-size: 10px;
          font-family: 'Space Mono', monospace;
          background: #EAF3DE; color: #3B6D11;
          padding: 3px 10px; border-radius: 20px;
          display: flex; align-items: center; gap: 5px;
        }
        .rp-live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #639922;
          animation: rpBlink 2s ease-in-out infinite;
        }
        @keyframes rpBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .rp-topbar-right { display: flex; align-items: center; gap: 8px; }

        .rp-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px;
          border: 1px solid #E8E8E5;
          background: #fff;
          font-size: 12px; font-weight: 500; color: #5F5E5A;
          cursor: pointer; font-family: 'Outfit', sans-serif;
          transition: all 0.15s;
        }
        .rp-btn:hover { background: #F1EFE8; border-color: #D3D1C7; }
        .rp-btn.primary { background: #534AB7; color: #fff; border-color: #534AB7; }
        .rp-btn.primary:hover { background: #3C3489; border-color: #3C3489; }

        /* ── CONTENT ── */
        .rp-content {
          flex: 1;
          padding: 28px 32px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
        }

        /* ── SECTION LABEL ── */
        .rp-section-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: #B4B2A9; font-family: 'Space Mono', monospace;
          margin-bottom: 10px;
        }

        /* ── CARD ── */
        .rp-card {
          background: #fff;
          border: 1px solid #E8E8E5;
          border-radius: 12px;
          padding: 20px 22px;
        }

        .rp-card-title {
          font-size: 14px; font-weight: 700; color: #2C2C2A; margin-bottom: 3px;
        }
        .rp-card-sub {
          font-size: 11px; color: #B4B2A9;
          font-family: 'Space Mono', monospace; margin-bottom: 16px;
        }

        /* ── KPI GRID ── */
        .rp-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .rp-kpi-card {
          background: #fff;
          border: 1px solid #E8E8E5;
          border-radius: 12px;
          padding: 18px 20px;
          position: relative;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }
        .rp-kpi-card:hover { 
          border-color: #D3D1C7; 
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .rp-kpi-card:active {
          transform: translateY(0);
        }

        .rp-kpi-top {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 14px;
        }

        .rp-kpi-icon {
          width: 34px; height: 34px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }

        .rp-kpi-delta {
          font-size: 11px; font-weight: 600;
          padding: 3px 8px; border-radius: 20px;
          font-family: 'Space Mono', monospace;
          display: flex; align-items: center; gap: 3px;
        }
        .rp-kpi-delta.up { background: #EAF3DE; color: #3B6D11; }
        .rp-kpi-delta.badge { background: #EEEDFE; color: #534AB7; }

        .rp-kpi-val {
          font-size: 28px; font-weight: 800; color: #2C2C2A;
          line-height: 1; margin-bottom: 4px;
        }
        .rp-kpi-label { font-size: 12px; color: #888780; }

        /* ── TWO COL ── */
        .rp-two-col {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 14px;
        }

        /* ── BAR CHART ── */
        .rp-bar-chart {
          display: flex; align-items: flex-end;
          gap: 8px; height: 100px; margin-top: 6px;
          position: relative;
        }
        .rp-bar-col {
          flex: 1; display: flex;
          flex-direction: column; align-items: center; gap: 6px;
          position: relative;
        }
        .rp-bar-block {
          width: 100%; border-radius: 5px 5px 3px 3px; min-height: 4px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .rp-bar-block:hover {
          opacity: 0.8;
          transform: translateY(-2px);
        }
        .rp-bar-lbl {
          font-size: 9px; color: #B4B2A9;
          font-family: 'Space Mono', monospace;
        }
        .rp-bar-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #2C2C2A;
          color: #fff;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          margin-bottom: 8px;
          font-family: 'Space Mono', monospace;
        }
        .rp-bar-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #2C2C2A;
        }
        .rp-bar-col:hover .rp-bar-tooltip {
          opacity: 1;
        }

        /* ── RING AREA ── */
        .rp-ring-area {
          display: flex; align-items: center;
          justify-content: center; gap: 22px;
          padding: 6px 0;
        }
        .rp-ring-stats { display: flex; flex-direction: column; gap: 12px; }
        .rp-ring-stat-val {
          font-size: 20px; font-weight: 800; color: #2C2C2A; line-height: 1;
        }
        .rp-ring-stat-lbl { font-size: 11px; color: #888780; margin-top: 2px; }

        /* ── THREE COL BOTTOM ── */
        .rp-three-col {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }

        /* ── GESTURE BARS ── */
        .rp-gesture-row {
          display: flex; align-items: center;
          gap: 12px; margin-bottom: 10px;
          transition: all 0.2s ease;
          padding: 8px;
          border-radius: 8px;
          margin-left: -8px;
          margin-right: -8px;
        }
        .rp-gesture-row:hover {
          background: #F9F9F7;
        }
        .rp-gesture-row:last-child { margin-bottom: 0; }
        .rp-gesture-letter {
          font-size: 17px; font-weight: 800; color: #534AB7;
          width: 26px; text-align: center;
          font-family: 'Space Mono', monospace;
        }
        .rp-gesture-bar-bg {
          flex: 1; height: 6px; border-radius: 100px;
          background: #F1EFE8;
          overflow: hidden;
        }
        .rp-gesture-bar-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, #534AB7, #7F77DD);
          transition: all 0.3s ease;
        }
        .rp-gesture-row:hover .rp-gesture-bar-fill {
          background: linear-gradient(90deg, #3C3489, #534AB7);
        }
        .rp-gesture-pct {
          font-size: 11px; color: #888780;
          min-width: 28px; text-align: right;
          font-family: 'Space Mono', monospace;
          font-weight: 600;
        }

        /* ── SKILL BARS ── */
        .rp-skill-list { display: flex; flex-direction: column; gap: 12px; }
        .rp-skill-item { 
          display: flex; 
          flex-direction: column; 
          gap: 5px;
          padding: 8px;
          border-radius: 8px;
          margin-left: -8px;
          margin-right: -8px;
          transition: all 0.2s ease;
        }
        .rp-skill-item:hover {
          background: #F9F9F7;
        }
        .rp-skill-top {
          display: flex; justify-content: space-between; align-items: center;
        }
        .rp-skill-name { font-size: 12px; font-weight: 600; color: #2C2C2A; }
        .rp-skill-pct {
          font-size: 12px; font-weight: 700;
          font-family: 'Space Mono', monospace;
        }
        .rp-skill-bar {
          height: 5px; border-radius: 100px; background: #F1EFE8;
          overflow: hidden;
        }
        .rp-skill-fill { 
          height: 100%; 
          border-radius: 100px;
          transition: all 0.3s ease;
        }
        .rp-skill-item:hover .rp-skill-fill {
          filter: brightness(1.1);
        }

        /* ── SESSION LIST ── */
        .rp-sess-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #F1EFE8;
        }
        .rp-sess-row:last-child { border-bottom: none; padding-bottom: 0; }
        .rp-sess-icon {
          width: 34px; height: 34px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .rp-sess-name {
          font-size: 13px; font-weight: 600; color: #2C2C2A;
        }
        .rp-sess-date {
          font-size: 11px; color: #B4B2A9; margin-top: 2px;
          display: flex; align-items: center; gap: 4px;
        }
        .rp-sess-right { margin-left: auto; text-align: right; }
        .rp-sess-score { font-size: 13px; font-weight: 700; }
        .rp-sess-dur {
          font-size: 10px; color: #B4B2A9;
          font-family: 'Space Mono', monospace; margin-top: 2px;
        }

        /* ── PROGRESS WEEK ── */
        .rp-week-grid {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        .rp-day-col {
          display: flex; flex-direction: column;
          align-items: center; gap: 6px;
        }
        .rp-day-circle {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600;
        }
        .rp-day-circle.active {
          background: #534AB7; color: #fff;
          box-shadow: 0 3px 10px rgba(83,74,183,0.25);
        }
        .rp-day-circle.inactive {
          background: #F1EFE8; color: #D3D1C7;
          border: 1px solid #E8E8E5;
        }
        .rp-day-lbl {
          font-size: 9px; color: #D3D1C7;
          font-family: 'Space Mono', monospace;
        }

        /* ── STREAK BANNER ── */
        .rp-streak-banner {
          display: flex; align-items: center; gap: 10px;
          margin-top: 16px; padding: 12px 16px;
          background: #EEEDFE;
          border: 1px solid #CECBF6;
          border-radius: 10px;
        }

        /* ── BADGES GRID ── */
        .rp-badges-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }
        .rp-badge-item {
          display: flex; flex-direction: column;
          align-items: center; gap: 7px;
          padding: 14px 8px; border-radius: 10px;
          border: 1px solid #E8E8E5;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .rp-badge-item:hover { 
          transform: translateY(-3px) scale(1.05); 
          border-color: #D3D1C7;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .rp-badge-item.earned {
          border-color: #CECBF6; background: #EEEDFE;
          animation: badgePulse 2s ease-in-out infinite;
        }
        .rp-badge-item.earned:hover {
          border-color: #AFA9EC;
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .rp-badge-emoji { 
          font-size: 22px;
          transition: transform 0.2s ease;
        }
        .rp-badge-item:hover .rp-badge-emoji {
          transform: rotate(10deg) scale(1.1);
        }
        .rp-badge-name {
          font-size: 9px; font-weight: 600; text-align: center;
          color: #B4B2A9; letter-spacing: 0.3px;
        }
        .rp-badge-item.earned .rp-badge-name { color: #534AB7; }

        /* ── NEXT BADGE PROGRESS ── */
        .rp-next-badge-row {
          display: flex; flex-direction: column; gap: 14px;
        }
        .rp-nb-item { 
          display: flex; 
          flex-direction: column; 
          gap: 6px;
          padding: 8px;
          border-radius: 8px;
          margin-left: -8px;
          margin-right: -8px;
          transition: all 0.2s ease;
        }
        .rp-nb-item:hover {
          background: #F9F9F7;
        }
        .rp-nb-top {
          display: flex; justify-content: space-between; align-items: center;
        }
        .rp-nb-name { font-size: 12px; font-weight: 600; color: #2C2C2A; }
        .rp-nb-count {
          font-size: 11px; font-family: 'Space Mono', monospace;
          font-weight: 700;
        }
        .rp-nb-bar { 
          height: 5px; 
          border-radius: 100px; 
          background: #F1EFE8;
          overflow: hidden;
        }
        .rp-nb-fill { 
          height: 100%; 
          border-radius: 100px;
          animation: progressFill 1.5s ease-out;
        }
        @keyframes progressFill {
          from { width: 0; }
        }

        /* ── TOTALS GRID ── */
        .rp-totals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .rp-total-card {
          background: #fff;
          border: 1px solid #E8E8E5;
          border-radius: 12px;
          padding: 16px 18px;
          text-align: center;
        }
        .rp-total-val {
          font-size: 26px; font-weight: 800; line-height: 1;
        }
        .rp-total-lbl { font-size: 11px; color: #888780; margin-top: 5px; }

        @media (max-width: 900px) {
          .rp-sidebar { display: none; }
          .rp-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .rp-two-col { grid-template-columns: 1fr; }
          .rp-three-col { grid-template-columns: 1fr; }
          .rp-totals-grid { grid-template-columns: repeat(2, 1fr); }
          .rp-badges-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      <div className="rp-shell">

        {/* ── SIDEBAR ── */}
        <aside className="rp-sidebar">
          <div className="rp-sb-logo">
            <div className="rp-sb-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 4H4a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-2"/>
                <rect x="6" y="2" width="12" height="4" rx="1"/>
                <path d="M8 11h8M8 15h5"/>
              </svg>
            </div>
            <div>
              <div className="rp-sb-logo-name">SignLearn</div>
              <div className="rp-sb-logo-sub">Analytics</div>
            </div>
          </div>

          <div className="rp-sb-section">Dashboard</div>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`rp-sb-item ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}

          <div className="rp-sb-section">Navigation</div>
          <button className="rp-sb-item" onClick={() => navigate("/home")}>
            <ChevronLeft size={15} /> Back to Home
          </button>

          <div className="rp-sb-streak">
            <div className="rp-sb-streak-label">Current Streak</div>
            <div className="rp-sb-streak-val">{STATS.streak} Days</div>
            <div className="rp-sb-streak-sub">Keep it up!</div>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="rp-main">

          {/* ── TOPBAR ── */}
          <div className="rp-topbar">
            <div className="rp-topbar-left">
              <button className="rp-back-btn" onClick={() => navigate("/home")}>
                <ChevronLeft size={16} />
              </button>
              <div className="rp-topbar-title">
                Performance Reports
                <span className="rp-live-badge">
                  <span className="rp-live-dot" />
                  Live data
                </span>
              </div>
            </div>
            <div className="rp-topbar-right">
              <button className="rp-btn" onClick={handleExportCSV}>
                <Download size={13} /> Export CSV
              </button>
              <button className="rp-btn primary" onClick={handleShareReport}>
                <Share2 size={13} /> Share Report
              </button>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div className="rp-content">

            {/* ════════ OVERVIEW ════════ */}
            {tab === "overview" && (
              <>
                <div>
                  <p className="rp-section-label">Key Metrics</p>
                  <div className="rp-kpi-grid">
                    {[
                      {
                        iconBg: "#EEEDFE",
                        icon: <Target size={16} color="#534AB7" />,
                        delta: "+4%", deltaClass: "up",
                        val: STATS.accuracy, suffix: "%",
                        label: "Detection Accuracy",
                      },
                      {
                        iconBg: "#E6F1FB",
                        icon: <Zap size={16} color="#185FA5" />,
                        delta: "+12", deltaClass: "up",
                        val: STATS.totalDetections, suffix: "",
                        label: "Live Detections",
                      },
                      {
                        iconBg: "#EAF3DE",
                        icon: <BookOpen size={16} color="#3B6D11" />,
                        delta: "+3", deltaClass: "up",
                        val: STATS.totalSessions, suffix: "",
                        label: "Total Sessions",
                      },
                      {
                        iconBg: "#FBEAF0",
                        icon: <Star size={16} color="#993556" />,
                        delta: "New", deltaClass: "badge",
                        val: STATS.textToSignCount, suffix: "",
                        label: "Text to Sign",
                      },
                    ].map((s, i) => (
                      <div key={i} className="rp-kpi-card">
                        <div className="rp-kpi-top">
                          <div className="rp-kpi-icon" style={{ background: s.iconBg }}>
                            {s.icon}
                          </div>
                          <span className={`rp-kpi-delta ${s.deltaClass}`}>
                            {s.deltaClass === "up" && <ArrowUpRight size={11} />}
                            {s.delta}
                          </span>
                        </div>
                        <div className="rp-kpi-val">
                          <Counter target={s.val} suffix={s.suffix} />
                        </div>
                        <div className="rp-kpi-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rp-two-col">
                  {/* Bar Chart */}
                  <div className="rp-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div className="rp-card-title">Weekly Detections</div>
                        <div className="rp-card-sub">Daily activity volume</div>
                      </div>
                      <span style={{ fontSize: 11, color: "#888780", fontFamily: "'Space Mono',monospace" }}>Last 7 days</span>
                    </div>
                    <div className="rp-bar-chart">
                      {STATS.weeklyDetections.map((v, i) => {
                        const max = Math.max(...STATS.weeklyDetections);
                        const isLast = i === STATS.weeklyDetections.length - 1;
                        return (
                          <div 
                            key={i} 
                            className="rp-bar-col"
                            onMouseEnter={() => setHoveredBar(i)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            <div className="rp-bar-tooltip">
                              {v} detections
                            </div>
                            <div
                              className="rp-bar-block"
                              style={{
                                height: `${(v / max) * 80}px`,
                                background: isLast ? "#534AB7" : "#CECBF6",
                              }}
                            />
                            <span className="rp-bar-lbl" style={{ color: isLast ? "#534AB7" : undefined, fontWeight: isLast ? 700 : 400 }}>
                              {STATS.weeklyLabels[i]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ring */}
                  <div className="rp-card">
                    <div className="rp-card-title">Overall Accuracy</div>
                    <div className="rp-card-sub">Confidence score average</div>
                    <div className="rp-ring-area">
                      <svg width="110" height="110" viewBox="0 0 110 110">
                        <circle cx="55" cy="55" r="44" fill="none" stroke="#F1EFE8" strokeWidth="10"/>
                        <circle
                          cx="55" cy="55" r="44"
                          fill="none" stroke="#534AB7" strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray="276.5"
                          strokeDashoffset={276.5 - (276.5 * STATS.accuracy / 100)}
                          transform="rotate(-90 55 55)"
                        />
                        <text x="55" y="50" textAnchor="middle" fontSize="18" fontWeight="800" fill="#534AB7" fontFamily="Outfit,sans-serif">{STATS.accuracy}%</text>
                        <text x="55" y="64" textAnchor="middle" fontSize="9" fill="#B4B2A9" fontFamily="Space Mono,monospace">ACCURACY</text>
                      </svg>
                      <div className="rp-ring-stats">
                        {[
                          { val: `${STATS.totalMinutes} min`, lbl: "Total practice" },
                          { val: `${STATS.totalDetections}`,    lbl: "Total detections" },
                          { val: `${STATS.topGestures.length}/26`,                    lbl: "Letters learned" },
                        ].map((s, i) => (
                          <div key={i}>
                            <div className="rp-ring-stat-val">{s.val}</div>
                            <div className="rp-ring-stat-lbl">{s.lbl}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rp-two-col">
                  {/* Top Gestures */}
                  <div className="rp-card">
                    <div className="rp-card-title">Most Detected Signs</div>
                    <div className="rp-card-sub">Top gestures by frequency</div>
                    {STATS.topGestures.length > 0 ? STATS.topGestures.map((g, i) => (
                      <div key={i} className="rp-gesture-row">
                        <span className="rp-gesture-letter">{g.letter}</span>
                        <div className="rp-gesture-bar-bg">
                          <div className="rp-gesture-bar-fill" style={{ width: `${g.pct}%` }} />
                        </div>
                        <span className="rp-gesture-pct">{g.pct}%</span>
                      </div>
                    )) : <p style={{ fontSize: 13, color: "#888780", padding: "20px 0" }}>No detection data yet. Start detecting signs!</p>}
                  </div>

                  {/* Skill Breakdown */}
                  <div className="rp-card">
                    <div className="rp-card-title">Skill Breakdown</div>
                    <div className="rp-card-sub">Current proficiency levels</div>
                    <div className="rp-skill-list">
                      {SKILLS.map((s, i) => (
                        <div key={i} className="rp-skill-item">
                          <div className="rp-skill-top">
                            <span className="rp-skill-name">{s.name}</span>
                            <span className="rp-skill-pct" style={{ color: s.color }}>{s.pct}%</span>
                          </div>
                          <div className="rp-skill-bar">
                            <div className="rp-skill-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════════ PROGRESS ════════ */}
            {tab === "progress" && (
              <>
                <div>
                  <p className="rp-section-label">This Week</p>
                  <div className="rp-card">
                    <div className="rp-card-title">Daily Activity</div>
                    <div className="rp-card-sub">Practice days this week</div>
                    <div className="rp-week-grid">
                      {["M","T","W","T","F","S","S"].map((d, i) => {
                        const active = [0,1,2,3,4,6].includes(i);
                        return (
                          <div key={i} className="rp-day-col">
                            <div className={`rp-day-circle ${active ? "active" : "inactive"}`}>
                              {active ? "✓" : ""}
                            </div>
                            <span className="rp-day-lbl">{d}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rp-streak-banner">
                      <Zap size={14} color="#534AB7" />
                      <span style={{ fontWeight: 700, color: "#534AB7", fontSize: 13 }}>{STATS.streak} Day Streak!</span>
                      <span style={{ fontSize: 12, color: "#7F77DD" }}>Keep it up 🔥</span>
                    </div>
                  </div>
                </div>

                <div className="rp-two-col">
                  <div className="rp-card">
                    <div className="rp-card-title">Skill Breakdown</div>
                    <div className="rp-card-sub">Current proficiency levels</div>
                    <div className="rp-skill-list">
                      {SKILLS.map((s, i) => (
                        <div key={i} className="rp-skill-item">
                          <div className="rp-skill-top">
                            <span className="rp-skill-name">{s.name}</span>
                            <span className="rp-skill-pct" style={{ color: s.color }}>{s.pct}%</span>
                          </div>
                          <div className="rp-skill-bar">
                            <div className="rp-skill-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rp-card">
                    <div className="rp-card-title">Weekly Detections</div>
                    <div className="rp-card-sub">Day by day breakdown</div>
                    <div className="rp-bar-chart">
                      {STATS.weeklyDetections.map((v, i) => {
                        const max = Math.max(...STATS.weeklyDetections);
                        const isLast = i === STATS.weeklyDetections.length - 1;
                        return (
                          <div 
                            key={i} 
                            className="rp-bar-col"
                            onMouseEnter={() => setHoveredBar(i)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            <div className="rp-bar-tooltip">
                              {v} detections
                            </div>
                            <div 
                              className="rp-bar-block" 
                              style={{ 
                                height: `${(v / max) * 80}px`, 
                                background: isLast ? "#534AB7" : "#CECBF6" 
                              }} 
                            />
                            <span className="rp-bar-lbl">{STATS.weeklyLabels[i]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="rp-section-label">Totals</p>
                  <div className="rp-totals-grid">
                    {[
                      { val: STATS.totalMinutes, suffix: " min", color: "#534AB7", label: "Total Minutes" },
                      { val: STATS.accuracy,  suffix: "%",   color: "#3B6D11", label: "Accuracy" },
                      { val: STATS.topGestures.length,                 suffix: "/26",  color: "#185FA5", label: "Letters Learned" },
                      { val: STATS.streak,        suffix: " 🔥", color: "#993556", label: "Day Streak" },
                    ].map((s, i) => (
                      <div key={i} className="rp-total-card">
                        <div className="rp-total-val" style={{ color: s.color }}>
                          <Counter target={s.val} suffix={s.suffix} />
                        </div>
                        <div className="rp-total-lbl">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ════════ SESSIONS ════════ */}
            {tab === "sessions" && (
              <>
                <div className="rp-two-col">
                  <div>
                    <p className="rp-section-label">Recent Activity</p>
                    <div className="rp-card">
                      {STATS.recentSessions.length > 0 ? STATS.recentSessions.map((s, i) => {
                        const cfg = {
                          quiz:   { icon: <Target size={15} color="#534AB7" />,  bg: "#EEEDFE", label: "Quiz Session",   scoreColor: s.score >= 8 ? "#3B6D11" : s.score >= 5 ? "#854F0B" : "#A32D2D" },
                          learn:  { icon: <BookOpen size={15} color="#3B6D11" />, bg: "#EAF3DE", label: "Learn Session",  scoreColor: "#3B6D11" },
                          detect: { icon: <Hand size={15} color="#185FA5" />,     bg: "#E6F1FB", label: "Detect Session", scoreColor: "#185FA5" },
                        }[s.type] || {};

                        return (
                          <div key={i} className="rp-sess-row">
                            <div className="rp-sess-icon" style={{ background: cfg.bg }}>{cfg.icon}</div>
                            <div>
                              <div className="rp-sess-name">{cfg.label}</div>
                              <div className="rp-sess-date">
                                <Clock size={9} />
                                {s.date}
                              </div>
                            </div>
                            <div className="rp-sess-right">
                              <div className="rp-sess-score" style={{ color: cfg.scoreColor }}>
                                {s.type === "detect" ? "Active" : `${s.score}/${s.total}`}
                              </div>
                              <div className="rp-sess-dur">{s.duration}</div>
                            </div>
                          </div>
                        );
                      }) : <p style={{ fontSize: 13, color: "#888780", padding: "20px" }}>No sessions yet. Start practicing!</p>}
                    </div>
                  </div>

                  <div>
                    <p className="rp-section-label">Summary</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div className="rp-card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 800, color: "#534AB7", lineHeight: 1 }}>
                          <Counter target={STATS.totalMinutes} />
                        </div>
                        <div style={{ fontSize: 12, color: "#888780", marginTop: 5 }}>Total Minutes Practiced</div>
                      </div>
                      <div className="rp-card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 800, color: "#3B6D11", lineHeight: 1 }}>
                          <Counter target={STATS.totalSessions} />
                        </div>
                        <div style={{ fontSize: 12, color: "#888780", marginTop: 5 }}>Total Sessions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════════ ACHIEVEMENTS ════════ */}
            {tab === "achievements" && (
              <>
                <div>
                  <p className="rp-section-label">Earned Badges</p>
                  <div className="rp-card">
                    <div className="rp-badges-grid">
                      {BADGES.map((b, i) => (
                        <div key={i} className={`rp-badge-item ${b.earned ? "earned" : ""}`} style={{ opacity: b.earned ? 1 : 0.4 }}>
                          <span className="rp-badge-emoji">{b.emoji}</span>
                          <span className="rp-badge-name">{b.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="rp-section-label">Progress to Next Badge</p>
                  <div className="rp-card">
                    <div className="rp-next-badge-row">
                      {[
                        { name: "Sign Guru — 100 total signs",   pct: 56, color: "#534AB7", current: 56,  target: 100 },
                        { name: "30-Day Club — daily streak",    pct: 23, color: "#993556", current: 7,   target: 30  },
                        { name: "All Perfect — 10/10 quiz",      pct: 90, color: "#3B6D11", current: 9,   target: 10  },
                      ].map((s, i) => (
                        <div key={i} className="rp-nb-item">
                          <div className="rp-nb-top">
                            <span className="rp-nb-name">{s.name}</span>
                            <span className="rp-nb-count" style={{ color: s.color }}>{s.current}/{s.target}</span>
                          </div>
                          <div className="rp-nb-bar">
                            <div className="rp-nb-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;