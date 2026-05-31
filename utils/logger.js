import { env } from "../config/env.js";




const levels = { debug: 10, info: 20, warn: 30, error: 40 };



const colors = {
  reset:  "\x1b[0m",
  debug:  "\x1b[36m",   // cyan
  info:   "\x1b[32m",   // green
  warn:   "\x1b[38;5;226m",   // yellow
  error:  "\x1b[38;5;202m",   // red
  dim:    "\x1b[38;5;231m",    // default color white 
};




function getLevel() {
  // In prod default to info; otherwise default to debug
  const defaultLevel = env.NODE_ENV === "production" ? "info" : "debug";
  const level = (process.env.LOG_LEVEL || defaultLevel).toLowerCase();
  return levels[level] ? level : defaultLevel;
}

const currentLevel = getLevel();

function shouldLog(level) {
  return levels[level] >= levels[currentLevel];
}

function stamp() {
  return toNYIsoLocal(new Date());
}

function log(level, ...args) {
  if (!shouldLog(level)) return;

  const color  = colors[level] ?? colors.reset;
  const prefix = `${colors.dim}[${stamp()}] ${color}[${level.toUpperCase()}]${colors.reset}`;

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



function toNYIsoLocal(utcIso) {
  const d = new Date(utcIso);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}