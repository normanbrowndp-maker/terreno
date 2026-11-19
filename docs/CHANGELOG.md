# История изменений

Здесь только фактические изменения. Планируемые функции находятся в ROADMAP, а не в changelog готовых возможностей.

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
