import { ENV } from "../_core/env";

function headers() {
  return ENV.xttsApiKey ? { "X-API-Key": ENV.xttsApiKey } : undefined;
}

function baseUrl() {
  return ENV.xttsServerUrl.replace(/\/$/, "");
}

export async function getXttsHealth() {
  if (!ENV.xttsServerUrl) return { status: "not_configured" as const };
  const response = await fetch(`${baseUrl()}/health`, { headers: headers(), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`XTTS health returned ${response.status}`);
  return response.json() as Promise<{ status: string; device?: string; cuda?: boolean }>;
}

export async function getXttsSpeakers() {
  if (!ENV.xttsServerUrl) return [];
  const response = await fetch(`${baseUrl()}/speakers`, { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`XTTS speakers returned ${response.status}`);
  const payload = await response.json() as unknown;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "speakers" in payload && Array.isArray(payload.speakers)) return payload.speakers;
  return [];
}
