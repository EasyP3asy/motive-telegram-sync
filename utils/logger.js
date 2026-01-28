
import { env } from "../config/env.js";

const levels = { debug: 10, info: 20, warn: 30, error: 40 };

function getLevel() {
  // In prod, default to info; in dev, default to debug
  const defaultLevel = env.NODE_ENV === "test" ? "info" : "debug";
  const level = (process.env.LOG_LEVEL || defaultLevel).toLowerCase();
  return levels[level] ? level : defaultLevel;
}

const currentLevel = getLevel();

function shouldLog(level) {
  return levels[level] >= levels[currentLevel];
}

function stamp() {
  return new Date().toISOString();
}

function log(level, ...args) {
  if (!shouldLog(level)) return;

  const prefix = `[${stamp()}] [${level.toUpperCase()}]`;

  if (level === "error") console.error(prefix, ...args);
  else if (level === "warn") console.warn(prefix, ...args);
  else console.log(prefix, ...args);
}

export const logger = {
  debug: (...args) => log("debug", ...args),
  info: (...args) => log("info", ...args),
  warn: (...args) => log("warn", ...args),
  error: (...args) => log("error", ...args),
};
