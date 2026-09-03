import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(process.env.AUDIO_STORAGE_PATH ?? "outputs");

export async function saveAudio(jobId: string, format: "mp3" | "wav", bytes: Buffer) {
  await mkdir(storageRoot, { recursive: true });
  const filePath = path.join(storageRoot, `${jobId}.${format}`);
  await writeFile(filePath, bytes, { mode: 0o600 });
  return filePath;
}

export function audioPath(jobId: string, format: "mp3" | "wav") {
  return path.join(storageRoot, `${jobId}.${format}`);
}
