import { createLogger, format, transports } from 'winston';
//@ts-ignore
import LogstashTransport from 'winston3-logstash-transport'; // ✅ Use the correct package

const logstashHost = process.env.NODE_ENV === 'development' ? 'localhost' : 'logstash.production.svc.cluster.local';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { "micro-service": 'feed-service' },
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),

    // ✅ Use winston3-logstash-transport instead of winston-logstash
    new LogstashTransport({
      host: logstashHost,
      port: 5000,
    }),

    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
