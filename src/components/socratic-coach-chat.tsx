"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity, CerResponse } from "@/lib/domain/types";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface SocraticCoachChatProps {
  activityId: string;
  activity?: Activity;
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
  studentCer,
  initialCoachFeedback,
}: SocraticCoachChatProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "demo-student-01",
          activityId,
          message: text,
          studentCer,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถส่งข้อความได้");

      const coachMessage: MessageItem = {
        id: `coach-${Date.now()}`,
        role: "assistant",
        content: data.message,
        createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, coachMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Coach");
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
        <span className="phase-label live-badge">Live Coach Active</span>
      </div>

      <div className="chat-messages-container">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`chat-bubble-row ${item.role === "user" ? "chat-user-row" : "chat-coach-row"}`}
          >
            <div className={`chat-bubble ${item.role === "user" ? "chat-bubble-user" : "chat-bubble-coach"}`}>
              <div className="chat-author-tag">
                {item.role === "user" ? "คุณ (Student)" : "🌿 AI Coach"}
                <span className="chat-time">{item.createdAt}</span>
              </div>
              <p className="chat-text">{item.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row chat-coach-row">
            <div className="chat-bubble chat-bubble-coach typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-text">AI Coach กำลังคิดคำถามนำ...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <p className="error-text chat-error">{error}</p>}

      <div className="quick-prompts-row">
        <span className="quick-label">ลองถาม:</span>
        <div className="chips-scroll">
          {QUICK_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-button"
              onClick={() => void sendMessage(promptText)}
              disabled={loading}
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      <form
        className="chat-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        <input
          type="text"
          className="chat-text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์คำถามหรือข้อสงสัยเกี่ยวกับระบบนิเวศ..."
          disabled={loading}
        />
        <button type="submit" className="primary-button compact-button" disabled={loading || !input.trim()}>
          {loading ? "..." : "ส่ง"}
        </button>
      </form>
      <p className="small-note chat-note">
        💡 AI Coach จะถามนำแบบ Socratic โดยไม่เฉลยคำตอบ เพื่อช่วยให้คุณค้นพบข้อสรุปด้วยตนเอง
      </p>
    </div>
  );
}
