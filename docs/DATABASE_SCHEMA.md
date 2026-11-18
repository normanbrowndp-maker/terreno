# Проект схемы данных

Статус: **каталожная основа создана на этапе1**, 2026-11-18. В изолированных dev/test БД применены четыре forward-only миграции; PostGIS/pg_trgm и admin-owned marker provisioned отдельно. Реальных POI/пилотных seed нет. Аккаунты/поездки/личные данные ниже — проект этапа5, их таблицы не созданы. Связанные задачи: TRAVEL-006/007; контент — будущая TRAVEL-009.

## Соглашения

UUID для сущностей (генерировать UUIDv4), text + CHECK для конечных статусов, timestamptz для технического времени, date для календарных дат, IANA timezone как text с валидацией библиотекой. `created_at`, `updated_at` устанавливаются сервером, не принимаются произвольно из API. Все обязательные FK индексируются по реальным query patterns. Не создавать весь будущий набор таблиц на этапе 1.

Основное местоположение: **geometry(Point,4326)** с CHECK longitude ∈ [-180,180], latitude ∈ [-90,90] и not-empty; для метров используется cast в geography. Решение этапа1: geography нормализует выход за диапазон до CHECK, geometry позволяет отклонить181° непосредственно в БД. Геометрия будущего маршрута — geometry(LineString,4326). GeoJSON всегда `[longitude, latitude]`. KZ-only — ограничение контента, не координатной модели.

## Каталог: первая схема

| Таблица | Основные поля | Ограничения/связи |
| --- | --- | --- |
| countries | code char(2) PK, default_locale text, active boolean | uppercase ISO alpha-2; справочник разрешённых стран, сначала KZ |
| country_translations | country_code FK, locale, name | PK(country_code,locale), name непустое |
| regions | id UUID PK, country_code FK, code text, timezone text | UNIQUE(country_code,code); UNIQUE(id,country_code) для составной FK |
| region_translations | region_id FK, locale, name | PK(region_id,locale) |
| categories | id UUID PK, code text UNIQUE | стабильные машинные коды |
| category_translations | category_id FK, locale, name | PK(category_id,locale) |
| places | id UUID PK, country_code FK, region_id, location geometry(Point,4326), status text, visit_duration_minutes int nullable, timezone text, address_text nullable, verified_at timestamptz nullable, version int default 1, created_at, updated_at | FK(region_id,country_code) → regions(id,country_code); status draft/published/archived; duration 1…1440, version >0; range/not-empty CHECK |
| place_translations | place_id FK, locale, name, description text nullable | PK(place_id,locale); name 1…200; description plain text ≤20 000 |
| place_categories | place_id FK, category_id FK | PK(place_id,category_id) |
| data_sources | id UUID PK, name text, canonical_url text, license_code text, attribution_text text | URL и лицензия обязательны; неизвестная лицензия не считается разрешённой |
| place_sources | place_id FK, source_id FK, external_id text nullable, source_url text, retrieved_at timestamptz, checked_at timestamptz | PK(place_id,source_id); partial UNIQUE(source_id,external_id) WHERE external_id IS NOT NULL |
| place_media | id UUID PK, place_id FK, storage_key text, alt_text text, author text nullable, license_code text, source_url text, position int | позиция ≥0, UNIQUE(place_id,position); без произвольного browser URL upload |

Локали ru/kk/en подтверждены владельцем и ограничены CHECK. Место перед публикацией должно иметь ≥1 перевод, ≥1 категорию, ≥1 проверенный лицензированный источник и verified_at. **Deferred constraint triggers уже созданы**: блокируют родительское место и проверяют инвариант, включая оба места при переносе дочерней записи. Runtime каталога имеет только SELECT; публичного Data API нет. Текст лицензии/даты — структурная проверка, не автоматическое юридическое подтверждение источника.

На первом этапе часы работы и сезонность — проверенный текст с источником в описании. Не интерпретировать текст как структурированное расписание. Отдельная будущая таблица `place_opening_rules` нужна только перед планированием: day_of_week, local open/close time, valid_from/to, exceptions и timezone. Для неё потребуются отдельный ADR и миграция этапа 6; неизвестное расписание остаётся неизвестным. Цены и доступность инвалидной коляски не выводятся из отсутствующих данных.

## Индексы каталога

- B-tree `places(status,country_code,region_id,id)` для публичных фильтров/порядка; дополнительный `(status,updated_at DESC,id)` только при использовании этой сортировки.
- Реализованы GiST по places.location для bbox и expression GiST по `(location::geography)` для ST_DWithin в метрах. EXPLAIN на реалистичном synthetic объёме нужен до API/performance приёмки; результат указывается в STAGE1_REPORT, не подразумевается наличием индекса.
- pg_trgm GIN по нормализованному `lower(name)` в place_translations для ILIKE/substring; вход и индекс используют одинаковую нормализацию. Длина q минимум 2, максимум 100.
- `place_categories(category_id,place_id)` в дополнение к PK; индексы по FK region/place/source согласно доступу.
- В небольших таблицах planner может обоснованно выбрать seq scan: приёмка не требует искусственно отключать его ради индекса. Использовать реалистичный набор в 10 000 синтетических мест.

## Личные данные: этап 5, не мигрировать сейчас

