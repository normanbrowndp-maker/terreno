# Travel — технический фундамент

Модульный монолит Next.js/TypeScript с PostgreSQL/PostGIS. Реализована только основа этапа 1: техническая стартовая страница, health/readiness, версия API, границы пяти модулей, SQL-миграции и проверки. Каталог, карта, маршрутизация, авторизация и сохранение поездок ещё не реализованы.

Пилот: Астана, Алматы, Бурабай. Модель поддерживает ru/kk/en. Геймификация запрещена.

## Локальный запуск Windows

Node.js26.13.1, npm11.20.0. В существующей папке уже подготовлены ignored portable PostgreSQL и .env.local; их не коммитить и не заменять примером.

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run dev
```

Открыть **http://127.0.0.1:3000**. Проектная БД — **127.0.0.1:55433**; существующие5432/55432 не используются. Для чистой Windows-машины сначала `npm run db:download`, затем команды выше. Docker-альтернатива и подробные условия — в [локальной инструкции](docs/LOCAL_DEVELOPMENT.md).

## Проверки

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` запускает lint, strict typecheck, архитектурные границы, credential-pattern scan, документацию, unit, real-PostGIS integration и production build. Integration требует TEST_DATABASE_URL; тесты не пропускаются при отсутствии БД. Для новой среды `db:local` создаёт dev/test/restore БД и случайные локальные credentials. Файлы скиллов исключены из продуктового test discovery.

`npm run start` запускает готовую production-сборку на loopback3000. `npm run db:local -- stop` останавливает только проектный PostgreSQL. [Backup/restore](docs/BACKUP_RESTORE.md) проверен в отдельной пустой test DB; повтор не перезаписывает непустую цель.

## Документы и ограничения

- [Документация проекта](docs/README.md), [правила агента](AGENTS.md), [отчёт этапа1](docs/STAGE1_REPORT.md).
- [Состояние зависимостей](docs/DEPENDENCY_REVIEW.md): production audit0; полный audit имеет известный upstream dev advisory, результат не скрывается.
- Railway, Neon, AWS SES и Cloudflare только запланированы. Интеграции/деплой/remote/push не выполнялись. CI-файл подготовлен, на GitHub не запускался.
