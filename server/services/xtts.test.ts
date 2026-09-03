import { describe, expect, it } from "vitest";
import { generateXttsAudio, getXttsHealth, getXttsInfo, getXttsSpeakers } from "./xtts";

describe("XTTS integration", () => {
  it("authenticates against the configured XTTS health endpoint", async () => {
    const health = await getXttsHealth();
    expect(health.status).toBe("healthy");
  }, 15000);

  it("reads the protected XTTS metadata and speakers endpoints", async () => {
    const [info, speakers] = await Promise.all([getXttsInfo(), getXttsSpeakers()]);
    expect(info.model).toContain("xtts_v2");
    expect(info.device).toBe("cpu");
    expect(Array.isArray(speakers)).toBe(true);
    expect(speakers.length).toBeGreaterThan(0);
  }, 20000);

  it("generates an MP3 binary through the XTTS endpoint", async () => {
    const audio = await generateXttsAudio({
      text: "Oi.",
      language: "pt",
      speaker: "Marcos Rudaski",
      format: "mp3",
    });
    expect(audio.mimeType).toBe("audio/mpeg");
    expect(audio.size).toBeGreaterThan(0);
    expect(audio.audioBase64.length).toBeGreaterThan(0);
  }, 120000);
});
