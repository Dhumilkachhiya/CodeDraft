import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ExampleRow from "../components/problem-editor/ExampleRow";
import TestCaseRow from "../components/problem-editor/TestCaseRow";
import CodeEditor from "../components/ui/CodeEditor";
import { roomAPI, userAPI } from "../services/api";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { motion, AnimatePresence } from "framer-motion";
import AICodeConverter from "../components/ui/AICodeConverter";
import { useAuth } from "../context/AuthContext";

const STARTER_CODES = {
  javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();

// Solve the challenge here and print the result!
console.log(input);`,

  python: `import sys
input_data = sys.stdin.read().strip()

# Solve the challenge here and print the result!
print(input_data)`,

  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string input_data;
    if (getline(cin, input_data)) {
        // Solve the challenge here and print the result!
        cout << input_data << endl;
    }
    return 0;
}`,

  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line;
        if ((line = br.readLine()) != null) {
            // Solve the challenge here and print the result!
            System.out.println(line);
        }
    }
}`,

  go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        line := scanner.Text()
        // Solve the challenge here and print the result!
        fmt.Println(line)
    }
}`,

  rust: `use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    if let Some(Ok(line)) = stdin.lock().lines().next() {
        // Solve the challenge here and print the result!
        println!("{}", line);
    }
}`,

  c: `#include <stdio.h>
#include <string.h>

int main() {
    char buffer[1024];
    if (fgets(buffer, sizeof(buffer), stdin)) {
        // Solve the challenge here and print the result!
        printf("%s", buffer);
    }
    return 0;
}`,
};

/* ───── tiny icon components ───── */
const IconChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

