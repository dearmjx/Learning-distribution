import type { LlmTelemetry } from "@/lib/ai/provider";

export type DiagnosticLogLevel = "info" | "success" | "warning" | "error" | "telemetry";

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: DiagnosticLogLevel;
  category: "LLM" | "API" | "WORKFLOW" | "SAFETY" | "SYSTEM";
  message: string;
  details?: Record<string, unknown> | string;
  telemetry?: LlmTelemetry;
}

type LogListener = (entry: DiagnosticLogEntry) => void;

class DiagnosticLogger {
  private logs: DiagnosticLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private latestTelemetry: LlmTelemetry | null = null;

  constructor() {
    // Initial boot log
    this.log({
      level: "info",
      category: "SYSTEM",
      message: "Learning OS Diagnostic Engine initialized (LM Studio Mode active)",
      details: {
        runtime: "Next.js 15 App Router",
        telemetryVersion: "2.1.0",
      },
    });
  }

  log(entry: Omit<DiagnosticLogEntry, "id" | "timestamp"> & { timestamp?: string }): DiagnosticLogEntry {
    const fullEntry: DiagnosticLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp ?? new Date().toLocaleTimeString("th-TH", { hour12: false }),
      ...entry,
    };

    if (entry.telemetry) {
      this.latestTelemetry = entry.telemetry;
    }

    this.logs.push(fullEntry);
    // Keep last 200 logs
    if (this.logs.length > 200) {
      this.logs.shift();
    }

    this.listeners.forEach((listener) => {
      try {
        listener(fullEntry);
      } catch {
        // ignore
      }
    });

    return fullEntry;
  }

  getLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  getLatestTelemetry(): LlmTelemetry | null {
    return this.latestTelemetry;
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.logs = [];
    this.log({
      level: "info",
      category: "SYSTEM",
      message: "Diagnostic log terminal cleared by user",
    });
  }
}

export const diagnosticLogger = new DiagnosticLogger();
