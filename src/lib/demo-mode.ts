export const DEMO_COOKIE_NAME = "learning_os_demo";
export const DEMO_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const TOKEN_VERSION = "v1";
const PASSWORD_PURPOSE = "learning-os-demo-password";
const SESSION_PURPOSE = "learning-os-demo-session";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isDemoModeEnabled(): boolean {
  return readEnv("DEMO_MODE_ENABLED").toLowerCase() === "true";
}

export function hasDemoPassword(): boolean {
  return readEnv("DEMO_MODE_PASSWORD").length > 0;
}

function getSessionSecret(): string | null {
  const configuredSecret = readEnv("DEMO_MODE_SESSION_SECRET");
  const password = readEnv("DEMO_MODE_PASSWORD");
  return configuredSecret || password || null;
}

async function hmacHex(secret: string, message: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;

  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );

  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

export async function verifyDemoPassword(candidate: unknown): Promise<boolean> {
  const password = readEnv("DEMO_MODE_PASSWORD");
  if (!password || typeof candidate !== "string" || candidate.length === 0 || candidate.length > 256) {
    return false;
  }

  const [expected, actual] = await Promise.all([
    hmacHex(password, PASSWORD_PURPOSE),
    hmacHex(candidate, PASSWORD_PURPOSE),
  ]);

  return expected !== null && actual !== null && constantTimeEqual(expected, actual);
}

export async function createDemoSessionToken(nowSeconds = Math.floor(Date.now() / 1000)): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const expiresAt = nowSeconds + DEMO_SESSION_MAX_AGE_SECONDS;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  const signature = await hmacHex(secret, `${SESSION_PURPOSE}:${payload}`);
  return signature ? `${payload}.${signature}` : null;
}

export async function verifyDemoSessionToken(
  token: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < nowSeconds) return false;

  const secret = getSessionSecret();
  if (!secret) return false;

  const expected = await hmacHex(secret, `${SESSION_PURPOSE}:${parts[0]}.${parts[1]}`);
  return expected !== null && constantTimeEqual(expected, parts[2]);
}
