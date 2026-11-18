# Локальная разработка

Этап1, TRAVEL-005/006/008. Команды выполняются из корня проекта. Проверенные версии: Node26.13.1, npm11.20.0, Next16.4.6, TypeScript5.9.3, PostgreSQL17.12/PostGIS3.7.0 на Windows. Зависимости закреплены exact versions и package-lock.json; runtime — .node-version. Системные Node/PostgreSQL не обновлялись.

## Уже подготовленная Windows-среда

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run dev
```

Приложение: http://127.0.0.1:3000. PostgreSQL проекта:127.0.0.1:55433. Имеющиеся5432 и55432 не менялись. `db:local` не регистрирует Windows service, использует `.local/postgresql` и `.local/postgres-data`. `start` повторяем: существующие роли/БД/env сохраняются; неизвестный data directory не принимается. Инициализатор проверяет cluster_name и data_directory перед provisioning.

Credentials генерируются случайно и хранятся только в ignored `.local/database-state.json` и `.env.local`; не копировать в docs, Git, скриншоты и логи. Если .env.local уже есть, setup его не перезаписывает: при несоответствии адресов корректировать свой env вручную, не сбрасывать БД. Остановка: `npm run db:local -- stop`; статус: `npm run db:local -- status`.

При запуске через Codex Windows sandbox tsx может не иметь доступа к Windows userInfo. В этой сессии необходимые команды запускались разрешённым способом от владельца папки; это не требует изменения глобальных настроек ОС. Обычный пользовательский PowerShell запускает их напрямую.

## Чистая Windows-машина: переносимые бинарники

1. Установить совместимый Node/npm отдельно; скрипты проекта не меняют системный runtime.
2. `npm ci`.
3. `npm run db:download`: скачиваются официальные EDB/OSGeo архивы около470MB, проверяются зафиксированные SHA-256, извлекаются только bin/lib/share в `.local`. Запущенный проектный cluster блокирует замену бинарников.
4. `npm run db:local`, `npm run db:migrate`.
5. `npm run dev`.

Источники архивов: [EDB binary distribution](https://www.enterprisedb.com/download-postgresql-binaries), [PostGIS Windows packages](https://postgis.net/documentation/getting_started/install_windows/released_versions/). Прямые URL и SHA находятся в scripts/install-portable-postgres.ps1. Наблюдавшиеся хеши защищают воспроизводимость скачанной версии, не заменяют независимую подпись издателя.

В PG17 bundle обнаружен неполный набор зависимостей top-level libcurl. Использован полный DLL-набор из postgisgui **того же архива**; обход включён в downloader. Библиотеки из неизвестных источников и системные DLL не заменялись. Архивы/бинарники не коммитятся.

## Docker-альтернатива Linux/macOS или Windows с установленным Docker

Compose подготовлен в infra/local/compose.yaml; образ17-3.7 закреплён immutable digest. Docker на текущей машине не обнаружен, поэтому **Compose локально не запускался**. Не запускать native и Compose на одном порту одновременно.

В новом checkout создать `.env.local` из `.env.example` **только если файла нет**. Для disposable Compose-среды роли используют публичный local-example; это не production credentials. Admin password задать переменной TRAVEL_LOCAL_ADMIN_PASSWORD, не добавлять в Git. Затем:

```text
docker compose -f infra/local/compose.yaml up -d
npm run db:migrate
npm run check
```

Порт по умолчанию55433, bind только127.0.0.1. Volume travel_pg17 отдельный от native data directory и чужих служб. init.sql выполняется entrypoint только для нового volume; не применять его вручную к существующему серверу. `docker compose down` сохраняет volume; не использовать `down -v`/reset для удобства. Смена порта требует согласованного обновления собственных local URLs; guard разрешает только55432/55433.

## Миграции и роли

`db:migrate` использует MIGRATION_DATABASE_URL/travel_migrator/travel_dev. `db:migrate -- --test` — TEST_DATABASE_URL/travel_test_migrator/travel_test_foundation. Каждый URL проходит loopback/name/role/port guard до подключения. Runtime DATABASE_URL — travel_runtime, только SELECT каталога; суперпользователь не используется веб-приложением.

PostGIS и pg_trgm provisioned отдельным admin только в новых БД. Node-pg-migrate9 запускает SQL forward-only, с advisory locks и общей транзакцией. Checksum пишется атомарно вместе с каждой миграцией; изменение применённого файла блокируется. Новые исправления — новым SQL-файлом. Build/start автоматически миграции не применяют.

## Качество и endpoints

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

Unit проверяет конфигурацию/координаты/локали/границы/ready. Integration использует настоящую PostGIS, включает транзакционные synthetic fixtures, checksum/lock/rollback/права. Отсутствие test DB — FAIL, не skip. Playwright запускает production server самостоятельно: сначала нужен build, порт3000 должен быть свободен. После проверки E2E сервер завершается.

`/health/live`200 — процесс жив; `/health/ready`200 — подключение, PostGIS и последняя миграция доступны runtime-роли, иначе503 без secrets/stack. `/api/v1` — только metadata версии. `/api/v1/places` пока404.

Исторические verify_stage0.py и verify_workflow.py проверяют старые snapshot-границы и **ожидаемо неприменимы к разработке этапа1**. Их исходники/отчёты сохранены; новый действующий gate — `npm run check:docs` / docs/audit/verify_stage1.py. Продуктовые проверки не отключались ради их старого условия «кода нет».
