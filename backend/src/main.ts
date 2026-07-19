import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  // Desarrollo local: permite abrir el frontend desde otro dispositivo de la misma red.
  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // En Render se compila el frontend en ../dist y esta misma API lo publica.
  // En desarrollo local sin build del frontend la API continúa funcionando sola.
  const frontendPath = join(process.cwd(), '..', 'dist');
  const frontendEntry = join(frontendPath, 'index.html');
  if (existsSync(frontendEntry)) {
    app.useStaticAssets(frontendPath);
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (request.method !== 'GET' || request.path.startsWith('/api')) {
        return next();
      }

      return response.sendFile(frontendEntry);
    });
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
