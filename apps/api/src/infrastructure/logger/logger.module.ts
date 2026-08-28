import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * LoggerModule — global module that configures nestjs-pino (Pino structured logger).
 *
 * Why Pino? (Phase 5 §9)
 *  - 5–10× faster than Winston due to async serialization.
 *  - Structured JSON output compatible with Loki, Datadog, CloudWatch.
 *  - pino-pretty for human-readable local development.
 *  - Built-in request-scoped context (requestId, userId).
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment =
          configService.get<string>('app.nodeEnv') === 'development';

        return {
          pinoHttp: {
            level: isDevelopment ? 'debug' : 'info',
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            // Redact sensitive headers, credentials, and token fields from logs
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["set-cookie"]',
                'req.headers["x-api-key"]',
                'req.headers["x-razorpay-signature"]',
                'req.headers["x-razorpay-event-id"]',
                'req.body.password',
                'req.body.passwordHash',
                'req.body.refreshTokenHash',
                'req.body.refreshToken',
                'req.body.accessToken',
                'req.body.token',
                'req.body.otp',
                'req.body.secret',
                'req.body.apiKey',
                'req.body.privateKey',
                'req.body.secretAccessKey',
                'req.body.cardNumber',
                'req.body.cvv',
              ],
              censor: '[REDACTED]',
            },
            // Auto-log: include method, url, status, response time
            customProps: (_req: unknown, res: unknown) => ({
              // @ts-expect-error — express response typing
              context: res?.locals?.requestId
                ? // @ts-expect-error — express response typing
                  `req-${res.locals.requestId?.slice(0, 8)}`
                : 'http',
            }),
            // Mask health check endpoints from routine access logs
            autoLogging: {
              ignore: (req: { url?: string }) =>
                req.url === '/api/health/liveness',
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
