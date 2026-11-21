# Предлагаемая архитектура

**Актуально, продолжение TRAVEL-026:** модульный монолит Next.js/TypeScript + PostgreSQL/PostGIS сохранён. Hosting команда выберет позже; terreno-test остаётся кандидатом. В registry одна pending-bootstrap запись и ноль active targets. Каталог локально проверяется через существующий pg adapter, остальные module contracts не выдаются за persistence. [Готовность, Neon-specific блокеры и варианты](NEON_INTEGRATION_HANDOFF.md). Прежняя рекомендация controlled ownership не является решением сменить Neon; записи ниже исторические.

**TRAVEL-022 — [создан отдельный Neon test](NEON_PROJECT_CREATION.md).** Free/Frankfurt/PG17, реальные metadata проверены; приложение ещё не подключено, exact target registry пуст. Enrollment, bootstrap, credentials, SQL и push требуют следующего разрешения. Ограничения provisioning в историческом TRAVEL-020 ниже были заменены только для этого единственного создания.

**TRAVEL-020 — [локальный Neon test profile](NEON_TEST_PROFILE.md).** Explicit opt-in и reviewed exact target registry, сейчас пустой. Runtime pooled, migrations/seed direct, bootstrap отдельно. Local guards/identity и шесть миграций сохранены; provisioning/env changes/deploy/push не разрешены.

**Текущая продуктовая география — Италия (TERRENO).** Новый запрос разрешил PDF-интерфейс, подтверждённый каталог и ограниченную географическую карту. Модульный монолит и PostGIS сохраняются; актуальные границы demo/production — [ITALY_IMPLEMENTATION_PLAN](ITALY_IMPLEMENTATION_PLAN.md). Упоминания этапа1 ниже описывают сохранённый фундамент, а не запрет новой разрешённой задачи.

### Итальянский read model и интерфейс

`catalog/model.ts` — проверяемые DTO, `queries.ts` — чистые bounded filters, `postgres.ts` — параметризованный reader существующих tables, `server.ts` — общий SSR/API loader. `seed.ts` явно загружает demo только после проверки владения БД. Новые migrations4/5 добавляют города и ссылки/metadata к places/media; исходные0…3 неизменны. Production rows отделены `dataset`; preview читает только `italy-editorial-demo-v1`. Dev/test при отказе БД используют явно обозначенный bundled snapshot. Production возвращает пустой unavailable snapshot, API503 и maintenance UI; readiness требует postgres/ready. Скрытого резервного каталога в production нет. [Подготовка Railway и ограничения внешней БД](RAILWAY_READINESS.md).

Страницы остаются App Router Server Components с metadata/notFound; интерактивные screens разделены на home/city-index/city/place/saved. Общие photo/cards/filters/shell используются композиционно. Каталог не зависит от внешнего API при просмотре; Commons media и OFL fonts локальны. OSM snapshots — статические данные трёх городов с ограниченной детализацией; Natural Earth — реальный контур Италии. SVG projection/zoom/pan не является routing engine. Display coordinates квантованы до0.001 SVG pixel только для детерминированной SSR; исходные WGS84 не округляются.

Browser bookmarks используют versioned allowlisted IDs и `useSyncExternalStore`, отдельный store на provider; account/trip tables не подменяются. Другие вкладки синхронизируются через storage event. При запрете записи — честный memory-only режим, при corrupt data — сообщение и новый список после действия пользователя. Mutable user singletons на сервере отсутствуют.

Статус: **модульный монолит Next.js/TypeScript + PostgreSQL/PostGIS утверждён владельцем**, 2026-11-18. Минимальная структура и инфраструктурные проверки созданы на этапе1; routing/auth/trips implementations, planner и карта остаются будущими. Исходное состояние сохранено в AUDIT_REPORT; текущее — в STAGE1_REPORT. Ниже сравнение вариантов и целевая модель, не заявление о готовности всего продукта.

## Варианты

