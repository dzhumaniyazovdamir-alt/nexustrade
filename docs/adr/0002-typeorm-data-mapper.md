# ADR-0002: TypeORM в стиле Data Mapper

- Статус: accepted
- Дата: 2026-09-24

## Контекст

Проект должен изучать PostgreSQL, явные миграции, транзакции, индексы и блокировки без сокрытия возможностей базы.

## Решение

Использовать TypeORM Repository/Data Mapper: entities не содержат application services и не сохраняют себя самостоятельно. `synchronize` всегда отключён; схема изменяется только версионируемыми migrations. Для специальных индексов и блокировок допустим параметризованный SQL в infrastructure adapter.

## Последствия

- persistence отделён от доменного поведения;
- доступны QueryRunner, уровни изоляции и pessimistic locks;
- изменения entities требуют дисциплины миграций;
- TypeORM entities не должны пересекать границу infrastructure/application.
