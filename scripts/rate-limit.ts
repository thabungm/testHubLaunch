import * as fs from "node:fs";
import * as path from "node:path";

// File-backed, per-email sliding-window rate limiter. Zero runtime deps —
// Node built-ins only. State persists to a JSON file so the limit survives
// across the short-lived CLI processes that invoke submitContactForm().

export interface RateLimitConfig {
  max: number;
  windowMs: number;
  file: string;
}

/** Normalized email → ascending list of success-timestamp (ms) values. */
type RateState = Record<string, number[]>;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  // Number("") === 0 and Number(undefined) === NaN; the guard below rejects
  // both, plus decimals and non-positive values → fall back to the default.
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function readRateLimitConfig(): RateLimitConfig {
  const file = process.env.CONTACT_RATE_LIMIT_FILE?.trim() || ".contact-rate-limit.json";
  return {
    max: parsePositiveInt(process.env.CONTACT_RATE_LIMIT_MAX, 5),
    windowMs: parsePositiveInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS, 60000),
    // Resolve relative paths against cwd; absolute paths pass through.
    file: path.resolve(process.cwd(), file),
  };
}

function readState(file: string): RateState {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as RateState) : {};
  } catch {
    return {}; // missing file or corrupt JSON → empty state
  }
}

function writeStateAtomic(file: string, state: RateState): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file); // atomic replace on the same filesystem
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns null if the email is under the limit; otherwise a breach descriptor.
 * Reads only — never mutates the counter file, so an over-limit check is a
 * pure read.
 */
export function checkRateLimit(
  email: string,
  now: number,
): null | { limit: number; windowMs: number; retryAfterMs: number } {
  const { max, windowMs, file } = readRateLimitConfig();
  const key = normalize(email);
  const state = readState(file);
  const recent = (state[key] ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= max) {
    // The oldest in-window timestamp ages out first; clamp to >= 0.
    const retryAfterMs = Math.max(0, recent[0] + windowMs - now);
    return { limit: max, windowMs, retryAfterMs };
  }
  return null;
}

/**
 * Records a successful send timestamp for the email, pruning stale entries,
 * and persists atomically. Emptied keys are deleted so the file does not grow
 * unbounded with long-idle emails.
 */
export function recordSuccess(email: string, now: number): void {
  const { windowMs, file } = readRateLimitConfig();
  const key = normalize(email);
  const state = readState(file);
  const recent = (state[key] ?? []).filter((t) => t > now - windowMs);
  recent.push(now);
  state[key] = recent;
  if (state[key].length === 0) delete state[key];
  writeStateAtomic(file, state);
}
