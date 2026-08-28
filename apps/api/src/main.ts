import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Attach Pino Logger
  app.useLogger(app.get(PinoLogger));

  // Enable trust proxy for reverse-proxy & load-balancer ingress (Nginx, Cloudflare, AWS ALB)
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const port = configService.get<number>('app.port', 3000);
  const globalPrefix = configService.get<string>('app.prefix', 'api');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:3001',
  ]);

  // Safe development dashboard local origins
  const devDefaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:19006',
  ];

  const allowedCorsOrigins =
    nodeEnv === 'production'
      ? corsOrigins
      : Array.from(new Set([...corsOrigins, ...devDefaultOrigins]));

  // Request size & resource abuse protection: Enforce 1MB limit on JSON and URL-encoded payloads
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Attach Helmet security headers (ContentSecurityPolicy & COEP relaxed to prevent Swagger / Razorpay issues)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts:
        nodeEnv === 'production'
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
      hidePoweredBy: true,
      noSniff: true,
      xssFilter: true,
      frameguard: { action: 'deny' },
    }),
  );

  // Enable CORS with strict origin validation, mobile client compatibility, and preflight caching
  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (such as mobile apps, curl, server-to-server requests)
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (allowedCorsOrigins.includes(requestOrigin) || allowedCorsOrigins.includes('*')) {
        return callback(null, true);
      }
      if (nodeEnv !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${requestOrigin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'Idempotency-Key',
      'X-Idempotency-Key',
      'X-Razorpay-Signature',
      'X-Razorpay-Event-Id',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
    exposedHeaders: ['X-Request-Id', 'Content-Disposition', 'Content-Length', 'Idempotency-Key', 'X-Idempotency-Key', 'Retry-After'],
    maxAge: 86400,
  });

  // Set global prefix and URI versioning (/api/v1/...)
  app.setGlobalPrefix(globalPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Configure Global ValidationPipe (Phase 5 §7.1)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable graceful shutdown hooks (disconnects Prisma & Redis cleanly)
  app.enableShutdownHooks();

  // Configure Swagger / OpenAPI (Phase 5 §16)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Saloon Platform API')
      .setDescription('REST API for Salon Booking & Management Platform')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'OTP login, token management')
      .addTag('Users', 'Customer profiles')
      .addTag('Salons', 'Salon registration and management')
      .addTag('Branches', 'Branch and operating hours management')
      .addTag('Staff', 'Staff profiles, shifts, availability')
      .addTag('Services', 'Service catalogue and branch services')
      .addTag('Booking', 'Appointment lifecycle')
      .addTag('Payments', 'Razorpay payment and invoices')
      .addTag('Notifications', 'Inbox and template management')
      .addTag('Media', 'File upload and management')
      .addTag('Search', 'Geo and text search')
      .addTag('Reviews', 'Customer reviews and replies')
      .addTag('Coupons', 'Coupon validation and management')
      .addTag('Admin', 'Super Admin operations')
      .addTag('Dashboard', 'Revenue and appointment analytics')
      .addTag('Platform Settings', 'Platform configuration')
      .addTag('Health', 'Health and readiness probes')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);
  const logger = app.get(PinoLogger);
  logger.log(
    `Application running on port ${port} [env: ${nodeEnv}] -> http://localhost:${port}/${globalPrefix}/v1`,
  );
  if (nodeEnv !== 'production') {
    logger.log(
      `Swagger UI documentation available -> http://localhost:${port}/${globalPrefix}/docs`,
    );
  }
}

void bootstrap();
