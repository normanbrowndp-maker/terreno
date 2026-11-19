# История изменений

Здесь только фактические изменения. Планируемые функции находятся в ROADMAP, а не в changelog готовых возможностей.

## TRAVEL-025.2 — доверенный CA без cloud connection

- Подтверждена рекомендация Neon для Windows: официальный Mozilla/curl CA bundle. Snapshot2026-11-05 и checksum скачаны по проверенному HTTPS только в ignored `.local/neon-ca/`.
- Совпали SHA256,118 CA/сроки/DER ISRG Root X1; файл загружен соседним с psql17.12 OpenSSL без подключения к серверу. Добавлен воспроизводимый офлайн verifier, проверено отклонение изменённой копии.
- Уточнены pinned CA path/hash, точный direct host/verify-full и ручной скрытый ввод через psql -W. Cloud credentials/SQL/ресурсы, `.env.local`, guards/migrations/pendingTargets и GitHub не затронуты.

## TRAVEL-025.1 — Windows TLS channel и inspection SQL

- Офлайн проверены portable psql/libpq17.12, OpenSSL linkage и TLS connection option names; cloud credentials/соединения не использовались.
- SQL00 расширен memberships/всеми user schemas/ACL/effective privileges/defaults/TLS observation, исправлен wildcard;3 локальных READ ONLY теста RED→GREEN, без DDL/roles/extensions/migrations/seed.
- Подготовлена [инструкция скрытого psql prompt](NEON_DIRECT_CHANNEL.md). Утверждение CA/терминала и фактическое облачное выполнение остаются отдельными шагами. Нет activation/env/provider/push изменений.

## TRAVEL-025 — read-only inspection, остановка до SQL

- Повторно подтверждены management metadata exact terreno-test через Нурман. Direct verify-full и скрытая передача credentials не подтверждены доступным SQL/credential tool contract; облачный SQL не вызывался.
- Записаны неизвестные SQL facts, пробелы покрытия00 и конкретный канал, необходимый для продолжения. Никаких cloud writes/credentials/env/registry changes/push; завершённые тесты TRAVEL-024 не повторялись. [Отчёт](NEON_CLOUD_INSPECTION.md).

## TRAVEL-024 — bootstrap SQL и локальная репетиция

- Подготовлены manifest/00_inspect/10_prepare/20_verify, pure metadata/direct TLS policy и отдельный ephemeral local PG17 harness; cloud runner/credentials не добавлены.
- Проверены repeat/rollback/partial/nullable marker, шесть неизменных migrations и ACL/SET ROLE/SECURITY DEFINER отрицательные сценарии; пять Important review findings исправлены. Итог150 unit/24 local integration/15 rehearsal/build/gates PASS; один Minor cleanup path отложен.
- Registry, env, application guards и исходные migrations неизменны; cloud SQL/ресурсы/активация/публикация не выполнялись. [Отчёт](NEON_BOOTSTRAP_REPORT.md).

## 2026-11-19 — TRAVEL-023, неактивные metadata Neon

- Повторно подтверждены реальные org/project/branch/endpoint/host/DB/owner/region/PG17 через безопасные management API Нурман.
- Добавлены strict readonly pendingTargets и root registry validation, запрет unknown/duplicate/promotion; active targets остаётся пустым, реальные подключения блокируются.
- Добавлены24 unit cases (RED→GREEN), исправлено Important замечание review о DNS label validation. Итоговый check140 unit/24 local integration/build/gates PASS. План будущего bootstrap документирован, не исполнялся; облачный SQL/секреты/env changes/push отсутствуют. [Отчёт](NEON_TARGET_REGISTRATION.md).

## 2026-11-19 — TRAVEL-022, отдельный Neon-проект создан

