# Документация туристической платформы

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
