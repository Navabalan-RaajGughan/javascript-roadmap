"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  ROADMAP,
  totalTopics,
  type Phase,
  type Difficulty,
  type FilterMode,
  type UserData,
  DEFAULT_USER_DATA,
} from "../data/roadmap";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { usePomodoro } from "../hooks/usePomodoro";

// ─── Theme Helpers ──────────────────────────────────────────────────────────

type Theme = "dark" | "light";

const THEMES: Record<
  Theme,
  {
    bg: string;
    card: string;
    cardExpanded: string;
    text: string;
    textMuted: string;
    textDim: string;
    border: string;
    inputBg: string;
    inputBorder: string;
    innerBg: string;
    progressBg: string;
  }
> = {
  dark: {
    bg: "linear-gradient(165deg, #0d0d0d 0%, #1a1a2e 40%, #16213e 100%)",
    card: "rgba(255,255,255,0.02)",
    cardExpanded: "rgba(255,255,255,0.04)",
    text: "#e0e0e0",
    textMuted: "#888",
    textDim: "#666",
    border: "rgba(255,255,255,0.06)",
    inputBg: "rgba(255,255,255,0.05)",
    inputBorder: "rgba(255,255,255,0.1)",
    innerBg: "#1a1a2e",
    progressBg: "rgba(255,255,255,0.06)",
  },
  light: {
    bg: "linear-gradient(165deg, #f5f7fa 0%, #e8ecf1 40%, #dfe6ed 100%)",
    card: "rgba(255,255,255,0.7)",
    cardExpanded: "rgba(255,255,255,0.85)",
    text: "#1a1a2e",
    textMuted: "#666",
    textDim: "#999",
    border: "rgba(0,0,0,0.08)",
    inputBg: "rgba(255,255,255,0.8)",
    inputBorder: "rgba(0,0,0,0.12)",
    innerBg: "#f0f2f5",
    progressBg: "rgba(0,0,0,0.06)",
  },
};

// ─── Difficulty Config ──────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; emoji: string; color: string }
> = {
  easy: { label: "Easy", emoji: "🟢", color: "#4caf50" },
  medium: { label: "Medium", emoji: "🟡", color: "#ff9800" },
  hard: { label: "Hard", emoji: "🔴", color: "#f44336" },
};