/* ───── step progress indicator ───── */
function StepIndicator({ step, label, active }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold font-mono transition-all duration-300 ${
          active
            ? "bg-primary text-white shadow-[0_0_12px_rgba(52,211,153,0.4)]"
            : "bg-bg-elevated text-text-muted border border-border-default"
        }`}
      >
        {step}
      </span>
      <span
        className={`text-[11px] font-semibold tracking-wide uppercase transition-colors duration-300 ${
          active ? "text-text-primary" : "text-text-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ───── section divider with title ───── */
function SectionHeader({ icon, title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <span className="text-primary text-sm">{icon}</span>
          <h3 className="text-[13px] font-bold text-text-primary tracking-tight">{title}</h3>
        </div>
        {children}
      </div>
      {subtitle && (
        <p className="text-[11px] text-text-muted ml-[26px]">{subtitle}</p>
      )}
    </div>
  );
}

function ProblemEditor() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [timeLimit, setTimeLimit] = useState(10);
  const [extraFiveMin, setExtraFiveMin] = useState(false);
  const [allowedLanguages, setAllowedLanguages] = useState(["javascript", "python", "cpp"]);
  const [activeLanguage, setActiveLanguage] = useState("javascript");
  const [referenceSolution, setReferenceSolution] = useState(STARTER_CODES.javascript);

  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);

  const handleGenerateSolutionWithAI = async () => {
    if (!title.trim() || !statement.trim()) {
      toast.error("Please fill in the Challenge Title and Problem Statement first.");
      return;
    }
    setIsGeneratingSolution(true);
    const toastId = toast.loading("Generating using AI...");
    try {
      const res = await userAPI.generateSolution({
        title,
        statement,
        language: activeLanguage
      });
      const solution = res.data?.solution || res.solution || "";
      if (!solution) {
        throw new Error("AI returned an empty solution.");
      }
      setReferenceSolution(solution);
      setIsValidated(false);
      setValidationResults([]);
      toast.success("AI generated Reference Solution successfully!", { id: toastId });
    } catch (err) {
      toast.error(`Failed to generate solution: ${err.message || "Unknown error"}`, { id: toastId });
    } finally {
      setIsGeneratingSolution(false);
    }
  };

  const [visibleExamples, setVisibleExamples] = useState([
    { input: "", output: "", explanation: "" },
  ]);
  const [hiddenTestCases, setHiddenTestCases] = useState([
    { input: "", expectedOutput: "" },
    { input: "", expectedOutput: "" },
    { input: "", expectedOutput: "" },
    { input: "", expectedOutput: "" },
  ]);

  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [room, setRoom] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isLowTime, setIsLowTime] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const socket = useSocket();
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [mobileTab, setMobileTab] = useState("define");
  const [lastWarnedLang, setLastWarnedLang] = useState(null);
  const hasLoadedProblem = useRef(false);

  /* ─── Fetch Room Details on Mount ─── */
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await roomAPI.getRoomDetails(roomId);
        setRoom(response.data);
      } catch (err) {
        toast.error(err.message || "Failed to load room details");
      }
    };
    fetchRoom();
  }, [roomId]);

  /* ─── Populate Form from Existing Problem ─── */
  useEffect(() => {
    if (!room || !room.problem || hasLoadedProblem.current) return;
    const prob = room.problem;
    if (prob.title) setTitle(prob.title);
    if (prob.statement) setStatement(prob.statement);
    if (prob.difficulty) setDifficulty(prob.difficulty);
    if (prob.timeLimit) {
      const defaultLimit = prob.difficulty === "easy" ? 10 : prob.difficulty === "medium" ? 20 : 30;
      if (prob.timeLimit > defaultLimit) {
        setTimeLimit(defaultLimit);
        setExtraFiveMin(true);
      } else {
        setTimeLimit(prob.timeLimit);
        setExtraFiveMin(false);
      }
    }
    if (prob.allowedLanguages?.length > 0) setAllowedLanguages(prob.allowedLanguages);
    if (prob.visibleExamples?.length > 0) setVisibleExamples(prob.visibleExamples);
    if (prob.hiddenTestCases?.length > 0) setHiddenTestCases(prob.hiddenTestCases);
    hasLoadedProblem.current = true;
  }, [room]);

  /* ─── Socket Room Listeners & Countdown/Ready redirection ─── */
  useEffect(() => {
    if (!socket) return;

    socket.emit("room:join", { roomId });

    socket.on("room:timerStarted", ({ setupExpiresAt }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, setupExpiresAt };
      });
      toast.success("All players joined! The framing clock has started!");
    });

    socket.on("room:countdown", ({ count }) => {
      setCountdown(count);
    });

    socket.on("room:ready", ({ problem }) => {
      setCountdown(null);
      toast.success("Battle started! Releasing problem statement...");
      navigate(`/room/${roomId}/battle`, { state: { problem } });
    });

    socket.on("room:playerJoined", ({ player, currentPlayers, teamA, teamB }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, players: currentPlayers, teamA, teamB };
      });
    });

    socket.on("room:teamUpdated", ({ teamA, teamB, players: ps }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, teamA, teamB, players: ps };
      });
    });

    socket.on("room:languageUpdated", ({ userId: uId, language, playerLanguages }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, playerLanguages };
      });
    });

    return () => {
      socket.off("room:timerStarted");
      socket.off("room:countdown");
      socket.off("room:ready");
      socket.off("room:playerJoined");
      socket.off("room:teamUpdated");
      socket.off("room:languageUpdated");
    };
  }, [socket, roomId, navigate]);

  /* ─── Opponent Language Matching Popup ─── */
  useEffect(() => {
    if (!room || !user) return;
    const opponent = room.players?.find((p) => {
      const pId = p._id || p;
      return pId.toString() !== user._id?.toString();
    });
    if (!opponent) return;

    const opponentId = opponent._id || opponent;
    const opponentLang = room.playerLanguages?.[opponentId];
    if (opponentLang && opponentLang !== activeLanguage && opponentLang !== lastWarnedLang) {
      toast((t) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontWeight: 700, color: "#f4f7fb" }}>✨ Language Match Recommendation</div>
          <div style={{ fontSize: "12px", color: "#a8b3c3", lineHeight: 1.4 }}>
            Please use our AI helper to convert your code to <strong>{opponent.username || "B"}'s</strong> selected language (<strong>{opponentLang.toUpperCase()}</strong>).
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                setShowAiHelper(true);
              }}
              style={{
                background: "linear-gradient(135deg,#34d399,#6ee7b7)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Use AI Helper
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{
                background: "transparent",
                border: "1px solid #27313d",
                color: "#a8b3c3",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Ignore
            </button>
          </div>
        </div>
      ), { duration: 10000, id: `lang-warn-${opponentLang}` });
      setLastWarnedLang(opponentLang);
    }
  }, [room, user, activeLanguage, lastWarnedLang]);

  /* ─── Timer countdown calculation ─── */
  useEffect(() => {
    if (!room || !room.setupExpiresAt) return;

    const checkTime = () => {
      const expiry = new Date(room.setupExpiresAt).getTime();
      const diff = expiry - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        setIsLowTime(true);
        return false;
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
        setIsLowTime(diff < 10 * 60 * 1000);
        return true;
      }
    };

    checkTime();
    const interval = setInterval(() => {
      const active = checkTime();
      if (!active) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room]);

  useEffect(() => {
    setReferenceSolution(STARTER_CODES[activeLanguage] || "");
  }, [activeLanguage]);

  const handleExampleChange = (index, updatedExample) => {
    const updated = [...visibleExamples];
    updated[index] = updatedExample;
    setVisibleExamples(updated);
  };

  const handleAddExample = () => {
    setVisibleExamples([
      ...visibleExamples,
      { input: "", output: "", explanation: "" },
    ]);
  };

  const handleRemoveExample = (index) => {
    if (visibleExamples.length > 1) {
      const updated = visibleExamples.filter((_, i) => i !== index);
      setVisibleExamples(updated);
    }
  };

  const handleTestCaseChange = (index, updatedTestCase) => {
    const updated = [...hiddenTestCases];
    updated[index] = updatedTestCase;
    setHiddenTestCases(updated);
    setIsValidated(false);
    setValidationResults([]);
  };

  const handleAddTestCase = () => {
    setHiddenTestCases([
      ...hiddenTestCases,
      { input: "", expectedOutput: "" },
    ]);
    setIsValidated(false);
    setValidationResults([]);
  };

  const handleRemoveTestCase = (index) => {
    if (hiddenTestCases.length > 4) {
      const updated = hiddenTestCases.filter((_, i) => i !== index);
      setHiddenTestCases(updated);
      setIsValidated(false);
      setValidationResults([]);
    } else {
      toast.error("A minimum of 4 hidden test cases is required");
    }
  };

  const handleLanguageToggle = (lang) => {
    if (allowedLanguages.includes(lang)) {
      if (allowedLanguages.length > 1) {
        setAllowedLanguages(allowedLanguages.filter((l) => l !== lang));
        if (activeLanguage === lang) {
          const nextLang = allowedLanguages.find((l) => l !== lang);
          setActiveLanguage(nextLang);
        }
      } else {
        toast.error("At least one language must be allowed");
      }
    } else {
      setAllowedLanguages([...allowedLanguages, lang]);
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!title.trim()) errors.push("Problem Title is required.");
    if (!statement.trim()) errors.push("Problem Statement details are required.");
    
    const hasValidVisibleExample = visibleExamples.some(ex => ex.input.trim() && ex.output.trim());
    if (!hasValidVisibleExample) {
      errors.push("At least 1 visible Example with complete input/output is required.");
    }

    if (hiddenTestCases.length < 4) {
      errors.push(`A minimum of 4 test cases is required (currently have ${hiddenTestCases.length}).`);
    }

    const incompleteTestCases = hiddenTestCases.some(
      (tc) => !tc.input.trim() || !tc.expectedOutput.trim()
    );
    if (incompleteTestCases) {
      errors.push("All defined test cases must have complete input and expected output.");
    }

    return errors;
  };

  const validationErrors = validateForm();
  const isFormValid = validationErrors.length === 0;

  const handleValidateReferenceSolution = async () => {
    if (!isFormValid) {
      validationErrors.forEach((err) => toast.error(err));
      return;
    }
    setIsValidating(true);
    setValidationResults([]);
    setIsValidated(false);

    try {
      const results = await roomAPI.validateProblem(roomId, {
        sourceCode: referenceSolution,
        language: activeLanguage,
        testCases: hiddenTestCases,
      });

      setValidationResults(results.data);
      setIsValidated(true);

      const allPassed = results.data.every((r) => r.passed);
      if (allPassed) {
        toast.success("Validation successful! All test cases passed!");
      } else {
        toast.error("Validation failed. Some test cases returned errors or mismatched output.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to validate code execution");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmitProblem = async () => {
    const allPassed = validationResults.length > 0 && validationResults.every((r) => r.passed);
    if (!isFormValid || !isValidated || !allPassed) return;

    setIsSubmitting(true);
    try {
      await roomAPI.submitProblem(roomId, {
        title,
        statement,
        visibleExamples: visibleExamples.filter(ex => ex.input.trim() && ex.output.trim()),
        hiddenTestCases,
        timeLimit: timeLimit + (extraFiveMin ? 5 : 0),
        difficulty,
        allowedLanguages,
        referenceSolution,
      });

      toast.success("Challenge successfully activated! Returning to lobby.");
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast.error(err.message || "Failed to submit challenge and create room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPassed = validationResults.length > 0 && validationResults.every((r) => r.passed);

  /* ────────────────────────────────────────────────────────────── */
  /*  RENDER                                                      */
  /* ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-height-100vh flex flex-col bg-bg-primary font-sans text-text-primary">
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(5,5,8,0.97)",
              backdropFilter: "blur(20px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.3em",
                  color: "#34d399",
                  textTransform: "uppercase",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                INITIALIZING BATTLE
              </span>
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  border: "3px solid #34d399",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(17,17,24,0.9)",
                  boxShadow: "0 0 60px rgba(52,211,153,0.4)",
                }}
              >
                <span
                  style={{
                    fontSize: 72,
                    fontWeight: 900,
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#f4f7fb",
                    textShadow: "0 0 20px rgba(245,158,11,0.5)",
                  }}
                >
                  {countdown}
                </span>
              </motion.div>
              <span
                style={{
                  fontSize: 10,
                  color: "#687386",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontFamily: "monospace",
                }}
              >
                Loading battle core...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <header className="border-b border-border-default bg-bg-surface/80 backdrop-blur-xl px-8 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors duration-200 text-[13px] font-medium"
          >
            <IconChevronLeft />
            Dashboard
          </button>
          <div className="h-5 w-px bg-border-default" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[12px] font-semibold text-text-secondary tracking-wider uppercase font-mono">
              {roomId}
            </span>
          </div>
        </div>

        {/* Step progress */}
        <div className="hidden md:flex items-center gap-6">
          <StepIndicator step="1" label="Define" active={true} />
          <div className="w-8 h-px bg-border-default" />
          <StepIndicator step="2" label="Validate" active={isFormValid} />
          <div className="w-8 h-px bg-border-default" />
          <StepIndicator step="3" label="Activate" active={allPassed} />
        </div>

        <div className="flex items-center gap-3 pr-2">
          {room && room.setupExpiresAt ? (
            isLowTime ? (
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/40 text-[11px] font-bold text-red-500 font-mono tracking-wide uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(251,113,133,0.25)] animate-[pulse_1s_infinite]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                ⏳ {timeLeft || "30:00"} Left
              </div>
            ) : (
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/15 to-amber-600/15 border border-amber-500/30 text-[11px] font-bold text-amber-500 font-mono tracking-wide uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                ⏳ {timeLeft || "30:00"} Left
              </div>
            )
          ) : (
            <div className="px-4 py-2 rounded-full bg-gradient-to-r from-primary/15 to-secondary/15 border border-primary/30 text-[11px] font-bold text-primary font-mono tracking-wide uppercase flex items-center gap-2 animate-pulse-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Lobby Setup
            </div>
          )}
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="mobile-tab-switch-container">
        <button
          className={`mobile-tab-button ${mobileTab === "define" ? "active" : ""}`}
          onClick={() => setMobileTab("define")}
        >
          Define Challenge
        </button>
        <button
          className={`mobile-tab-button ${mobileTab === "preview" ? "active" : ""}`}
          onClick={() => setMobileTab("preview")}
        >
          Live Preview
        </button>
      </div>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] overflow-hidden h-[calc(100vh-57px)] mobile-responsive-height">

        {/* ═══════ LEFT PANEL — FORM ═══════ */}
        <section className={`overflow-y-auto border-r border-border-default pe-scrollbar ${mobileTab === "define" ? "mobile-show-pane" : "mobile-hide-pane"}`}>
          <div className="p-8 flex flex-col gap-8 max-w-[680px]">

            {/* Page heading */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-text-primary leading-none">
                  Create Coding Challenge
                </h1>
                <p className="text-[13px] text-text-muted leading-relaxed">
                  Define the problem statement, examples, and hidden test cases that opponents will battle against.
                </p>
              </div>

            </div>

            {/* ── Challenge Meta ── */}
            <div className="flex flex-col gap-5">
              <SectionHeader icon="📝" title="Challenge Details" />

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Challenge Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Two Sum"
                  className="w-full bg-bg-surface border border-border-default rounded-xl px-4 py-3 text-[15px] text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-bg-surface transition-all duration-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => {
                      const d = e.target.value;
                      setDifficulty(d);
                      setExtraFiveMin(false);
                      if (d === "easy") setTimeLimit(10);
                      else if (d === "medium") setTimeLimit(20);
                      else if (d === "hard") setTimeLimit(30);
                    }}
                    className="w-full bg-bg-surface border border-border-default rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                    }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                    Time Limit
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="w-full bg-bg-surface border border-border-default rounded-xl px-3 py-3 text-sm text-text-primary font-semibold flex items-center gap-2">
                      <span className="text-primary text-base">⏱</span>
                      <span>
                        {timeLimit + (extraFiveMin ? 5 : 0)} mins
                      </span>
                      <span className="text-text-muted text-xs font-normal ml-1">
                        ({difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : "Hard"} default)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExtraFiveMin((v) => !v)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all duration-200 ${
                        extraFiveMin
                          ? "bg-secondary/15 border-secondary/50 text-secondary"
                          : "bg-bg-surface border-border-default text-text-muted hover:border-border-hover"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border ${
                        extraFiveMin ? "bg-secondary border-secondary text-white" : "border-border-default"
                      }`}>
                        {extraFiveMin ? "✓" : ""}
                      </span>
                      +5 minutes extra
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Allowed Languages
                </label>
                 <div className="flex flex-wrap gap-2.5">
                  {[
                    { key: "javascript", label: "JavaScript", icon: "JS" },
                    { key: "python", label: "Python", icon: "PY" },
                    { key: "cpp", label: "C++", icon: "C++" },
                    { key: "java", label: "Java", icon: "JV" },
                    { key: "go", label: "Go", icon: "GO" },
                    { key: "rust", label: "Rust", icon: "RS" },
                    { key: "c", label: "C", icon: "C" },
                  ].map(({ key, label, icon }) => {
                    const isActive = allowedLanguages.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleLanguageToggle(key)}
                        className={`group/lang relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold tracking-wide border transition-all duration-200 ${
                          isActive
                            ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_16px_rgba(52,211,153,0.12)]"
                            : "bg-bg-surface border-border-default text-text-muted hover:border-border-hover hover:text-text-secondary"
                        }`}
                      >
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isActive ? "bg-primary/20 text-primary" : "bg-bg-elevated text-text-muted"
                        }`}>
                          {icon}
                        </span>
                        {label}
                        {isActive && (
                          <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

            {/* ── Problem Statement ── */}
            <div className="flex flex-col gap-3">
              <SectionHeader
                icon="📄"
                title="Problem Statement"
                subtitle="Describe the problem, constraints, and input/output formats. Markdown is supported."
              />
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Write the details of the problem here. Explain the constraints, input formats, and requirements..."
                rows="10"
                className="w-full bg-bg-surface border border-border-default rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono leading-relaxed resize-y"
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

            {/* ── Visible Examples ── */}
            <div className="flex flex-col gap-4">
              <SectionHeader
                icon="💡"
                title="Visible Example Cases"
                subtitle="These examples are shown to opponents during the battle."
              />

              <div className="flex flex-col gap-3">
                {visibleExamples.map((example, idx) => (
                  <ExampleRow
                    key={idx}
                    index={idx}
                    example={example}
                    onChange={handleExampleChange}
                    onRemove={handleRemoveExample}
                    canRemove={visibleExamples.length > 1}
                  />
                ))}
              </div>

              {/* Add button — dashed, full-width, at bottom */}
              <button
                type="button"
                onClick={handleAddExample}
                className="w-full py-3 rounded-xl border-2 border-dashed border-border-default bg-bg-surface/30 text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2 text-[12px] font-semibold tracking-wide group"
              >
                <span className="w-5 h-5 rounded-md bg-bg-elevated group-hover:bg-primary/15 flex items-center justify-center transition-colors duration-200">
                  <IconPlus />
                </span>
                Add Example
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

            {/* ── Hidden Test Cases ── */}
            <div className="flex flex-col gap-4">
              <SectionHeader
                icon="🔒"
                title="Hidden Test Cases"
                subtitle="Opponents run code against these. Minimum 4 required."
              >
                <span className="text-[10px] font-mono text-text-muted bg-bg-elevated px-2 py-1 rounded-md border border-border-default">
                  {hiddenTestCases.length} cases
                </span>
              </SectionHeader>

              <div className="flex flex-col gap-3">
                {hiddenTestCases.map((testCase, idx) => (
                  <TestCaseRow
                    key={idx}
                    index={idx}
                    testCase={testCase}
                    onChange={handleTestCaseChange}
                    onRemove={handleRemoveTestCase}
                    canRemove={hiddenTestCases.length > 4}
                  />
                ))}
              </div>

              {/* Add button — dashed, full-width, at bottom */}
              <button
                type="button"
                onClick={handleAddTestCase}
                className="w-full py-3 rounded-xl border-2 border-dashed border-border-default bg-bg-surface/30 text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2 text-[12px] font-semibold tracking-wide group"
              >
                <span className="w-5 h-5 rounded-md bg-bg-elevated group-hover:bg-primary/15 flex items-center justify-center transition-colors duration-200">
                  <IconPlus />
                </span>
                Add Test Case
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

            {/* ── Reference Solution ── */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <SectionHeader
                  icon="🧪"
                  title="Reference Solution Validator"
                  subtitle="Write code that passes 100% of your hidden test cases."
                />
                <div className="flex gap-1.5">
                  {allowedLanguages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLanguage(lang)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        activeLanguage === lang
                          ? "bg-secondary text-bg-primary shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                          : "bg-bg-surface border border-border-default text-text-muted hover:border-border-hover hover:text-text-secondary"
                      }`}
                    >
                      {lang === "cpp" ? "C++" : lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-border-default shadow-lg">
                <CodeEditor
                  value={referenceSolution}
                  onChange={setReferenceSolution}
                  language={activeLanguage}
                  height="300px"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleGenerateSolutionWithAI}
                  disabled={isGeneratingSolution || isValidating}
                  className={`py-3.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                    !isGeneratingSolution && !isValidating
                      ? "bg-gradient-to-r from-primary to-[#6ee7b7] text-white hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                      : "bg-bg-surface border border-border-default text-text-muted cursor-not-allowed"
                  }`}
                >
                  {isGeneratingSolution ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI Generating...
                    </>
                  ) : (
                    <>
                      ✨ AI Generate Solution
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleValidateReferenceSolution}
                  disabled={isValidating || isGeneratingSolution}
                  className={`py-3.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                    !isValidating && !isGeneratingSolution
                      ? "bg-bg-surface border border-primary text-primary hover:bg-primary hover:text-white active:scale-[0.99] cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.08)]"
                      : "bg-bg-surface border border-border-default text-text-muted cursor-not-allowed"
                  }`}
                >
                  {isValidating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Validating Execution Sandbox...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Validate Reference Solution
                  </>
                )}
              </button>
            </div>

              {/* Validation Results */}
              {isValidated && validationResults.length > 0 && (
                <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden animate-fade-in">
                  <div className="px-5 py-3 flex justify-between items-center border-b border-border-default bg-bg-elevated/50">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                      Execution Report
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        allPassed
                          ? "bg-success/15 text-success border border-success/30"
                          : "bg-error/15 text-error border border-error/30"
                      }`}
                    >
                      {allPassed
                        ? `✓ ${validationResults.length}/${validationResults.length} Passed`
                        : `✗ ${validationResults.filter(r => !r.passed).length} Failed`}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-2.5">
                    {validationResults.map((res, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2 font-mono text-xs transition-colors duration-200 ${
                          res.passed
                            ? "bg-success/5 border-success/20"
                            : "bg-error/5 border-error/20"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-text-secondary font-sans text-[12px] font-semibold">
                            Case #{idx + 1}
                          </span>
                          <span className={`text-[11px] font-bold ${res.passed ? "text-success" : "text-error"}`}>
                            {res.passed ? "✓ PASS" : "✗ FAIL"}
                          </span>
                        </div>
                        {res.error ? (
                          <div className="text-error bg-error/10 p-2.5 rounded-lg border border-error/20 overflow-x-auto whitespace-pre-wrap text-[11px]">
                            {res.error}
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3 border-t border-border-default pt-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-sans">Expected</span>
                                <span className="bg-bg-primary px-2.5 py-1.5 rounded-lg truncate text-text-secondary text-[11px]">
                                  {res.expectedOutput || <span className="italic text-text-muted">none</span>}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-sans">Actual</span>
                                <span className="bg-bg-primary px-2.5 py-1.5 rounded-lg truncate text-text-secondary text-[11px]">
                                  {res.output || <span className="italic text-text-muted">none</span>}
                                </span>
                              </div>
                            </div>
                            <div className="text-[10px] text-text-muted text-right font-sans">
                              ⏱ {res.executionTime}ms
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

            {/* ── Submit ── */}
            <div className="flex flex-col gap-4 pb-8">
              {!isFormValid && (
                <div className="p-4 bg-error/8 border border-error/30 rounded-xl flex flex-col gap-2.5 animate-fade-in">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-error flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Action Required
                  </span>
                  <ul className="list-none flex flex-col gap-1.5 text-[12px] text-error/80">
                    {validationErrors.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-error/50 mt-0.5">•</span>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isFormValid && !allPassed && (
                <div className="p-4 bg-warning/8 border border-warning/30 rounded-xl text-[12px] text-warning leading-relaxed font-sans flex items-start gap-2.5">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Your reference solution must pass all hidden test cases before you can activate the lobby.
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitProblem}
                disabled={!isFormValid || !isValidated || !allPassed || isSubmitting}
                className={`w-full py-4 rounded-xl text-[13px] font-bold tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                  isFormValid && isValidated && allPassed && !isSubmitting
                    ? "bg-gradient-to-r from-primary to-[#6ee7b7] text-white hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] active:scale-[0.99] cursor-pointer"
                    : "bg-bg-surface border border-border-default text-text-muted cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Activating Room Lobby...
                  </>
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    </svg>
                    Validate & Activate Lobby Room
                  </>
                )}
              </button>
            </div>

          </div>
        </section>

        {/* ═══════ RIGHT PANEL — LIVE PREVIEW ═══════ */}
        <section className={`bg-[#08080d] overflow-y-auto pe-scrollbar ${mobileTab === "preview" ? "mobile-show-pane" : "mobile-hide-pane"}`}>
          <div className="p-8 flex flex-col gap-6">

            {/* Preview header */}
            <div className="flex justify-between items-center pb-4 border-b border-border-default">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-text-secondary">
                  Live Preview
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[11px] font-semibold text-success font-mono">Syncing</span>
              </div>
            </div>

            {/* Preview card */}
            <div className="flex flex-col gap-5 bg-bg-surface border border-border-default rounded-2xl p-6 shadow-2xl">
              {/* Title & badges */}
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-text-primary leading-tight">
                  {title || "Untitled Challenge"}
                </h2>
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      difficulty === "easy"
                        ? "bg-success/15 text-success border border-success/25"
                        : difficulty === "medium"
                        ? "bg-warning/15 text-warning border border-warning/25"
                        : "bg-error/15 text-error border border-error/25"
                    }`}
                  >
                    {difficulty}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-bg-elevated text-[10px] font-bold uppercase tracking-wider text-text-secondary border border-border-default">
                    ⏱ {timeLimit} mins
                  </span>
                  {allowedLanguages.map((l) => (
                    <span
                      key={l}
                      className="px-2 py-1 rounded-lg bg-primary/10 text-[10px] font-bold uppercase text-primary border border-primary/20"
                    >
                      {l === "cpp" ? "C++" : l}
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />

              {/* Statement body */}
              <div className="prose max-w-none text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap min-h-28">
                {statement || (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <svg className="w-10 h-10 text-text-muted/30 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-text-muted text-[13px]">
                      Type a description in the editor panel to see it render here...
                    </span>
                  </div>
                )}
              </div>

              {/* Preview examples */}
              {visibleExamples.some((ex) => ex.input.trim() || ex.output.trim()) && (
                <div className="flex flex-col gap-3 mt-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-text-secondary">
                    Examples
                  </h3>
                  {visibleExamples.map((ex, idx) => {
                    if (!ex.input.trim() && !ex.output.trim()) return null;
                    return (
                      <div
                        key={idx}
                        className="bg-bg-primary border border-border-default rounded-xl overflow-hidden"
                      >
                        <div className="px-4 py-2 bg-bg-elevated/50 border-b border-border-default flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-secondary/15 text-secondary flex items-center justify-center text-[10px] font-bold font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                            Example
                          </span>
                        </div>
                        <div className="p-4 flex flex-col gap-2 font-mono text-[12px]">
                          <div className="text-text-secondary">
                            <span className="text-[10px] uppercase tracking-wider text-text-muted font-sans select-none mr-2">Input:</span>
                            {ex.input || <span className="italic text-text-muted">none</span>}
                          </div>
                          <div className="text-text-secondary">
                            <span className="text-[10px] uppercase tracking-wider text-text-muted font-sans select-none mr-2">Output:</span>
                            {ex.output || <span className="italic text-text-muted">none</span>}
                          </div>
                          {ex.explanation && (
                            <div className="text-text-secondary font-sans text-[12px] leading-relaxed border-t border-border-default pt-2 mt-1">
                              <span className="text-[10px] uppercase tracking-wider text-text-muted font-mono select-none block mb-0.5">
                                Explanation:
                              </span>
                              {ex.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>


      <AICodeConverter
        isOpen={showAiHelper}
        onClose={() => setShowAiHelper(false)}
        initialLanguage={activeLanguage}
        onApplyCode={(code, lang) => {
          setReferenceSolution(code);
          if (lang) {
            setActiveLanguage(lang);
          }
        }}
      />
    </div>
  );
}

export default ProblemEditor;
