
import dotenv from "dotenv";

dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function number(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be a number (got "${raw}")`);
  return n;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "test",
  PORT: number("PORT", 3001),

  MOTIVE_BASE_URL: process.env.MOTIVE_BASE_URL ?? "https://api.gomotive.com",
  MOTIVE_API_TOKEN: required("MOTIVE_API_TOKEN"),

  TELEGRAM_BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_CHAT_ID: required("TELEGRAM_CHAT_ID"),
};
