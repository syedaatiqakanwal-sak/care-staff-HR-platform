import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: false,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  }));
  app.enableCors({
    origin: process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ['https://aapki-website.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  
  // Request size limits (10MB)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ limit: '10mb', extended: true }));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
