# terreno — A guide to Italy

Итальянский туристический путеводитель на существующем модульном монолите Next.js/TypeScript + PostgreSQL/PostGIS. Интерфейс следует desktop/mobile макетам TERRENO: главная с географической картой, индекс48 городов, страницы городов/мест, поиск/фильтры и сохранённые места на этом устройстве.

Текущая география — только Италия. Первый проверенный editorial demo-набор:48 городов,12 достопримечательностей Firenze/Roma/Milano/Venezia/Napoli и17 реальных Commons-фотографий с атрибуцией. Остальные города не заполнены выдуманными местами. UI — английский, как PDF. Геймификация запрещена.

Это отдельно обозначенная sample-коллекция, не production-каталог. Нет авторизации, cloud sync, дорожных маршрутов или подтверждённых live-часов/цен. Browser bookmarks не подменяют аккаунт. Карта географически реальная, с выбором/zoom/pan; street snapshots доступны для Firenze/Roma/Milano, в других городах честный обзор точек. Источники и права — на `/sources` и в [ITALY_SOURCES](docs/ITALY_SOURCES.md).

## Локальный запуск Windows

Node.js26.13.1, npm11.20.0. В существующей папке уже подготовлены ignored portable PostgreSQL и .env.local; их не коммитить и не заменять примером.

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:seed:demo
npm run dev
```

Открыть **http://127.0.0.1:3000**. Проектная БД — **127.0.0.1:55433**; существующие5432/55432 не используются. Для чистой Windows-машины сначала `npm run db:download`, затем команды выше. Docker-альтернатива и подробные условия — в [локальной инструкции](docs/LOCAL_DEVELOPMENT.md).

Итог TRAVEL-014…017, реальные проверки, источники и локальные скриншоты: [ITALY_REPORT](docs/ITALY_REPORT.md). Владелец отдельно разрешил публикацию `feature/terreno-italia`; ход и проверенный результат — [GITHUB_PUBLISH](docs/GITHUB_PUBLISH.md).

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