const DIFFICULTY_CYCLE: (Difficulty | null)[] = [null, "easy", "medium", "hard"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function calculateStreak(studyLog: string[]): number {
  if (studyLog.length === 0) return 0;
  const uniqueDays = [...new Set(studyLog)].sort().reverse();
  const today = getTodayISO();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must include today or yesterday
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 0;
  let checkDate = new Date(uniqueDays[0]);

  for (const day of uniqueDays) {
    const expected = checkDate.toISOString().slice(0, 10);
    if (day === expected) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else if (day < expected) {
      break;
    }
  }
  return streak;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function JavaScriptRoadmap(): React.JSX.Element {
  // ── Persistent State (localStorage) ──
  const [completedTopics, setCompletedTopics] = useLocalStorage<
    Record<string, boolean>
  >("jsroadmap-completed", {});
  const [notes, setNotes] = useLocalStorage<Record<string, string>>(
    "jsroadmap-notes",
    {}
  );
  const [difficulty, setDifficulty] = useLocalStorage<
    Record<string, Difficulty>
  >("jsroadmap-difficulty", {});
  const [focusPhase, setFocusPhase] = useLocalStorage<number | null>(
    "jsroadmap-focus",
    null
  );
  const [theme, setTheme] = useLocalStorage<Theme>("jsroadmap-theme", "dark");
  const [studyLog, setStudyLog] = useLocalStorage<string[]>(
    "jsroadmap-studylog",
    []
  );

  // ── Ephemeral State ──
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showStats, setShowStats] = useState(false);
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [printingPhase, setPrintingPhase] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = THEMES[theme];
  const pomodoro = usePomodoro(25, 5);

  useEffect(() => {
    const handleAfterPrint = () => setPrintingPhase(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  // ── Computed ──
  const completedCount = useMemo(
    () => Object.values(completedTopics).filter(Boolean).length,
    [completedTopics]
  );
  const progress = Math.round((completedCount / totalTopics) * 100);
  const streak = useMemo(() => calculateStreak(studyLog), [studyLog]);
  const todayCount = useMemo(
    () => studyLog.filter((d) => d === getTodayISO()).length,
    [studyLog]
  );

  // ── Actions ──
  const togglePhase = (i: number): void =>
    setExpandedPhase(expandedPhase === i ? null : i);

  const toggleSection = (key: string): void =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleTopic = (key: string): void => {
    const isDone = !!completedTopics[key];
    setCompletedTopics((prev) => ({ ...prev, [key]: !isDone }));
    // Log study activity when marking complete
    if (!isDone) {
      setStudyLog((prev) => [...prev, getTodayISO()]);
    }
  };

  const cycleDifficulty = (key: string): void => {
    const currentIdx = DIFFICULTY_CYCLE.indexOf(difficulty[key] || null);
    const nextIdx = (currentIdx + 1) % DIFFICULTY_CYCLE.length;
    const next = DIFFICULTY_CYCLE[nextIdx];
    setDifficulty((prev) => {
      const copy = { ...prev };
      if (next === null) {
        delete copy[key];
      } else {
        copy[key] = next;
      }
      return copy;
    });
  };

  const toggleNote = (key: string): void => {
    setShowNoteFor(showNoteFor === key ? null : key);
  };

  const updateNote = (key: string, text: string): void => {
    setNotes((prev) => {
      const copy = { ...prev };
      if (text.trim() === "") {
        delete copy[key];
      } else {
        copy[key] = text;
      }
      return copy;
    });
  };

  const toggleFocus = (phaseIdx: number): void => {
    setFocusPhase(focusPhase === phaseIdx ? null : phaseIdx);
  };

  const handlePrintPhase = (idx: number) => {
    setPrintingPhase(idx);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // ── Export / Import ──
  const exportData = useCallback(() => {
    const data: UserData = {
      completedTopics,
      notes,
      difficulty,
      focusPhase,
      theme,
      studyLog,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `js-roadmap-backup-${getTodayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [completedTopics, notes, difficulty, focusPhase, theme, studyLog]);

  const importData = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data: UserData = JSON.parse(ev.target?.result as string);
          if (data.completedTopics) setCompletedTopics(data.completedTopics);
          if (data.notes) setNotes(data.notes);
          if (data.difficulty) setDifficulty(data.difficulty);
          if (data.focusPhase !== undefined) setFocusPhase(data.focusPhase);
          if (data.theme) setTheme(data.theme);
          if (data.studyLog) setStudyLog(data.studyLog);
          alert("✅ Data imported successfully!");
        } catch {
          alert("❌ Invalid backup file.");
        }
      };
      reader.readAsText(file);
      // Reset file input so the same file can be re-imported
      e.target.value = "";
    },
    [
      setCompletedTopics,
      setNotes,
      setDifficulty,
      setFocusPhase,
      setTheme,
      setStudyLog,
    ]
  );

  // ── Phase Helpers ──
  const getPhaseCompletedCount = (phaseIdx: number): number => {
    const phase = ROADMAP[phaseIdx];
    let count = 0;
    phase.sections.forEach((sec, si) => {
      sec.topics.forEach((_, ti) => {
        if (completedTopics[`${phaseIdx}-${si}-${ti}`]) count++;
      });
    });
    return count;
  };

  const getPhaseTotalCount = (phaseIdx: number): number =>
    ROADMAP[phaseIdx].sections.reduce((s, sec) => s + sec.topics.length, 0);

  // ── Filtering ──
  const filtered: Phase[] = useMemo(() => {
    let result = ROADMAP.map((phase, phaseIdx) => ({
      ...phase,
      sections: phase.sections
        .map((sec, si) => ({
          ...sec,
          topics: sec.topics.filter((t, ti) => {
            const tKey = `${phaseIdx}-${si}-${ti}`;
            // Search filter
            if (
              search.trim() &&
              !t.toLowerCase().includes(search.toLowerCase())
            )
              return false;
            // Status filter
            if (filter === "completed" && !completedTopics[tKey]) return false;
            if (filter === "incomplete" && completedTopics[tKey]) return false;
            return true;
          }),
        }))
        .filter((sec) => sec.topics.length > 0),
    })).filter((p) => p.sections.length > 0);

    // If focus phase is set, move it to top
    if (focusPhase !== null) {
      const focusIdx = result.findIndex(
        (p) => p.phase === ROADMAP[focusPhase]?.phase
      );
      if (focusIdx > 0) {
        const [focused] = result.splice(focusIdx, 1);
        result = [focused, ...result];
      }
    }

    return result;
  }, [search, filter, completedTopics, focusPhase]);

  // ── Button Style Helper ──
  const pillStyle = (
    active: boolean
  ): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: "20px",
    border: `1px solid ${active ? "#f0c040" : t.border}`,
    background: active ? "rgba(240,192,64,0.15)" : "transparent",
    color: active ? "#f0c040" : t.textMuted,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.2s ease",
    fontFamily: "'JetBrains Mono', monospace",
  });

  const iconBtnStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "10px",
    border: `1px solid ${t.border}`,
    background: "transparent",
    color: t.textMuted,
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 500,
  };

  return (
    <div
      ref={containerRef}
      className="main-container"
      style={{
        fontFamily: "'Instrument Sans', 'DM Sans', 'Segoe UI', sans-serif",
        background: t.bg,
        color: t.text,
        minHeight: "100vh",
        padding: "0",
        transition: "background 0.4s ease, color 0.3s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 
          0%, 100% { opacity: 0.4; } 
          50% { opacity: 1; } 
        }
        .phase-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .phase-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .topic-row { transition: all 0.2s ease; }
        .topic-row:hover { background: ${theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}; }
        .check-box { transition: all 0.2s ease; cursor: pointer; }
        .check-box:hover { transform: scale(1.15); }
        .section-header { cursor: pointer; transition: all 0.2s ease; }
        .section-header:hover { background: ${theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}; }
        .search-input:focus { outline: none; border-color: #f0c040; box-shadow: 0 0 0 3px rgba(240,192,64,0.15); }
        .stat-chip { backdrop-filter: blur(12px); }
        .action-btn:hover { background: ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} !important; border-color: #f0c040 !important; color: #f0c040 !important; }
        .note-area:focus { outline: none; border-color: #f0c040; box-shadow: 0 0 0 2px rgba(240,192,64,0.15); }
        .difficulty-btn { transition: all 0.15s ease; }
        .difficulty-btn:hover { transform: scale(1.2); }
        .focus-star { transition: all 0.2s ease; cursor: pointer; }
        .focus-star:hover { transform: scale(1.3); }
        .filter-pill { transition: all 0.2s ease; }
        .filter-pill:hover { border-color: #f0c040 !important; color: #f0c040 !important; }
        
        .phase-content.collapsed, .section-content.collapsed { display: none; }
        .phase-content.expanded, .section-content.expanded { display: block; }
        
        @media print {
          .main-container { background: #fff !important; color: #000 !important; min-height: auto !important; }
          .phase-card { 
            background: #fff !important; 
            border: 2px solid #eee !important; 
            box-shadow: none !important; 
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-bottom: 24px !important;
          }
          .phase-content, .section-content { display: block !important; }
          .print-section { 
            break-inside: avoid !important; 
            page-break-inside: avoid !important; 
            padding-bottom: 10px !important;
          }
          .topic-row { break-inside: avoid !important; }
          .no-print { display: none !important; }
          
          /* Override light/dark texts strictly for print to ensure legibility */
          .print-text-dark { color: #111 !important; }
          .print-bg-light { background: #fafafa !important; }
        }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          position: "relative",
          padding: "32px 24px 24px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(240,192,64,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(64,160,240,0.06) 0%, transparent 50%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Top Actions Bar */}
          <div
            className="no-print"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              className="action-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={iconBtnStyle}
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              className="action-btn"
              onClick={() => setShowPomodoro(!showPomodoro)}
              style={{
                ...iconBtnStyle,
                color: pomodoro.isRunning ? "#f0c040" : t.textMuted,
                borderColor: pomodoro.isRunning
                  ? "rgba(240,192,64,0.4)"
                  : t.border,
              }}
              title="Pomodoro timer"
            >
              🍅{" "}
              {pomodoro.isRunning
                ? formatTime(pomodoro.timeLeft)
                : "Timer"}
            </button>
            <button
              className="action-btn"
              onClick={exportData}
              style={iconBtnStyle}
              title="Export progress"
            >
              📥 Export
            </button>
            <button
              className="action-btn"
              onClick={() => fileInputRef.current?.click()}
              style={iconBtnStyle}
              title="Import progress"
            >
              📤 Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importData}
              style={{ display: "none" }}
            />
          </div>

          {/* Pomodoro Panel */}
          {showPomodoro && (
            <div
              className="no-print"
              style={{
                background: t.cardExpanded,
                border: `1px solid ${pomodoro.isBreak ? "rgba(76,175,80,0.4)" : "rgba(240,192,64,0.3)"}`,
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
                maxWidth: "400px",
                marginInline: "auto",
                animation: "fadeSlideIn 0.3s ease",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: pomodoro.isBreak ? "#4caf50" : "#f0c040",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                {pomodoro.isBreak ? "☕ Break Time" : "🔥 Focus Time"}
              </div>
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: pomodoro.isBreak ? "#4caf50" : "#f0c040",
                  letterSpacing: "2px",
                  lineHeight: 1.2,
                }}
              >
                {formatTime(pomodoro.timeLeft)}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  marginTop: "14px",
                }}
              >
                {!pomodoro.isRunning ? (
                  <button
                    onClick={pomodoro.start}
                    style={{
                      ...iconBtnStyle,
                      background: "rgba(240,192,64,0.15)",
                      borderColor: "rgba(240,192,64,0.4)",
                      color: "#f0c040",
                    }}
                  >
                    ▶ Start
                  </button>
                ) : (
                  <button
                    onClick={pomodoro.pause}
                    style={{
                      ...iconBtnStyle,
                      background: "rgba(255,152,0,0.15)",
                      borderColor: "rgba(255,152,0,0.4)",
                      color: "#ff9800",
                    }}
                  >
                    ⏸ Pause
                  </button>
                )}
                <button
                  onClick={pomodoro.reset}
                  style={iconBtnStyle}
                >
                  ↺ Reset
                </button>
                <button
                  onClick={pomodoro.skip}
                  style={iconBtnStyle}
                >
                  ⏭ Skip
                </button>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: t.textMuted,
                  marginTop: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Sessions completed: {pomodoro.sessionsCompleted}
              </div>
            </div>
          )}

          {/* Title */}
          <div
            style={{
              display: "inline-block",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#f0c040",
              marginBottom: "12px",
              padding: "4px 14px",
              border: "1px solid rgba(240,192,64,0.3)",
              borderRadius: "20px",
            }}
          >
            {totalTopics} topics • 15 phases
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-1px",
              background:
                "linear-gradient(135deg, #f0c040 0%, #ff6b6b 50%, #4ecdc4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.15,
            }}
          >
            JavaScript Roadmap
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: t.textMuted,
              marginTop: "10px",
              maxWidth: "500px",
              marginInline: "auto",
              lineHeight: 1.5,
            }}
          >
            From first{" "}
            <code
              style={{
                color: "#f0c040",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "13px",
              }}
            >
              console.log()
            </code>{" "}
            to production-grade architecture
          </p>
        </div>
      </div>

      {/* STATS + SEARCH + FILTERS */}
      <div
        style={{ maxWidth: "900px", margin: "0 auto", padding: "0 20px 12px" }}
      >
        {/* Stats Panel */}
        <div
          className="no-print"
          onClick={() => setShowStats(!showStats)}
          style={{
            padding: "12px 18px",
            background: t.card,
            borderRadius: "14px",
            border: `1px solid ${t.border}`,
            marginBottom: "12px",
            cursor: "pointer",
            userSelect: "none",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* Progress circle */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: `conic-gradient(#f0c040 ${progress * 3.6}deg, ${t.progressBg} 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: t.innerBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#f0c040",
                }}
              >
                {progress}%
              </div>
            </div>

            {/* Stats chips */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", flex: 1 }}>
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: t.text,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {completedCount}
                  <span style={{ color: t.textDim, fontWeight: 400 }}>
                    /{totalTopics}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: t.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  completed
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: streak > 0 ? "#ff6b6b" : t.textDim,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {streak} 🔥
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: t.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  day streak
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: todayCount > 0 ? "#4ecdc4" : t.textDim,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {todayCount}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: t.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  today
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: "12px",
                color: t.textDim,
                transition: "transform 0.3s ease",
                transform: showStats ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ▶
            </span>
          </div>

          {/* Expanded stats: Phase-by-phase breakdown */}
          {showStats && (
            <div
              style={{
                marginTop: "14px",
                paddingTop: "14px",
                borderTop: `1px solid ${t.border}`,
                animation: "fadeSlideIn 0.3s ease",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: t.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  marginBottom: "10px",
                }}
              >
                Phase Progress
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "8px",
                }}
              >
                {ROADMAP.map((phase, pi) => {
                  const done = getPhaseCompletedCount(pi);
                  const total = getPhaseTotalCount(pi);
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div
                      key={pi}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: t.progressBg,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: 600, color: phase.accent }}>
                          {phase.icon} {phase.phase.replace("Phase ", "P")}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "'JetBrains Mono', monospace",
                            color: t.textDim,
                          }}
                        >
                          {done}/{total}
                        </span>
                      </div>
                      <div
                        style={{
                          height: "3px",
                          background: t.border,
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: phase.accent,
                            borderRadius: "2px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Search + Filters */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Search */}
          <div style={{ flex: 1, minWidth: "180px", position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: t.textDim,
                fontSize: "16px",
              }}
            >
              ⌕
            </span>
            <input
              className="search-input"
              type="text"
              placeholder="Search topics…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              style={{
                width: "100%",
                padding: "10px 14px 10px 40px",
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: "12px",
                color: t.text,
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "6px" }}>
            {(["all", "incomplete", "completed"] as FilterMode[]).map((f) => (
              <button
                key={f}
                className="filter-pill"
                onClick={() => setFilter(f)}
                style={pillStyle(filter === f)}
              >
                {f === "all" ? "All" : f === "incomplete" ? "Todo" : "Done"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PHASE CARDS */}
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "12px 20px 60px",
        }}
      >
        {filtered.map((phase) => {
          const realPhaseIdx = ROADMAP.findIndex(
            (p) => p.phase === phase.phase
          );
          const isExpanded = expandedPhase === realPhaseIdx;
          const isFocused = focusPhase === realPhaseIdx;
          const pDone = getPhaseCompletedCount(realPhaseIdx);
          const pTotal = getPhaseTotalCount(realPhaseIdx);
          const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

          return (
            <div
              key={phase.phase}
              className={`phase-card ${printingPhase !== null && printingPhase !== realPhaseIdx ? 'no-print' : ''}`}
              style={{
                marginBottom: "10px",
                borderRadius: "16px",
                overflow: "hidden",
                background: isExpanded ? t.cardExpanded : t.card,
                border: `1px solid ${
                  isFocused
                    ? "rgba(240,192,64,0.4)"
                    : isExpanded
                      ? phase.accent + "44"
                      : t.border
                }`,
                ...(isFocused
                  ? { boxShadow: "0 0 0 1px rgba(240,192,64,0.2)" }
                  : {}),
              }}
            >
              {/* Phase Header */}
              <div
                style={{
                  padding: "16px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  userSelect: "none",
                }}
              >
                {/* Focus star */}
                <span
                  className="focus-star no-print"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFocus(realPhaseIdx);
                  }}
                  style={{
                    fontSize: "16px",
                    flexShrink: 0,
                    opacity: isFocused ? 1 : 0.3,
                    filter: isFocused ? "none" : "grayscale(1)",
                  }}
                  title={
                    isFocused ? "Unpin focus phase" : "Pin as focus phase"
                  }
                >
                  ⭐
                </span>

                <span
                  style={{ fontSize: "24px", flexShrink: 0, cursor: "pointer" }}
                  onClick={() => togglePhase(realPhaseIdx)}
                >
                  {phase.icon}
                </span>

                <div
                  style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  onClick={() => togglePhase(realPhaseIdx)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        color: phase.accent,
                        fontWeight: 600,
                      }}
                    >
                      {phase.phase}
                    </span>
                    <h2
                      className="print-text-dark"
                      style={{
                        fontSize: "17px",
                        fontWeight: 600,
                        color: theme === "dark" ? "#f0f0f0" : "#1a1a2e",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {phase.title}
                    </h2>
                    {isFocused && (
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: "rgba(240,192,64,0.15)",
                          color: "#f0c040",
                          fontWeight: 600,
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                        }}
                      >
                        Focus
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      height: "3px",
                      background: t.progressBg,
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pPct}%`,
                        background: phase.accent,
                        borderRadius: "2px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <button
                    className="no-print action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintPhase(realPhaseIdx);
                    }}
                    style={{
                      background: "none",
                      border: `1px solid ${t.border}`,
                      color: t.textMuted,
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      cursor: "pointer",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    title="Download Phase as PDF"
                  >
                    📄 PDF
                  </button>
                  <span
                    onClick={() => togglePhase(realPhaseIdx)}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      color: t.textMuted,
                      cursor: "pointer",
                    }}
                  >
                    {pDone}/{pTotal}
                  </span>
                </div>
                <span
                  onClick={() => togglePhase(realPhaseIdx)}
                  style={{
                    fontSize: "14px",
                    color: t.textDim,
                    transition: "transform 0.3s ease",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  ▶
                </span>
              </div>

              {/* Phase Content */}
              <div
                className={`phase-content ${isExpanded ? 'expanded' : 'collapsed'}`}
                style={{
                  padding: "0 20px 20px",
                  animation: isExpanded ? "fadeSlideIn 0.3s ease" : "none",
                }}
              >
                {phase.sections.map((sec, si) => {
                    const realSi = ROADMAP[realPhaseIdx].sections.findIndex(
                      (s) => s.name === sec.name
                    );
                    const sKey = `${realPhaseIdx}-${realSi}`;
                    const isSecExpanded =
                      expandedSections[sKey] !== undefined
                        ? expandedSections[sKey]
                        : true;

                    return (
                      <div key={si} className="print-section" style={{ marginBottom: "6px" }}>
                        <div
                          className="section-header"
                          onClick={() => toggleSection(sKey)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: t.textDim,
                              transition: "transform 0.2s ease",
                              transform: isSecExpanded
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                            }}
                          >
                            ▶
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: phase.accent,
                              letterSpacing: "-0.2px",
                            }}
                          >
                            {sec.name}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              color: t.textDim,
                              fontFamily: "'JetBrains Mono', monospace",
                              marginLeft: "auto",
                            }}
                          >
                            {sec.topics.length} topics
                          </span>
                        </div>

                        <div
                          className={`section-content ${isSecExpanded ? 'expanded' : 'collapsed'}`}
                          style={{
                            paddingLeft: "12px",
                            animation: isSecExpanded ? "fadeSlideIn 0.25s ease" : "none",
                          }}
                        >
                          {sec.topics.map((topic, ti) => {
                              // Find the real topic index in the original data
                              const origSection =
                                ROADMAP[realPhaseIdx].sections[realSi];
                              const realTi = origSection.topics.indexOf(topic);
                              const tKey = `${realPhaseIdx}-${realSi}-${realTi}`;
                              const isDone = !!completedTopics[tKey];
                              const topicDifficulty = difficulty[tKey];
                              const hasNote = !!notes[tKey];
                              const isNoteOpen = showNoteFor === tKey;

                              return (
                                <div key={ti}>
                                  <div
                                    className="topic-row"
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: "10px",
                                      padding: "7px 12px",
                                      borderRadius: "8px",
                                      cursor: "pointer",
                                      userSelect: "none",
                                    }}
                                  >
                                    {/* Checkbox */}
                                    <div
                                      className="check-box"
                                      onClick={() => toggleTopic(tKey)}
                                      style={{
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "5px",
                                        border: isDone
                                          ? `2px solid ${phase.accent}`
                                          : `2px solid ${theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"}`,
                                        background: isDone
                                          ? phase.accent
                                          : "transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        marginTop: "1px",
                                        fontSize: "11px",
                                        color: "#fff",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {isDone && "✓"}
                                    </div>

                                    {/* Topic text */}
                                    <span
                                      className="print-text-dark"
                                      onClick={() => toggleTopic(tKey)}
                                      style={{
                                        fontSize: "13px",
                                        lineHeight: 1.45,
                                        color: isDone
                                          ? t.textDim
                                          : theme === "dark"
                                            ? "#ccc"
                                            : "#333",
                                        textDecoration: isDone
                                          ? "line-through"
                                          : "none",
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontWeight: 400,
                                        letterSpacing: "-0.2px",
                                        flex: 1,
                                      }}
                                    >
                                      {topic}
                                    </span>

                                    {/* Difficulty badge */}
                                    <span
                                      className="difficulty-btn no-print"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cycleDifficulty(tKey);
                                      }}
                                      style={{
                                        fontSize: "12px",
                                        flexShrink: 0,
                                        cursor: "pointer",
                                        opacity: topicDifficulty ? 1 : 0.3,
                                        minWidth: "22px",
                                        textAlign: "center",
                                      }}
                                      title={
                                        topicDifficulty
                                          ? `Difficulty: ${DIFFICULTY_CONFIG[topicDifficulty].label} (click to cycle)`
                                          : "Set difficulty"
                                      }
                                    >
                                      {topicDifficulty
                                        ? DIFFICULTY_CONFIG[topicDifficulty]
                                            .emoji
                                        : "⚪"}
                                    </span>

                                    {/* Note toggle */}
                                    <span
                                      className="no-print"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNote(tKey);
                                      }}
                                      style={{
                                        fontSize: "13px",
                                        flexShrink: 0,
                                        cursor: "pointer",
                                        opacity: hasNote || isNoteOpen ? 1 : 0.3,
                                        transition: "opacity 0.2s ease",
                                      }}
                                      title={
                                        hasNote
                                          ? "Edit note"
                                          : "Add note"
                                      }
                                    >
                                      📝
                                    </span>
                                  </div>

                                  {/* Note textarea */}
                                  {isNoteOpen && (
                                    <div
                                      style={{
                                        paddingLeft: "40px",
                                        paddingRight: "12px",
                                        paddingBottom: "8px",
                                        animation: "fadeSlideIn 0.2s ease",
                                      }}
                                    >
                                      <textarea
                                        className="note-area"
                                        value={notes[tKey] || ""}
                                        onChange={(e) =>
                                          updateNote(tKey, e.target.value)
                                        }
                                        placeholder="Add your notes, code snippets, key takeaways…"
                                        style={{
                                          width: "100%",
                                          minHeight: "72px",
                                          padding: "10px 12px",
                                          background: t.inputBg,
                                          border: `1px solid ${t.inputBorder}`,
                                          borderRadius: "8px",
                                          color: t.text,
                                          fontSize: "12px",
                                          fontFamily:
                                            "'JetBrains Mono', monospace",
                                          resize: "vertical",
                                          lineHeight: 1.5,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: t.textDim,
              fontSize: "15px",
            }}
          >
            No topics found
            {search && (
              <>
                {" "}
                for &ldquo;
                <span style={{ color: "#f0c040" }}>{search}</span>&rdquo;
              </>
            )}
            {filter !== "all" && (
              <>
                {" "}
                with filter &ldquo;
                <span style={{ color: "#f0c040" }}>{filter}</span>&rdquo;
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
