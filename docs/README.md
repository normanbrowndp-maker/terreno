# Документация туристической платформы

**Текущий TRAVEL-026 — [handoff PostgreSQL/Neon для команды](NEON_INTEGRATION_HANDOFF.md).** terreno-test сохраняется; hosting/архитектурный выбор остаётся открытым. Локальная связка runner → runtime pool → каталог/API проверяется отдельно от cloud_admin ACL. Это продолжение существующей работы, без нового cloud bootstrap и без изменения41 predicates. Далее — история предыдущих проверок и рекомендаций, не решение о переезде.

**Текущий TRAVEL-026 — [cloud_admin ACL: варианты проверены локально](NEON_BOOTSTRAP_REPORT.md).** Private schema не эквивалентна function ACL: cast text(geometry) обходит namespace lookup;11 локальных тестов PASS. Поддерживаемый Neon owner-side ACL путь не подтверждён, COMMIT bootstrap заблокирован. Рекомендована среда с контролируемым ownership расширений; production guards/шесть миграций не менялись. Записи ниже — история исследования.

**TRAVEL-026 — [778 конкретных routines и причина EXECUTE установлены](NEON_BOOTSTRAP_REPORT.md).**747 PostGIS/31 pg_trgm, owner cloud_admin, источник PUBLIC; [полный нормализованный список ACL/signatures](audit/neon_routine_evidence.json). Rollback подтверждён. Owner-side исправление проверяется локально; поддержанный Neon путь делегирования ACL пока не подтверждён, COMMIT bootstrap запрещён.

**TRAVEL-026 — [облачный предикат установлен: runtime_routine_allowlist](NEON_BOOTSTRAP_REPORT.md).** Единственная разрешённая rollback-only диагностика вернула P0001; полный откат подтверждён. Лишний effective EXECUTE доказан, конкретная routine/owner/ACL ещё неизвестны; bootstrap с COMMIT не выполнен.

**TRAVEL-026 — [точечная диагностика20 подготовлена локально](NEON_BOOTSTRAP_REPORT.md).** Все41 guard-предикат сохранены; ошибки теперь именованы. Локальная provider ACL модель воспроизведена, точная облачная причина остаётся неизвестной. Нового cloud bootstrap не было; rollback-only диагностика требует отдельного разрешения.

**TRAVEL-026,20 ноября — [0LP01 исправлен, повтор откатился на verify](NEON_BOOTSTRAP_REPORT.md).** Локальные regression/rollback/repeat PASS; единственная разрешённая повторная MCP попытка прошла10 и отказала в20. Откат подтверждён; bootstrap не завершён, дальнейших cloud writes нет.

**TRAVEL-026 — [bootstrap MCP попытка откатилась](NEON_BOOTSTRAP_REPORT.md).** Prepare отказал extensions:0LP01; rollback подтверждён чтением, app roles/extensions/marker не созданы. Перед повтором нужна точечная диагностика ADMIN membership; direct verify-full не заявляется.

**TRAVEL-025.3 — [самостоятельный read-only SQL через MCP выполнен](NEON_CLOUD_INSPECTION.md).** PG17.12/identity/owner/ACL/objects проверены, postgis/pg_trgm доступны, но не установлены; direct TLS verify-full не подтверждён. Bootstrap не запускался.

**TRAVEL-025.3 — [ручной read-only запуск и безопасный ответ](NEON_READ_ONLY_HANDOFF.md).** Свежие management metadata/офлайн CA сверены; ожидается ручной запуск владельца. Реальный TLS/SQL и готовность bootstrap пока неизвестны.

**TRAVEL-025.2 — [проверенный CA bundle для Windows psql](NEON_CA_VERIFICATION.md).** Официальный curl/Mozilla snapshot и SHA256,118 CA/ISRG Root X1, офлайн загрузка в OpenSSL psql17.12; реального подключения/TLS handshake не было.

