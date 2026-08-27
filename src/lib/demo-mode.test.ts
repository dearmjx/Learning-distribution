import { afterEach, describe, expect, it } from "vitest";
import {
  createDemoSessionToken,
  isDemoModeEnabled,
  verifyDemoPassword,
  verifyDemoSessionToken,
} from "@/lib/demo-mode";

const envKeys = ["DEMO_MODE_ENABLED", "DEMO_MODE_PASSWORD", "DEMO_MODE_SESSION_SECRET"] as const;
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    const originalValue = originalEnv.get(key);
    if (originalValue === undefined) delete process.env[key];
    else process.env[key] = originalValue;
  }
});

describe("demo mode", () => {
  it("requires an explicit enable flag", () => {
    delete process.env.DEMO_MODE_ENABLED;
    expect(isDemoModeEnabled()).toBe(false);

    process.env.DEMO_MODE_ENABLED = "true";
    expect(isDemoModeEnabled()).toBe(true);
  });

  it("verifies the configured password without accepting a wrong password", async () => {
    process.env.DEMO_MODE_PASSWORD = "local-demo-password";

    await expect(verifyDemoPassword("local-demo-password")).resolves.toBe(true);
    await expect(verifyDemoPassword("wrong-password")).resolves.toBe(false);
  });

  it("creates expiring signed sessions that reject tampering and expiry", async () => {
    process.env.DEMO_MODE_PASSWORD = "local-demo-password";
    process.env.DEMO_MODE_SESSION_SECRET = "test-only-session-secret";

    const token = await createDemoSessionToken(1_000);
    expect(token).toBeTruthy();
    await expect(verifyDemoSessionToken(token ?? undefined, 1_001)).resolves.toBe(true);
    await expect(verifyDemoSessionToken(`${token}x`, 1_001)).resolves.toBe(false);
    await expect(verifyDemoSessionToken(token ?? undefined, 1_000 + 8 * 60 * 60 + 1)).resolves.toBe(false);
  });
});
