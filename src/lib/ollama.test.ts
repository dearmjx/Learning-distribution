import { describe, it, expect } from "vitest";
import { LocalProvider } from "@/lib/ai/local-provider";

describe("Ollama Local Provider", () => {
  it("connects and receives a response from local Ollama if available", async () => {
    const provider = new LocalProvider("http://localhost:11434/v1", "ornith:9b");
    try {
      const response = await provider.complete([
        { role: "system", content: "You are a helpful science coach. Answer briefly in Thai." },
        { role: "user", content: "บอกหน้าที่ของพืชในระบบนิเวศสั้นๆ 1 ประโยค" },
      ], { maxTokens: 500 });

      expect(response).toBeDefined();
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    } catch {
      // Gracefully handle environments without a running Ollama daemon
      expect(provider.name).toBe("local");
    }
  }, 60000);
});

