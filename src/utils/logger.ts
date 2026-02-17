import winston from "winston";
import type { TransformableInfo } from "logform";
import path from "path";
import env from "../configs/env";

const logDir = "logs";
const date = new Date().toISOString().slice(0, 10);
const logName = path.join(logDir, `log-${date}.log`);
type LoggerInfo = TransformableInfo & {
  meta?: unknown;
  error?: unknown;
};

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "cyan",
    success: "green",
    debug: "magenta",
  },
};

winston.addColors(customLevels.colors);

const formatMeta = winston.format((info: LoggerInfo) => {
  if (info.meta && typeof info.meta === "object") {
    info.message = `${String(info.message)} | meta=${JSON.stringify(info.meta)}`;
  }
  if (info.error instanceof Error) {
    info.message = `${String(info.message)} | error=${info.error.stack}`;
  }
  return info;
});

// Custom layout
const logFormat = winston.format.printf(
  ({ timestamp, level, message }: LoggerInfo) =>
    `${String(timestamp ?? "")} [${String(level ?? "info").toUpperCase()}] ${String(message)}`,
);

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: env.DEBUG ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    formatMeta(),
    logFormat,
  ),
  transports: (() => {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: "debug",
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          logFormat,
          winston.format.colorize({ all: true }),
        ),
      }),
    ];

      try {
        const fs = require("fs") as typeof import("fs");
        fs.mkdirSync(logDir, { recursive: true });
        transports.push(new winston.transports.File({ filename: logName }));
      } catch {
        // Keep app alive with console logs only if file logging is unavailable.
      }
    

    return transports;
  })(),
});

export default {
  info: (msg: string, meta?: unknown) => logger.info(msg, { meta }),
  warn: (msg: string, meta?: unknown) => logger.warn(msg, { meta }),
  error: (msg: string, error?: unknown) => logger.error(msg, { error }),
  success: (msg: string, meta?: unknown) => logger.log("success", msg, { meta }),
  debug: (msg: string, meta?: unknown) => logger.debug(msg, { meta }),
};
