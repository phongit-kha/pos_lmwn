// ==========================================
// STRUCTURED LOGGING
// ==========================================
// Provides consistent, JSON-formatted logging
// for better observability and debugging.

/**
 * Log context with optional metadata
 */
export interface LogContext {
  requestId?: string;
  orderId?: string;
  tableNumber?: number;
  action?: string;
  duration?: number;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Log levels
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * Structured log entry
 */
interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Format and output a log entry
 */
function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Create a log entry and output it
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): void {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
      };
    } else if (typeof error === "string") {
      entry.error = {
        name: "UnknownError",
        message: error,
      };
    } else {
      entry.error = {
        name: "UnknownError",
        message: JSON.stringify(error),
      };
    }
  }

  const output = formatLog(entry);

  switch (level) {
    case "DEBUG":
      if (process.env.NODE_ENV !== "production") {
        console.debug(output);
      }
      break;
    case "INFO":
      console.info(output);
      break;
    case "WARN":
      console.warn(output);
      break;
    case "ERROR":
      console.error(output);
      break;
  }
}

/**
 * Logger instance with methods for each log level
 */
export const logger = {
  /**
   * Debug level - only in development
   */
  debug: (message: string, context?: LogContext) => {
    log("DEBUG", message, context);
  },

  /**
   * Info level - general information
   */
  info: (message: string, context?: LogContext) => {
    log("INFO", message, context);
  },

  /**
   * Warn level - potential issues
   */
  warn: (message: string, context?: LogContext) => {
    log("WARN", message, context);
  },

  /**
   * Error level - errors and exceptions
   */
  error: (message: string, error: unknown, context?: LogContext) => {
    log("ERROR", message, context, error);
  },
};

/**
 * Create a child logger with preset context
 * Useful for request-scoped logging
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) => {
      logger.debug(message, { ...baseContext, ...context });
    },
    info: (message: string, context?: LogContext) => {
      logger.info(message, { ...baseContext, ...context });
    },
    warn: (message: string, context?: LogContext) => {
      logger.warn(message, { ...baseContext, ...context });
    },
    error: (message: string, error: unknown, context?: LogContext) => {
      logger.error(message, error, { ...baseContext, ...context });
    },
  };
}

/**
 * Time an async operation and log the duration
 */
export async function withTiming<T>(
  operationName: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`${operationName} completed`, { ...context, duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${operationName} failed`, error, { ...context, duration });
    throw error;
  }
}
