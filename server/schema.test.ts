import { describe, expect, it } from "vitest";
import { jobs, servers } from "../drizzle/schema";

describe("XTTS Panel initial schema", () => {
  it("exposes the server table with the fields required for health orchestration", () => {
    expect(servers).toBeDefined();
    expect(servers["name"]).toBeDefined();
    expect(servers["host"]).toBeDefined();
    expect(servers["port"]).toBeDefined();
    expect(servers["status"]).toBeDefined();
    expect(servers["lastHealthCheck"]).toBeDefined();
  });

  it("exposes the job table with lifecycle and audio reference fields", () => {
    expect(jobs).toBeDefined();
    expect(jobs["id"]).toBeDefined();
    expect(jobs["userId"]).toBeDefined();
    expect(jobs["status"]).toBeDefined();
    expect(jobs["processingTime"]).toBeDefined();
    expect(jobs["filePath"]).toBeDefined();
    expect(jobs["createdAt"]).toBeDefined();
  });
});
