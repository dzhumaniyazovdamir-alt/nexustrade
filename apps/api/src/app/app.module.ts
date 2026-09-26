import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { validateApiEnvironment } from '@nexustrade/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { DatabaseModule } from '../database/database.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateApiEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport:
          process.env['NODE_ENV'] === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        genReqId: (request, response) => {
          const correlationId = request.headers['x-correlation-id']?.toString() ?? randomUUID();
          response.setHeader('x-correlation-id', correlationId);
          return correlationId;
        },
      },
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
