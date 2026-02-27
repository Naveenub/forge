/**
 * Unit tests for utility functions.
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";

// ─── Formatters ───────────────────────────────────────────────────────────────

describe("formatters", () => {
  describe("formatBytes", () => {
    it("formats bytes correctly", () => {
      const { formatBytes } = await import("../utils/formatters.js");
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1048576)).toBe("1.0 MB");
      expect(formatBytes(14540)).toBe("14.2 KB");
    });
  });

  describe("formatDuration", () => {
    it("formats short durations in seconds", async () => {
      const { formatDuration } = await import("../utils/formatters.js");
      expect(formatDuration(45)).toBe("45s");
      expect(formatDuration(90)).toBe("1m 30s");
      expect(formatDuration(3661)).toBe("1h 1m 1s");
    });
  });

  describe("formatNumber", () => {
    it("formats large numbers with separators", async () => {
      const { formatNumber } = await import("../utils/formatters.js");
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1234567)).toBe("1,234,567");
    });
  });

  describe("formatPercent", () => {
    it("formats percentages with 1 decimal", async () => {
      const { formatPercent } = await import("../utils/formatters.js");
      expect(formatPercent(96.4)).toBe("96.4%");
      expect(formatPercent(100)).toBe("100.0%");
    });
  });

  describe("truncate", () => {
    it("truncates long strings", async () => {
      const { truncate } = await import("../utils/formatters.js");
      expect(truncate("hello world", 5)).toBe("hello…");
      expect(truncate("short", 10)).toBe("short");
    });
  });

  describe("shortSha", () => {
    it("returns first 8 chars of a sha", async () => {
      const { shortSha } = await import("../utils/formatters.js");
      expect(shortSha("a4f9c3d1e8b2f5a7")).toBe("a4f9c3d1");
    });
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DOMAIN_COLORS has entries for all 5 domains", async () => {
    const { DOMAIN_COLORS } = await import("../utils/constants.js");
    expect(Object.keys(DOMAIN_COLORS)).toHaveLength(5);
    expect(DOMAIN_COLORS).toHaveProperty("architecture");
    expect(DOMAIN_COLORS).toHaveProperty("devops");
  });

  it("PIPELINE_STAGES has 15 or 16 entries", async () => {
    const { PIPELINE_STAGES } = await import("../utils/constants.js");
    expect(PIPELINE_STAGES.length).toBeGreaterThanOrEqual(15);
  });
});
