import { Logger, createLogger, format, transports } from 'winston';

export const promisedTimeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export function loggerFactory(): Logger {
  return createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    format: format.combine(format.colorize(), format.simple()),
    transports: [new transports.Console()],
  });
}
