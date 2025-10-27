/* eslint-disable @typescript-eslint/no-explicit-any */

type SafeResult = {
  ok: boolean;
  finalPayload?: unknown;
  error?: string;
  raw?: unknown;
};

function getHostMiniKit(): any {
  if (typeof window === "undefined") return undefined;
  try {
    return (globalThis as any).MiniKit;
  } catch {
    return undefined;
  }
}

export function isAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const mk = getHostMiniKit();
    if (!mk) return false;
    if (typeof mk.isInstalled === "function") return !!mk.isInstalled();
    if (typeof mk.commandsAsync !== "undefined") return true;
    return false;
  } catch {
    return false;
  }
}

export async function safeCall(command: string, params?: unknown): Promise<SafeResult> {
  if (typeof window === "undefined") return { ok: false, error: "SSR: window not available" };
  try {
    const mk = getHostMiniKit();
    if (!mk || typeof mk.commandsAsync === "undefined") {
      return { ok: false, error: "MiniKit.commandsAsync is not available", raw: mk };
    }

    const fn = (mk.commandsAsync as Record<string, any>)[command] as ((p?: unknown) => Promise<unknown>) | undefined;
    if (typeof fn !== "function") {
      return { ok: false, error: `MiniKit command not available: ${command}` };
    }

    const raw = await fn(params);
    if (!raw || !(raw as any).finalPayload) {
      return { ok: false, error: "No finalPayload in MiniKit response", raw };
    }

    const finalPayload = (raw as any).finalPayload;
    if (finalPayload && (finalPayload as any).status === "error") {
      return { ok: false, error: (finalPayload as any).message || "MiniKit reported error", finalPayload, raw };
    }

    return { ok: true, finalPayload, raw };
  } catch (err) {
    return { ok: false, error: String(err), raw: err };
  }
}

const safeMiniKit = { isAvailable, safeCall };
export default safeMiniKit;
