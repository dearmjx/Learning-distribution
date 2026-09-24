"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity, CerResponse } from "@/lib/domain/types";
import { diagnosticLogger } from "@/lib/telemetry-logger";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "coach" | "opponent";
  createdAt: string;
  telemetryPill?: string;
}

interface SocraticCoachChatProps {
  activityId: string;
  activity?: Activity;
  studentId?: string;
  studentCer?: CerResponse;
  initialCoachFeedback?: string;
}

const QUICK_PROMPTS = [
  "ทำไมผู้บริโภคลำดับที่ 2 ถึงได้พลังงานน้อยลง?",
  "ถ้าจำนวนผู้ล่าลดลง จะส่งผลอย่างไรต่อห่วงโซ่อาหาร?",
  "ช่วยแนะนำวิธีเขียน Evidence ให้น่าเชื่อถือหน่อยครับ",
  "พลังงานในระบบนิเวศสูญเสียไปในรูปใดบ้าง?",
];

export function SocraticCoachChat({
  activityId,
  activity,
  studentId = "demo-student-01",
  studentCer,
  initialCoachFeedback,
}: SocraticCoachChatProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatSeconds, setChatSeconds] = useState(0);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"coach" | "opponent">("coach");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickPrompts = activity
    ? [
        `แนวคิดสำคัญของบท "${activity.unit}" เชื่อมกับคำถามนี้อย่างไร?`,
        "จากบริบทกิจกรรม มีข้อมูลส่วนใดเหมาะจะใช้เป็น Evidence?",
        "ช่วยตั้งคำถามเพื่อตรวจสอบ Reasoning ของผมหน่อยครับ",
        "ข้อมูลส่วนใดช่วยให้ผมตอบตรงประเด็นมากขึ้น?",
      ]
    : QUICK_PROMPTS;

  // Initialize with initial coach feedback if available
  useEffect(() => {
    if (initialCoachFeedback) {
      setMessages([
        {
          id: "initial-coach-msg",
          role: "assistant",
          content: initialCoachFeedback,
          createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      setMessages([
        {
          id: "welcome-msg",
          role: "assistant",
          content: "สวัสดีครับ! คุณได้ปลดล็อก Socratic Deep Dive (3 points) แล้ว มีข้อสงสัยเรื่องแนวคิดหรืออยากให้ช่วยตั้งคำถามนำส่วนไหน ถามมาได้เลยครับ",
          createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [initialCoachFeedback]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loading) {
      setChatSeconds(0);
      timer = setInterval(() => setChatSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    const startTime = performance.now();
    diagnosticLogger.log({
      level: "info",
      category: "LLM",
      message: `[Socratic Chat] Sending prompt from student '${studentId}' to AI Coach...`,
      details: { prompt: text, historyLength: messages.length },
    });

    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          activityId,
          mode,
          message: text,
          studentCer,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const elapsedMs = Math.round(performance.now() - startTime);
      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error ?? "ไม่สามารถส่งข้อความได้";
        diagnosticLogger.log({
          level: "error",
          category: "LLM",
          message: `[Socratic Chat] API error: ${errMsg}`,
          details: data,
        });
        throw new Error(errMsg);
      }

      diagnosticLogger.log({
        level: "success",
        category: "LLM",
        message: `[Socratic Chat] AI Coach responded in ${elapsedMs}ms (${data.provider})`,
        telemetry: data.telemetry,
        details: {
          citations: data.citations,
          safetyFlags: data.safetyFlags,
        },
      });

      const coachMessage: MessageItem = {
        id: `coach-${Date.now()}`,
        role: "assistant",
        mode,
        content: data.message,
        createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        telemetryPill: data.telemetry
          ? `⚡ ${data.telemetry.tokensPerSecond ?? 0} t/s · ⏱️ ${(data.telemetry.latencyMs / 1000).toFixed(1)}s`
          : undefined,
      };

      setMessages((prev) => [...prev, coachMessage]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Coach";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card chat-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">SOCRATIC DEEP DIVE · 3 POINTS</p>
          <h2>💬 AI Coach Mini-Chat</h2>
        </div>
        <div style={{ display: "flex", gap: "6px" }} role="group" aria-label="โหมด AI">
          <button
            type="button"
            className={`filter-pill ${mode === "coach" ? "active" : ""}`}
            aria-pressed={mode === "coach"}
            onClick={() => setMode("coach")}
          >
            🌿 โค้ชถามนำ
          </button>
          <button
            type="button"
            className={`filter-pill ${mode === "opponent" ? "active" : ""}`}
            aria-pressed={mode === "opponent"}
            onClick={() => setMode("opponent")}
          >
            ⚖️ ฝ่ายค้านท้าทาย Claim
          </button>
        </div>
      </div>
      {mode === "opponent" && (
        <p className="small-note" style={{ margin: "0 0 8px", color: "#64748b" }}>
          AI ฝ่ายค้านจะเสนอข้อโต้แย้งหนึ่งข้อต่อ Claim ของคุณ ลองใช้หลักฐานตอบกลับ (AI จะไม่เฉลยว่าใครถูก)
        </p>
      )}

      <div className="chat-messages-container">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`chat-bubble-row ${item.role === "user" ? "chat-user-row" : "chat-coach-row"}`}
          >
            <div className={`chat-bubble ${item.role === "user" ? "chat-bubble-user" : "chat-bubble-coach"}`}>
              <div className="chat-author-tag">
                {item.role === "user" ? `🧑‍🎓 นักเรียน (${studentId})` : item.mode === "opponent" ? "⚖️ AI ฝ่ายค้าน" : "🌿 อาจารย์ AI Coach"}
                <span className="chat-time">{item.createdAt}</span>
              </div>
              <p className="chat-text">{item.content}</p>
              {item.telemetryPill && (
                <div className="chat-telemetry-badge">{item.telemetryPill}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row chat-coach-row">
            <div className="chat-bubble chat-bubble-coach typing-bubble">
              <div className="chat-author-tag">
                🌿 อาจารย์ AI Coach กำลังคิดคำถาม Socratic...
                <span className="chat-time">⏱️ {chatSeconds} วินาที (Local Ollama)</span>
              </div>
              <div className="typing-dots">
                <span className="dot dot-1" />
                <span className="dot dot-2" />
                <span className="dot dot-3" />
              </div>
              <p className="typing-reassurance">กำลังประมวลผลบนเครื่อง (ไม่ได้ค้าง)...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <p className="error-text chat-error">{error}</p>}

      {/* Quick Prompt Suggestions */}
      <div className="quick-prompts-bar">
        <span className="quick-label">💡 คำถามด่วน:</span>
        <div className="quick-chips">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="quick-chip"
              disabled={loading}
              onClick={() => void sendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input row */}
      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`พิมพ์ข้อความถาม AI Coach เกี่ยวกับบท ${activity?.unit ?? "เรียนรู้นี้"}...`}
          disabled={loading}
        />
        <button
          type="submit"
          className="primary-button send-btn"
          disabled={loading || !input.trim()}
        >
          {loading ? "กำลังส่ง…" : "ส่งข้อความ"}
        </button>
      </form>
    </div>
  );
}