| Вариант | Преимущества | Стоимость и ограничения | Вывод |
| --- | --- | --- | --- |
| Next.js + PostgreSQL/PostGIS, модульный монолит | Один язык, единый запуск и deploy; SSR каталога; локальные транзакции; минимум сетевых границ | Нужны дисциплина модулей, явный SQL и контроль cache | **Рекомендация** для первого web-продукта небольшой команды |
| Next.js + отдельный NestJS/Fastify API + PostgreSQL/PostGIS | Независимый API для нескольких клиентов; отдельные циклы релизов | Два runtime, дополнительная auth/network/config/observability сложность | Выбрать сейчас, если есть подтверждённый мобильный клиент/отдельная backend-команда |
| Managed backend с Auth/Data API | Быстрый старт типовых аккаунтов и хранения | Зависимость от провайдера, региона, RLS/API и тарифов; локальная среда сложнее воспроизводится | Возможен после решения о хостинге, сейчас не подключать |

Микросервисы, Kubernetes, отдельный search engine, Redis и очереди не нужны по имеющимся требованиям. Это не вечный запрет: выделение сервисов оправдывается измеренной нагрузкой или независимой командой, а не прогнозом «на годы».

## Стек и зависимость от версий

| Слой | Предложение | Обоснование и граница |
| --- | --- | --- |
| Web | TypeScript strict + React + Next.js App Router, Node runtime | Каталог получает SSR; карта остаётся клиентским модулем |
| Серверная логика | Use cases внутри того же приложения; versioned REST Route Handlers | Можно позже выделить API без переноса бизнес-правил из JSX |
| Данные | PostgreSQL + PostGIS | Реляционная целостность, транзакции, пространственные индексы |
| Доступ к данным | pg + параметризованный SQL, явные row → DTO преобразования | Не обходить PostGIS через непроверенную ORM-абстракцию; SQL review и integration обязательны |
| Миграции | Последовательные versioned SQL через node-pg-migrate | История схемы, блокировка конкурирующих запусков; никаких schema push/reset |
| Валидация | Zod или эквивалент с едиными схемами входа/DTO | Выбор одной библиотеки закрепить в TRAVEL-005, не дублировать правила в UI и API |
| API-описание | OpenAPI 3.1 на этапе 2 | Markdown-контракт текущего этапа превращается в проверяемую схему перед первым API |
| Карта | MapLibre GL JS, отложенная загрузка | Библиотека отрисовки; не содержит готовый каталог, тайлы и routing |
| Тестирование | Vitest + PostgreSQL/PostGIS integration + Playwright Test | Проверять логику, реальную геобазу и сценарии браузера разными слоями |
| Локальный запуск | npm + один web-процесс + изолированный PostGIS | Docker Compose предпочтителен для воспроизводимости; native-вариант требует явного решения |

На этапе0 версии не были установлены. На этапе1 закреплены Node26.13.1/npm11.20.0, Next16.4.6/React19.3.1/TypeScript5.9.3, pg8.23.1, node-pg-migrate9, Vitest5.1, Playwright1.65.1. Native Postgres17.12/PostGIS3.7 проверены; Compose/CI image17-3.7 закреплён digest. ESLint9.39.5 выбран из-за peers; EOL и upstream dev advisory явно разобраны в DEPENDENCY_REVIEW. Существующий PostgreSQL16/psql16.1 не изменялся.

