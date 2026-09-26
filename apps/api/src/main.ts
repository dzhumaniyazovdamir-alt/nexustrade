import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { configureApp } from './app/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);

  const port = Number(process.env['API_PORT'] ?? 3000);
  await app.listen(port);
  app.get(Logger).log(`API is listening at http://localhost:${port}/api/v1`);
}

void bootstrap();
