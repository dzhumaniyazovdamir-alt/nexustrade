import {
  ForbiddenException,
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.use((request: Request, _response: Response, next: NextFunction) => {
    const stateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const hasAuthCookie =
      Boolean(request.cookies?.[config.getOrThrow<string>('AUTH_ACCESS_COOKIE')]) ||
      Boolean(request.cookies?.[config.getOrThrow<string>('AUTH_REFRESH_COOKIE')]);
    if (stateChanging && hasAuthCookie && request.headers.origin !== webOrigin) {
      next(
        new ForbiddenException({
          code: 'INVALID_ORIGIN',
          message: 'Request origin is not allowed',
        }),
      );
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.enableCors({
    origin: [webOrigin],
    credentials: true,
  });
  app.enableShutdownHooks();
}
