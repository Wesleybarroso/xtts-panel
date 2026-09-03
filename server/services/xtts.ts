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

export async function getXttsMonitor() {
  if (!ENV.xttsServerUrl) return { status: "not_configured" as const };
  const response = await fetch(`${baseUrl()}/monitor`, { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`XTTS monitor returned ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
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

export async function getXttsInfo() {
  if (!ENV.xttsServerUrl) return { status: "not_configured" as const };
  const response = await fetch(`${baseUrl()}/info`, { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`XTTS info returned ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function generateXttsAudio(input: {
  text: string;
  language: string;
  speaker: string;
  format: "mp3" | "wav";
}) {
  if (!ENV.xttsServerUrl) throw new Error("XTTS server is not configured");
  const form = new FormData();
  form.append("text", input.text);
  form.append("language", input.language);
  form.append("speaker", input.speaker);
  form.append("format", input.format);
  const response = await fetch(`${baseUrl()}/tts`, {
    method: "POST",
    headers: headers(),
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`XTTS generation returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    audioBase64: bytes.toString("base64"),
    mimeType: input.format === "mp3" ? "audio/mpeg" : "audio/wav",
    format: input.format,
    size: bytes.byteLength,
  };
}
