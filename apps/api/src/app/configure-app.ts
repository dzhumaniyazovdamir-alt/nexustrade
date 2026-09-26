import { type INestApplication, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.enableCors({
    origin: ['http://localhost:4200'],
    credentials: true,
  });
  app.enableShutdownHooks();
}
