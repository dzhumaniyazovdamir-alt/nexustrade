import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export function createTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: config.getOrThrow<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    namingStrategy: new SnakeNamingStrategy(),
    extra: {
      max: config.get<number>('DATABASE_POOL_MAX', 10),
      application_name: 'nexustrade-api',
    },
  };
}