- Через MCP Нурман создан один terreno-test в norman на Free, AWS Frankfurt, PostgreSQL17, test/travel_test_foundation, owner terreno_bootstrap_owner, compute min=max0.25 CU, сон по Free.
- Повторно проверены org/план/отсутствие проекта/точные параметры до создания; после — реальные project/branch/endpoint IDs, database owner и параметры compute. [Отчёт](NEON_PROJECT_CREATION.md).
- Registry остаётся пустым. Приложение, env и миграции не менялись; credentials/SQL/bootstrap/seed/другие провайдеры/GitHub push не выполнялись.

## 2026-11-19 — TRAVEL-021, публикация и Neon preflight

- TRAVEL-020 опубликован обычным push в feature/neon-test-profile; remote SHA исходной вершины73e0881 совпал с локальным, прежние ветки не изменены. Проверены index/worktree и вся достижимая история на секреты/запрещённые пути.
- Нурман/norman подтверждён на Free; найден только gloomi, новый terreno-test не создан. Frankfurt доступен, PG17 поддерживается; подготовлена точная новая project configuration без clone/import.
- Изменены только документы и границы текущего объёма AGENTS; приложение/registry/миграции/зависимости/env не менялись. Подробности и границы следующего разрешения — [отчёт](NEON_CREATION_PREFLIGHT.md).

## 2026-11-19 — TRAVEL-020, локальная подготовка Neon test

- Проверены metadata двух подключений: Нурман → norman/gloomi; Primary → yesenovyesen@gmail.com/sidequest-dev. Связь с GitHub через доступный MCP не установлена и не опровергнута.
- Добавлен явный Neon-test profile с пустым approved registry, точными target/role/TLS guards, разделением runtime pooled / migrations direct / отдельного будущего bootstrap. Исходные шесть миграций, local guards и env не менялись.
- Исправлены три Important замечания независимого review: marker owner/type/ACL, column privileges/role membership и доступ к внутреннему Pool через callback.
- Итог:116 unit,24 локальных integration,14 E2E, strict/lint/build и gates PASS. Облачные SQL/ресурсы, env changes, deploy и push не выполнялись. [Подробный отчёт](NEON_TEST_PROFILE.md).

## 2026-11-18 — завершение Italy review и проверок

- Исправлены обе Important и обе Minor находки независимого source review: completeness/ownership guards, URL filters и pending browser saves.
- Полный check:53 unit/24 real integration/strict/lint/build/gates PASS; final production E2E14/14.34 скриншота и10 PDF comparisons, отсутствие overflow/runtime errors. Реальный owned-DB outage/recovery проверен.
- Production audit0;16 известных dev-only findings остаются открытыми. Только локальная ветка, без push/deploy. Подробности в [ITALY_REPORT](ITALY_REPORT.md).

## 2026-11-18 — TERRENO Italy, TRAVEL-014…017

- Прежняя география заменена Италией по новому запросу; PDF визуально исследован, точный48-city inventory извлечён и независимо проверен по country/coordinates/region ancestry.
- Добавлены пять экранов desktop/mobile, поиск/категории, source/credits page и device-only saved со storage failure/cross-tab обработкой. Типографика/палитра/420px sidebar/88px header следуют PDF; serif явно приблизительный.
- Отдельная editorial demo-коллекция48/12/17 (города/места/Commons photos); readonly API v1 + общий SSR loader, фактический backend/fallback metadata. Production не выдаётся за заполненный.
- Существующий PostGIS расширен двумя additive migrations; исходные0…3 неизменны. Реальные Natural Earth/OSM координатные карты с zoom/pan; улицы трёх городов, остальные — явно ограниченный point overview.
- Добавлены unit/real DB/browser регрессии, сохранены исходные тесты и CI. Локальный docs gate принимает только ранее разрешённый origin terreno. Никакого нового push/deploy.

## 2026-11-18 — Этап 1, TRAVEL-003…008 / TRAVEL-012

