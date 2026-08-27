"use client";

import { useEffect, useRef, useState } from "react";
import { diagnosticLogger, type DiagnosticLogEntry } from "@/lib/telemetry-logger";
import type { LlmTelemetry } from "@/lib/ai/provider";

export function DiagnosticTerminalDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "llm" | "errors" | "safety">("all");
  const [telemetry, setTelemetry] = useState<LlmTelemetry | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(diagnosticLogger.getLogs());
    setTelemetry(diagnosticLogger.getLatestTelemetry());

    const unsubscribe = diagnosticLogger.subscribe((newEntry) => {
      setLogs((prev) => [...prev, newEntry]);
      if (newEntry.telemetry) {
        setTelemetry(newEntry.telemetry);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const filteredLogs = logs.filter((log) => {
    if (activeTab === "llm") return log.category === "LLM" || !!log.telemetry;
    if (activeTab === "errors") return log.level === "error" || log.level === "warning";
    if (activeTab === "safety") return log.category === "SAFETY";
    return true;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;

  function copyDiagnosticReport() {
    const report = {
      timestamp: new Date().toISOString(),
      activeTelemetry: telemetry,
      recentLogs: logs.slice(-30),
    };
    void navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Floating Toggle Button at bottom-right */}
      <div className="terminal-floating-trigger">
        <button
          type="button"
          className={`terminal-trigger-btn ${errorCount > 0 ? "has-errors" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          title="เปิด/ปิด แผงควบคุมระบบและบันทึกข้อผิดพลาด (LM Studio Telemetry)"
        >
          <span className="trigger-pulse-dot" />
          <span className="trigger-icon">🖥️</span>
          <span className="trigger-label">Backend Telemetry & Logs</span>
          {telemetry?.tokensPerSecond && (
            <span className="tps-badge">
              ⚡ {telemetry.tokensPerSecond} t/s
            </span>
          )}
          {errorCount > 0 && (
            <span className="error-badge-count">
              {errorCount} {errorCount === 1 ? "Error" : "Errors"}
            </span>
          )}
        </button>
      </div>

      {/* Slide-over Diagnostic Drawer */}
      {isOpen && (
        <aside className="diagnostic-drawer-overlay">
          <div className="diagnostic-drawer-panel">
            {/* LM Studio Style Top Telemetry HUD */}
            <div className="terminal-hud-header">
              <div className="hud-title-col">
                <div className="hud-brand-row">
                  <span className="terminal-icon">⚡</span>
                  <h3>LM Studio Telemetry & Diagnostic Console</h3>
                  <span className="live-status-pill">LIVE MONITOR</span>
                </div>
                <p className="hud-sub">
                  ติดตามความเร็วโทเคน (Token / sec), ระยะเวลาประมวลผล (Run Time) และบันทึกข้อผิดพลาดหลังบ้าน
                </p>
              </div>

              <div className="hud-actions-col">
                <button
                  type="button"
                  className="hud-btn hud-copy-btn"
                  onClick={copyDiagnosticReport}
                >
                  {copied ? "✅ คัดลอกสำเร็จ!" : "📋 Copy Report"}
                </button>
                <button
                  type="button"
                  className="hud-btn hud-clear-btn"
                  onClick={() => diagnosticLogger.clear()}
                >
                  🧹 Clear
                </button>
                <button
                  type="button"
                  className="hud-btn hud-close-btn"
                  onClick={() => setIsOpen(false)}
                >
                  ✕ ปิด
                </button>
              </div>
            </div>

            {/* Metrics Dashboard Strip (LM Studio Style) */}
            <div className="telemetry-metrics-strip">
              {/* Metric 1: Model & Provider */}
              <div className="metric-box">
                <span className="metric-label">ACTIVE MODEL</span>
                <span className="metric-value highlight-cyan">
                  {telemetry?.model ?? "ornith:9b"}
                </span>
                <span className="metric-sub">
                  Provider: {telemetry?.provider ? telemetry.provider.toUpperCase() : "LOCAL OLLAMA"}
                </span>
              </div>

              {/* Metric 2: Speed / Throughput */}
              <div className="metric-box">
                <span className="metric-label">THROUGHPUT</span>
                <span className="metric-value highlight-green">
                  {telemetry?.tokensPerSecond ? `${telemetry.tokensPerSecond} t/s` : "-- t/s"}
                </span>
                <span className="metric-sub">Tokens per second</span>
              </div>

              {/* Metric 3: Run Time / Latency */}
              <div className="metric-box">
                <span className="metric-label">RUN TIME / LATENCY</span>
                <span className="metric-value highlight-yellow">
                  {telemetry?.latencyMs
                    ? telemetry.latencyMs >= 1000
                      ? `${(telemetry.latencyMs / 1000).toFixed(2)} s`
                      : `${telemetry.latencyMs} ms`
                    : "-- ms"}
                </span>
                <span className="metric-sub">
                  {telemetry?.latencyMs ? `${telemetry.latencyMs.toLocaleString()} ms total` : "Awaiting request"}
                </span>
              </div>

              {/* Metric 4: Token Counts */}
              <div className="metric-box">
                <span className="metric-label">TOKEN USAGE</span>
                <div className="metric-token-breakdown">
                  <span>Prompt: <strong>{telemetry?.promptTokens ?? 0}</strong></span>
                  <span>Completion: <strong>{telemetry?.completionTokens ?? 0}</strong></span>
                  <span>Total: <strong>{telemetry?.totalTokens ?? 0}</strong></span>
                </div>
                <span className="metric-sub">Estimated tokens</span>
              </div>

              {/* Metric 5: Temperature & Context */}
              <div className="metric-box">
                <span className="metric-label">CONFIG / PARAMS</span>
                <span className="metric-value highlight-purple">Temp: 0.2</span>
                <span className="metric-sub">Max Tokens: 1024 · JSON Object</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="terminal-tabs-bar">
              <button
                type="button"
                className={`terminal-tab ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All Events ({logs.length})
              </button>
              <button
                type="button"
                className={`terminal-tab ${activeTab === "llm" ? "active" : ""}`}
                onClick={() => setActiveTab("llm")}
              >
                🤖 LLM Inferences ({logs.filter((l) => l.category === "LLM").length})
              </button>
              <button
                type="button"
                className={`terminal-tab ${activeTab === "safety" ? "active" : ""}`}
                onClick={() => setActiveTab("safety")}
              >
                🛡️ Safety & Policies ({logs.filter((l) => l.category === "SAFETY").length})
              </button>
              <button
                type="button"
                className={`terminal-tab ${activeTab === "errors" ? "active" : ""}`}
                onClick={() => setActiveTab("errors")}
              >
                ⚠️ Errors & Warnings ({logs.filter((l) => l.level === "error" || l.level === "warning").length})
              </button>
            </div>

            {/* Monospaced Log Stream Terminal */}
            <div className="terminal-log-viewport" ref={scrollRef}>
              {filteredLogs.length === 0 ? (
                <div className="empty-terminal-state">
                  <p>ไม่มีประวัติบันทึกในหมวดหมู่นี้</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className={`terminal-log-line log-${log.level}`}>
                    <span className="log-time">[{log.timestamp}]</span>
                    <span className={`log-category cat-${log.category.toLowerCase()}`}>
                      [{log.category}]
                    </span>
                    <span className={`log-level-badge level-${log.level}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="log-msg">{log.message}</span>

                    {log.telemetry && (
                      <span className="log-telemetry-tag">
                        ⏱️ {log.telemetry.latencyMs}ms | ⚡ {log.telemetry.tokensPerSecond ?? 0} t/s | 📊 {log.telemetry.completionTokens ?? 0} tokens
                      </span>
                    )}

                    {log.details && (
                      <pre className="log-details-block">
                        {typeof log.details === "string"
                          ? log.details
                          : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Terminal Footer */}
            <div className="terminal-footer-bar">
              <div className="footer-left">
                <span className="footer-endpoint">
                  🌐 Endpoint: <code>http://localhost:11434/v1</code>
                </span>
                <span className="footer-persistence">
                  💾 Persistence: <code>Memory / Supabase Adapter Active</code>
                </span>
              </div>
              <div className="footer-right">
                <span>Learning OS Telemetry Console · Powered by Next.js & Ollama</span>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
