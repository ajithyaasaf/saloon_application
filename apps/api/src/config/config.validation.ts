import * as Joi from 'joi';

/**
 * Joi validation schema for all required environment variables.
 * The application will exit immediately at bootstrap if any variable
 * is missing or fails validation — before accepting any connections.
 */
export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_PORT: Joi.number().port().default(3000),
  APP_PREFIX: Joi.string().default('api'),
  APP_CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

  // Database
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required()
    .messages({
      'string.uri': 'DATABASE_URL must start with postgresql:// or postgres://',
    }),

  // Redis
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).max(15).default(0),

  // Queue Redis
  QUEUE_REDIS_HOST: Joi.string().hostname().default('localhost'),
  QUEUE_REDIS_PORT: Joi.number().port().default(6379),
  QUEUE_REDIS_PASSWORD: Joi.string().allow('').optional(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Cloudinary (Legacy / Optional)
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),

  // Razorpay
  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Firebase
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),

  // Twilio
  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  TWILIO_FROM_NUMBER: Joi.string().required(),

  // Platform
  DEFAULT_COMMISSION_PERCENTAGE: Joi.number().min(0).max(100).default(10),

  // Storage Infrastructure
  STORAGE_PROVIDER: Joi.string()
    .valid('R2', 'S3', 'LOCAL')
    .default('R2'),
  R2_ACCOUNT_ID: Joi.string().allow('').optional(),
  R2_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  R2_BUCKET: Joi.string().default('saloon-assets'),
  R2_ENDPOINT: Joi.string().uri().allow('').optional(),
  R2_PUBLIC_URL: Joi.string().uri().allow('').optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_S3_BUCKET: Joi.string().default('saloon-assets'),
  AWS_S3_ENDPOINT: Joi.string().uri().allow('').optional(),
  AWS_S3_PUBLIC_URL: Joi.string().uri().allow('').optional(),
  AWS_S3_FORCE_PATH_STYLE: Joi.boolean().default(false),
  LOCAL_STORAGE_DIR: Joi.string().default('./uploads'),
  LOCAL_STORAGE_PUBLIC_URL: Joi.string().default('http://localhost:3000/uploads'),
});

