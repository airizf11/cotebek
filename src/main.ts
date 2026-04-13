// cotebek/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ CORS — restrict origins per environment
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not in DTO
      forbidNonWhitelisted: true, // throw error if unknown props sent
      transform: true, // auto-convert types (e.g string "123" → number)
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.setGlobalPrefix('cteapi');

  app.enableShutdownHooks(); // ✅ graceful shutdown

  // ─── SWAGGER SETUP ────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('CoTEBek API')
    .setDescription(
      'Universal business backend — Laundry, FnB, Arisan, and more.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      // JWT auth button di UI
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addApiKey(
      // x-api-key button di UI
      { type: 'apiKey', in: 'header', name: 'x-api-key' },
      'ApiKey',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Only expose docs in non-production
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('cteapi/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // token tidak hilang saat refresh
      },
    });
  }
  // ──────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