- По прямому разрешению владельца создан локальный Git, baseline cec7ee7 и ветка foundation/stage-1; remote/push отсутствуют. Сохранены исходные docs/AGENTS/скиллы.
- Добавлены Next.js16.4.6/React19.3.1/TypeScript5.9.3, strict, ESLint, фиксированный lock/runtime, техническая страница и три технических endpoints; пять модулей только как контракты.
- Подготовлен отдельный portable PG17.12/PostGIS3.7 на55433, случайные ignored credentials, physical cluster/project/purpose guards и runtime без DDL/TEMP. Старые5432/55432 не изменялись.
- Четыре forward-only SQL миграции, атомарные checksum/history, locks, публикационные/лицензионные ограничения. Реальные unit/integration/Chromium E2E/build и restore проверены; числа/команды — в STAGE1_REPORT.
- Добавлены check архитектуры, secrets по Git index+worktree, проверка docs с обратимо проверенной LF/CRLF формой, dependency gate с явным истекающим dev-review. Full audit16 high не скрывается, production0.
- Подготовлен будущий CI с pinned Actions и PostGIS digest; Docker/CI удалённо не запускались. Railway/Neon/SES/Cloudflare только запланированы.
- Независимый review выявил unsafe target/env/index/CI случаи; исправления закреплены регрессионными тестами и новым SQL. Каталог, карта, маршруты, auth и production не реализовывались.

## 2026-11-18 — TRAVEL-011: инструкции и выбор скиллов

- После анализа существующих docs создан корневой AGENTS.md: приоритет функциональности/архитектуры/тестов, выбор минимального подходящего набора скиллов и границы разрешённых действий.
- Добавлены WORKFLOW и отчёт проверки. SKILLS_AUDIT дополнен результатами проверки подключения, ссылок, scanner и безопасного smoke ui-ux-pro-max.
- В проверке этапа 0 разрешён ровно новый AGENTS.md; проверка ссылок распространяется и на него. Проверки исходных хешей, задач, документов и запрет scaffolding сохранены; добавлен отдельный gate точного diff этой задачи.
- Существующие пакеты скиллов/lock, ТЗ, архитектура, схема, API, roadmap и исторические результаты сохранены. Код приложения, глобальные настройки, БД, облако и зависимости не менялись.
- Контрольная точка:188 файлов с проверенными хешами; результаты текущих проверок — в audit/WORKFLOW_VALIDATION.md.

## 2026-11-18 — Этап 0, TRAVEL-001 / TRAVEL-002

### Добавлено

- Документированный исходный аудит папки: продуктовый проект отсутствует; найдены5 локальных скиллов и lock-файл,170 файлов.
- Проверенная временная копия исходных файлов, SHA-256 manifest и воспроизводимая read-only проверка документов.
- PROJECT_VISION, TECHNICAL_SPECIFICATION, ARCHITECTURE, DATABASE_SCHEMA, API_CONTRACTS, ROADMAP, TEST_PLAN, ISSUES, CHANGELOG, DECISIONS.
- README документации, AUDIT_REPORT, SKILLS_AUDIT и audit artifacts с результатами проверки.
- Предложение модульного монолита с PostgreSQL/PostGIS, схема будущих данных/API, этапы0–8, первые10 задач и открытые архитектурные решения.
- Проверка наличия ui-ux-pro-max и поиск дополнительных кандидатов PostgreSQL/Playwright/security/geodata без установки.
- После независимого чтения уточнены границы временного/денежного бюджета планировщика и хранение partial-route по участкам; схема и контракт сохранения маршрута согласованы. Это изменения документации будущих этапов, не реализация функций.

### Проверено / границы

Исходные файлы сравниваются с baseline; результаты текущего запуска и проверки согласованности в audit/VALIDATION. Git-репозитория нет; вместо commit использована файловая контрольная точка. Найдена запущенная служба PostgreSQL и клиент16.1; подключений/миграций/обновления ПО не выполнялось.

### Не выполнено в этом изменении

Приложение не создано; пакеты/скиллы не установлены; Git не инициализирован; БД не создана/изменена; продуктовые тесты и сборка не запускались. Production/cloud/paid API не затрагивались. Архитектура не считается одобренной владельцем; этап1 не начат.