Официальная [документация установки Next.js](https://nextjs.org/docs/app/getting-started/installation) — источник runtime/React prerequisites; [политика Node](https://nodejs.org/en/about/previous-releases) — для выбора LTS, а не предположение по установленной версии. Проверить совместимость инструментов с выбранным Node до фиксации. [Политика PostgreSQL](https://www.postgresql.org/support/versioning/) — для оценки поддержки и обновлений, без автоматического обновления локальной службы.

## Логическая схема

```text
Браузер: каталог / карта / редактор поездки
          │ HTTPS, JSON DTO
          ▼
Next.js Route Handlers / server-side page loaders
          │ parse → auth/limits → use case
          ▼
Модули: catalog | geography | routing | identity | trips | planner
          │ repository ports             │ provider ports
          ▼                              ▼
PostgreSQL + PostGIS              tiles / routing / mail / optional LLM
```

Server-side страницы вызывают тот же application use case напрямую, без HTTP-запроса приложения к самому себе. Валидация и права не должны существовать только в route handler, иначе их обойдёт другой вход. UI не импортирует БД, credentials и provider SDK; public DTO отделены от database row.

## Будущая структура репозитория

```text
src/
  app/                         # страницы, layouts и тонкие api/v1 handlers
  modules/
    catalog/                   # place/category, read use cases, репозитории
    geography/                 # страны/регионы/координаты, границы и нормализация
    routing/                   # расчёт участков и provider adapters (этап 4)
    identity/                  # адаптация выбранной auth-библиотеки (этап 5)
    trips/                     # владение, сохранение и version (этап 5)
    planner/                   # ограничения и составление дня (этап 6)
  shared/
    db/                        # pool, транзакции; server-only
    http/                      # errors/requestId, DTO serializers
    config/                    # проверка env без печати секретов
    ui/                        # только общие доступные элементы
db/
  migrations/                  # SQL по возрастанию версии
  fixtures/                    # только тестовые синтетические данные
  seeds/                       # проверенные публичные данные с provenance
tests/
  unit/
  integration/
  e2e/
openapi/
infra/local/                   # compose и локальная инструкция
docs/                          # настоящий пакет документации
```

Внутри модуля достаточно `domain`, `application`, `infrastructure` по мере роста; пустую иерархию для каждого файла не создавать. Публичные интерфейсы ограничены use cases/DTO. Межмодульный доступ к чужим таблицам через публичный query interface/use case, кроме явно описанных транзакций. Никаких глобальных mutable объектов с данными текущего пользователя.

## Границы модулей

| Модуль | Владеет | Использует | Не делает |
| --- | --- | --- | --- |
| geography | countries, regions и координатные правила | PostGIS | Не вычисляет дорожную доступность |
| catalog | places, translations, categories, provenance, media | geography | Не хранит пользовательские достижения/баллы |
| routing | запросы и результаты провайдера | catalog read port, RoutingProvider | Не меняет порядок остановок без согласия |
| identity | профиль, сессия через auth adapter | выбранная библиотека | Не реализует криптографию/пароли самостоятельно |
| trips | приватные поездки, остановки, favorites, visits | identity, catalog, routing result | Не доверяет ownerId от клиента |
| planner | ограничения времени, объяснения, генерация кандидата | catalog, routing, trips DTO | Не сохраняет план без действия пользователя |

## Основные потоки

**Каталог:** parse/normalize query → use case → repository с allowlisted ORDER BY и параметрами → bounded SELECT → DTO. Поиск по имени перевода; JSON не содержит служебные поля БД. Independent fetches выполняются параллельно там, где это действительно устраняет waterfall. Не загружать всю страну ради списка/карты.

**Радиус:** точка хранится как geometry(Point,4326) с CHECK longitude/latitude; geography автоматически нормализует невалидные координаты до CHECK и потому не выбрана каноническим типом. Для метров — `location::geography`, ST_DWithin и соответствующий expression GiST; для bbox — отдельный GiST geometry. Не использовать cast без совпадающего индекса и EXPLAIN. Поведение единиц сверено по [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html); реальная distance-query проверена integration.

**Поездка:** auth → owner-scoped SELECT/version check → одна транзакция замены stop-порядка и версии → commit → приватный DTO. При конкурентной правке 409 и перечитывание, без last-write-wins. Provider HTTP не держит открытую транзакцию. Геометрия/время расчёта хранятся snapshot и помечаются stale после правки остановок или исходных координат.

**Routing:** обычный запрос по отсортированным точкам → adapter с фиксированным endpoint, timeout и allowlisted mode → проверка полученных координат/метрик → нормализованные участки и явные ошибки. Общий deadline 10 с, без бесконечных retry; cancellation действует после ухода со страницы. Детали в API_CONTRACTS.

## Cache, поиск и масштабирование

На первом каталоге достаточно БД и индексов. Общественный cache допустим только для опубликованных данных и с учётом locale/фильтров/версии; приватные endpoints всегда no-store. Поиск первого выпуска — регистронезависимая подстрока имени ru/kk/en с pg_trgm для реального роста. Транслитерация и сложная морфология — отдельные требования, не обещаны автоматически.

Карта запрашивает viewport; при >500 точек API возвращает признак усечения и UI предлагает приблизить карту. Позже можно добавить агрегаты/тайлы по измерениям. Векторный поиск и Elasticsearch не нужны для первого каталога.

Отдельный routing worker/очередь появляется при долгих вычислениях и измеренном ожидании; отдельный API — при независимых клиентах/командах. Выделение сохраняет те же use cases и контракты. Redis — только при доказанной потребности в межпроцессном cache/лимитах, не обязательная зависимость сейчас.

## Локальная среда и эксплуатация

Реализовано: web loopback3000; отдельный portable PostgreSQL/PostGIS loopback**55433**; отдельные dev/test/runtime/migrator роли и БД. 5432 и55432 заняты существующими listener и не меняются. Docker/WSL не устанавливались; native бинарники и data directory только в ignored .local, с проверкой владения cluster. Compose предложен как альтернативный воспроизводимый запуск на машине с Docker, здесь не исполнялся.

Будущие переменные: DATABASE_URL (runtime), MIGRATION_DATABASE_URL, TEST_DATABASE_URL, APP_BASE_URL, выбранные provider endpoints; секретные значения не публиковать. `.env.example` содержит только вымышленные локальные значения. Перед integration/reset проверить loopback host, отдельное имя `travel_test_*` и роль; одного NODE_ENV недостаточно. Destructive reset dev/production запрещён.

Команды dev/build/lint/typecheck/test:unit/test:integration/test:e2e/db:migrate и quality scripts созданы; db:seed отложен до проверенного контента. CI-конфигурация подготовлена с disposable PostGIS и без production credentials, на GitHub не запускалась. Миграции не запускаются из build/start. Readiness проверяет соединение/PostGIS/последнюю миграцию, live — процесс; ошибки не возвращают SQL/credentials.

Restore проверен в отдельной новой test DB. Владелец задал будущую инфраструктуру Railway+Neon+AWS SES+Cloudflare; регион, production SLA/RPO/RTO и настройки интеграций ещё не определены. Создание ресурсов, подключение аккаунтов/почты/платных API и deploy сейчас не разрешены.

## Карты и внешние данные

MapLibre не поставляет карту самостоятельно: отдельно выбрать style, тайлы, glyphs и attribution. Собственный POI-каталог не зависит от live Overpass/Nominatim. [Политика публичных OSM-тайлов](https://operations.osmfoundation.org/policies/tiles/) описывает ограничения, attribution и отсутствие гарантии доступности. [Политика публичного Nominatim](https://operations.osmfoundation.org/policies/nominatim/) ограничивает суммарную частоту и запрещает клиентский autocomplete. Не строить production-поиск на этих сервисах по умолчанию.


### Integrity and browser-state corrections after the Italy review

Read readiness checks the exact IDs/slugs and city–place membership of the named versioned collection before exposing PostgreSQL data. A partial seed is `bundled/incomplete-seed` in dev/test and `unavailable/incomplete-seed` with API503 in production; SQL/credentials are not serialized. Seed parent upserts require `RETURNING id` ownership before any dependent translation/media/association write; rejection rolls back the whole transaction. Local filter state uses the installed Next router's native History integration, preserving reload/back/deep links. A tab's unsaved temporary additions/removals are reconciled with cross-tab disk changes rather than discarded.