| Таблица | Основные поля | Инварианты |
| --- | --- | --- |
| users | id UUID PK, auth_subject text UNIQUE, display_name text nullable, created_at, deleted_at nullable | auth_subject относится к выбранному auth adapter; credential/session tables определит библиотека |
| trips | id UUID PK, owner_id FK users, title text, start_date/end_date nullable, default_timezone text, version int default 1, archived_at nullable, created_at, updated_at | title 1…200; обе даты заданы либо обе null; end ≥start; version>0 |
| trip_days | id UUID PK, trip_id FK, day_index int, date nullable, timezone text | UNIQUE(trip_id,day_index); day_index≥0; date согласована с trips в application transaction |
| trip_stops | id UUID PK, trip_day_id FK, place_id FK, position int, visit_duration_minutes int, name_snapshot text, location_snapshot geography, place_version_snapshot int, notes text nullable | UNIQUE(trip_day_id,position) DEFERRABLE INITIALLY DEFERRED; position≥0; duration 1…1440 |
| trip_route_snapshots | id UUID PK, trip_id FK, trip_version int, day_index int, mode text, input_hash text, provider text, calculated_at timestamptz, valid_until nullable, status text, distance_m bigint nullable, duration_s bigint nullable, geometry geometry nullable, legs jsonb, place_versions jsonb, result_schema_version int | UNIQUE(trip_id,day_index,mode,input_hash); метрики ≥0, calculated/partial/unavailable; legs/place_versions валидированы по DTO/schema version; snapshot не является живой дорогой; geometry nullable при отказе |
| favorites | user_id FK, place_id FK, created_at | PK(user_id,place_id) |
| visits | user_id FK, place_id FK, visited_on date, notes text nullable, created_at | PK(user_id,place_id,visited_on); будущий повторный визит в другой день разрешён |

Повтор одного места в поездке разрешён: утренний и вечерний визит могут быть разными stop. Владение stop/day определяется join с trips.owner_id; отдельный owner_id на каждой дочерней таблице не вводится без необходимости. Ответ для чужой/отсутствующей сущности одинаковый 404. Сессии/пароли не проектируются до выбора auth; самописное хранение паролей исключено.

Удаление учётной записи: транзакционно удалить/анонимизировать личные данные согласно согласованной политике; backup retention и связанные session records учитываются отдельно. Каталог не удаляется вместе с пользователем. Архивирование места не удаляет trip_stops: snapshot доступен владельцу с предупреждением о недоступности текущей карточки. Публичный каталог скрывает archived.

Индексы: trips(owner_id,updated_at DESC,id); trip_days(trip_id,day_index); trip_stops(trip_day_id,position); favorites/visits по user_id; отдельный индекс FK place_id для проверки связей при изменении каталога. Общий публичный cache для этих таблиц запрещён.

## Транзакции и конкурентность

`PATCH trip` проверяет owner и expectedVersion в одной транзакции, изменяет данные и увеличивает version ровно на 1. При несовпадении — 409, без частичной записи. Перестановка stop обновляет последовательность с deferred UNIQUE; после commit позиции непрерывны от нуля. Ограничения числа остановок/дат проверяются application layer и integration-тестами; они не выдаются за уже созданные CHECK.

Фактическое время посещения, техническое время сохранения и расчётная длительность дороги — разные поля. Snapshot routing связан с trip_version/input_hash; изменение точки/версии места делает результат устаревшим, не заменяет старые данные молча.

Расчёт хранится для одного дня и mode; input_hash включает trip_version, упорядоченные stop IDs, place IDs/версии/координаты и mode. legs — ограниченный валидированный snapshot ответа, не замена нормализованным stops. place_versions хранит список {placeId,version} для проверки устаревания без запроса к провайдеру. Общая geometry может отсутствовать у partial; рассчитанные участки остаются в legs, total distance/duration=null. Provider call выполняется до короткой транзакции вставки, затем версии перепроверяются; повторный запрос того же hash не плодит дубликаты. Snapshot-владение всегда проверяется через trips.owner_id. При лимите10 остановок JSON snapshot достаточно прост; нормализованная trip_route_legs потребуется только при доказанной необходимости SQL-аналитики по участкам.

## Импорт и качество данных

Импорт принимает только контролируемый файл по схеме, не произвольный URL. Dry-run показывает новые/изменённые/конфликтные записи. Связка source/external_id обеспечивает идемпотентность, UUID seed стабилен. Дубликаты из разных источников поступают на ручную проверку, а не сливаются только по близости координат. Названия, точка и разрешение использования проверяются до published. Синтетические fixtures никогда не объявляются реальными достопримечательностями.

## Безопасные миграции

1. Проверить целевой host/database/role, рабочее состояние Git и текущую версию миграций.
2. Создать commit/checkpoint и backup, проверить возможность восстановления в отдельную БД.
3. Проверить SQL diff: добавление → совместимый backfill → отдельное переключение читателей; не DROP/TRUNCATE/reset.
4. Применить к новой изолированной test DB, затем проверить update с предыдущей версии и повторный запуск runner без повторного применения.
5. Проверить ограничения/индексы, ошибки данных и smoke каталога; зафиксировать результат в CHANGELOG.
6. Миграции в production — только отдельное разрешение. Откат приложения требует обратно совместимой схемы; destructive down не является штатным rollback.

Текущий SQL: [каталог](../db/migrations/1794960000000_catalog.sql), [reparent-инвариант](../db/migrations/1794960000001_publication_move_guard.sql), [нормализация лицензии](../db/migrations/1794960000002_license_normalization.sql), [runtime TEMP privileges](../db/migrations/1794960000003_runtime_privileges.sql). History: public.travel_migrations; checksum: public.travel_migration_checksums. Применённые файлы неизменны, SQL/checksum атомарны. До первого DDL выполняется readonly проверка admin-owned public.travel_database_identity: project_id, purpose и cluster_name. Marker не переносится из dump на другую БД. PostGIS_Version(), distance и EXPLAIN bbox/radius/name на10k synthetic проверены; GIN после bulk load получает штатный pending-list flush, seqscan не отключается.
