import config from "../config";

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const getTimestamp = (): string => {
  return new Date().toISOString();
};

const shouldLog = (level: LogLevel): boolean => {
  const currentLevel = config.logLevel as LogLevel;
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
};

const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = getTimestamp();
  const levelUpper = level.toUpperCase();
  return `[${timestamp}] ${levelUpper}: ${message}`;
};

const debug = (message: string, ...args: any[]): void => {
  if (shouldLog("debug")) {
    console.debug(formatMessage("debug", message), ...args);
  }
};

const info = (message: string, ...args: any[]): void => {
  if (shouldLog("info")) {
    console.info(formatMessage("info", message), ...args);
  }
};

const warn = (message: string, ...args: any[]): void => {
  if (shouldLog("warn")) {
    console.warn(formatMessage("warn", message), ...args);
  }
};

const error = (message: string, ...args: any[]): void => {
  if (shouldLog("error")) {
    console.error(formatMessage("error", message), ...args);
  }
};

const logger: Logger = {
  debug,
  info,
  warn,
  error,
};

export default logger;

