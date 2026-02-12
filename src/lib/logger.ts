type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    tsISO: new Date().toISOString(),
    ...(context ?? {}),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
};
