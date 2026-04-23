// cotebek/src/common/config/env.validation.ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),

  // CORS (optional — defaults to *)
  ALLOWED_ORIGINS: Joi.string().optional(),

  SWAGGER_USER: Joi.string().optional(),
  SWAGGER_PASS: Joi.string().optional(),
});
