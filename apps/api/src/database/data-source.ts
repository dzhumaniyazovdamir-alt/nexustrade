import 'dotenv/config';
import { validateApiEnvironment } from '@nexustrade/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const environment = validateApiEnvironment(process.env);

export default new DataSource({
  type: 'postgres',
  url: environment.DATABASE_URL,
  entities: ['apps/api/src/**/*.entity.{ts,js}'],
  migrations: ['apps/api/src/database/migrations/*.{ts,js}'],
  synchronize: false,
  migrationsRun: false,
  namingStrategy: new SnakeNamingStrategy(),
  extra: {
    max: environment.DATABASE_POOL_MAX,
    application_name: 'nexustrade-migrations',
  },
});