**TRAVEL-025.1 — [Windows direct TLS инструкция и локальная проверка inspection](NEON_DIRECT_CHANNEL.md).** psql/libpq17.12/OpenSSL проверены офлайн,00 расширен и READ ONLY проверен локально. CA/канал/реальный handshake ещё не согласованы и не выполнялись.

**TRAVEL-025 — [cloud inspection остановлен до SQL](NEON_CLOUD_INSPECTION.md):** metadata подтверждены, direct verify-full/защищённая передача credentials не подтверждены доступным каналом. Реальные SQL результаты отсутствуют; bootstrap не разрешён.

**TRAVEL-024 — [точный bootstrap SQL и локальный отчёт](NEON_BOOTSTRAP_REPORT.md)**, [порядок](NEON_BOOTSTRAP_PLAN.md). Final150 unit/24 local integration/15 isolated rehearsal/build/gates PASS. Cloud SQL/credentials/активация/push не выполнялись; известные ограничения явно отмечены.

**2026-11-19 — [TRAVEL-023: неактивная регистрация Neon metadata](NEON_TARGET_REGISTRATION.md).** Одна pending-bootstrap запись, active targets пуст; [план реализации](NEON_REGISTRATION_PLAN.md), [предложение bootstrap](NEON_BOOTSTRAP_PLAN.md). Cloud SQL/credentials/bootstrap/push не разрешены.

**2026-11-19 — [TRAVEL-022: создан один Neon terreno-test](NEON_PROJECT_CREATION.md).** Нурман/norman, Free, Frankfurt/PG17; реальные project/branch/endpoint IDs проверены. Registry пуст, credentials/SQL/bootstrap/push не выполнялись; приложение ещё не подключено.

**2026-11-19 — [TRAVEL-021: GitHub и preflight создания Neon](NEON_CREATION_PREFLIGHT.md).** TRAVEL-020 опубликован в отдельной feature-ветке. Владелец выбрал Нурман/org norman, Free/Frankfurt/PG17; параметры подготовлены, создание ресурсов ещё не разрешено.

**2026-11-19 — [TRAVEL-020: профиль Neon test и account mapping](NEON_TEST_PROFILE.md)**, [план](NEON_TEST_PLAN.md). Разрешены локальные guards/tests; cloud provisioning/SQL, env changes, provider connections и push запрещены. Approved registry пока пуст.

**2026-11-19 — [TRAVEL-019: проверка Neon](NEON_READINESS.md).** MCP/авторизация и проекты проверены только на чтение; отдельная TERRENO не обнаружена. Подготовлены совместимость и план. Создание ресурсов, миграции и изменение существующих БД не разрешены этим шагом.

**Текущий продукт — TERRENO Italy.** [Дизайн и48 городов](ITALY_DESIGN.md), [план TRAVEL-014…017](ITALY_IMPLEMENTATION_PLAN.md), [источники и фотографии](ITALY_SOURCES.md), [итоговый отчёт и скриншоты](ITALY_REPORT.md). Новый запрос разрешил итальянские экраны/каталог/географическую карту и browser bookmarks; старые stage0/1 ограничения ниже исторические. Следующий явный запрос разрешил [публикацию текущей ветки — TRAVEL-018](GITHUB_PUBLISH.md). Deploy не разрешён.

Дата подготовки: **2026-11-18**, часовой пояс для дат проекта — Asia/Bishkek.

**Исторический результат этапа 1: технический фундамент.** Владелец утвердил Next.js/TypeScript монолит, PostgreSQL/PostGIS, ru/kk/en и пилот Астана/Алматы/Бурабай. Минимальное приложение, миграции и локальные проверки созданы; бизнес-функции каталога/карты/auth пока не реализованы. Результаты и ограничения — в STAGE1_REPORT. Исторические AUDIT_REPORT и audit/VALIDATION описывают состояние этапа 0 и сохранены.

## Навигация

| Документ | Содержание |
| --- | --- |
| [PROJECT_VISION](PROJECT_VISION.md) | Назначение, пользователи, границы продукта, полезные улучшения |
| [TECHNICAL_SPECIFICATION](TECHNICAL_SPECIFICATION.md) | Функциональные и нефункциональные требования, приёмка |
| [ARCHITECTURE](ARCHITECTURE.md) | Варианты стека, модули, потоки данных, локальная инфраструктура |
| [DATABASE_SCHEMA](DATABASE_SCHEMA.md) | Предлагаемые сущности, ограничения, индексы и миграции |
| [API_CONTRACTS](API_CONTRACTS.md) | Проект HTTP API, ошибки, валидация и права доступа |
| [ROADMAP](ROADMAP.md) | Этапы 0–8 и первые 10 задач TRAVEL-001…TRAVEL-010 |
| [TEST_PLAN](TEST_PLAN.md) | Проверки, регрессия, сценарии отказов и контрольные ворота |
| [ISSUES](ISSUES.md) | Факты, риски, предложения, сложность и срочность |
| [CHANGELOG](CHANGELOG.md) | Только фактически внесённые изменения |
| [DECISIONS](DECISIONS.md) | Принятые ограничения, предложения ADR, вопросы владельцу |
| [AUDIT_REPORT](AUDIT_REPORT.md) | Исходная структура, окружение, Git, зависимости и границы аудита |
| [SKILLS_AUDIT](SKILLS_AUDIT.md) | Наличие скиллов, источники и кандидаты без установки |
| [WORKFLOW](WORKFLOW.md) | TRAVEL-011: доступность инструкций и выбор скиллов по задаче |
| [audit/BASELINE](audit/BASELINE.md) | Контрольная точка и воспроизводимая проверка этапа 0 |
| [STAGE1_PLAN](STAGE1_PLAN.md) | План разрешённой реализации технического фундамента |
| [STAGE1_REPORT](STAGE1_REPORT.md) | Фактически выполненное, команды, ошибки и ограничения |
| [LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md) | Запуск native/Compose, роли, env и проверки |
| [BACKUP_RESTORE](BACKUP_RESTORE.md) | Проверенное восстановление в отдельную пустую test DB |
| [DEPENDENCY_REVIEW](DEPENDENCY_REVIEW.md) | Полный audit, production graph и ограниченное dev-исключение |

## Значение статусов

- **Проверено** — есть непосредственное свидетельство в аудите или отчёте проверки.
- **Выполнено** — результат конкретной задачи создан и проверен; не означает одобрение владельцем.
- **Предложено** — проектное решение консультанта, ещё не утверждено владельцем.
- **Запланировано** — работа не начата; перечисленные пути, команды, API и таблицы ещё не существуют.
- **Ожидает решения** — без ответа нельзя выполнять зависимые работы.
- **Не проверено** — свидетельств недостаточно; это не ошибка и не положительный результат теста.

Приоритет: требования владельца → DECISIONS с явно принятыми решениями → TECHNICAL_SPECIFICATION → схемы и контракты → ROADMAP. Противоречие фиксируется в ISSUES и устраняется до реализации. Новый запрос владельца разрешил этап 1; он не разрешает этап2, cloud integration или публикацию.

## Проверка текущего результата

Текущая проверка: `npm run check`, затем `npm run test:e2e` после build; требуется изолированная test DB. Документация/170 исходных хешей: `npm run check:docs`. Подробные фактические результаты — в STAGE1_REPORT.

Исторические `verify_stage0.py` и `verify_workflow.py` были gate этапа0/TRAVEL-011 и сохраняют условия «приложения нет». После разрешённого начала разработки они ожидаемо неприменимы, не используются как продуктовые тесты и не переписаны ради PASS. Действующие инструкции — в [корневом AGENTS.md](../AGENTS.md).
