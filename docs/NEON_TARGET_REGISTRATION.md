# TRAVEL-023 — неактивная регистрация Neon test metadata

2026-11-19. По запросу владельца повторно прочитаны только безопасные management metadata через **Нурман**. Создание/изменение ресурсов, credentials/connection strings, Neon SQL, bootstrap, cloud migrations/seed, env changes, Railway и push не выполнялись. Исходные изменения уже сохранены локальным TRAVEL-022 commit2ec5398; рабочее дерево перед задачей было чистым.

## Результат проверки

| Поле | Повторно подтверждено |
| --- | --- |
| Организация | norman / `org-lucky-base-56347525`, Free |
| Проект | terreno-test / `broad-wind-62771105` |
| Ветка | test / `br-mute-river-bavdwjwl`, принадлежит этому проекту |
| Endpoint | `ep-curly-moon-ba3f3csy`, принадлежит этому проекту/ветке |
| Direct host | `ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech` |
| База / owner_name | `travel_test_foundation` / `terreno_bootstrap_owner` |
| Регион проекта и endpoint | `aws-eu-central-1` |
| PostgreSQL management major | 17 |
| Verified at, UTC | `2026-11-19T06:05:56Z` |

Источники: list_organizations, describe_project, list_branches, list_postgres_endpoints, list_postgres_databases. Список ролей не запрашивался: его response допускает password. owner_name подтверждает владельца БД; это не проверка SQL role flags, ACL, membership или identity marker. Существование/права runtime и migration ролей не утверждаются. Вызовов Primary/sidequest, изменения gloomi и SQL нет.

## Registry заполнен metadata, активных целей нет

В [neon-test-targets.json](../src/shared/db/neon-test-targets.json) сохранена одна реальная запись **pendingTargets**, `state=pending-bootstrap`. В ней есть проверенный `bootstrapOwner`, регион и PostgreSQL major; отсутствуют поля runtime/migration roles, пароль, connection string и фиктивные результаты SQL identity.

`targets` по-прежнему **пустой**. [parseNeonTestRegistry](../src/shared/db/neon-test-config.ts) строго проверяет root и обе коллекции, замораживает результат, отклоняет unknown fields, дубликаты endpoint и active/pending collisions. Для старых test-only fixture registry отсутствующий pendingTargets означает[]; статус не выводится из env. Active-only parseNeonTestTarget по-прежнему требует полный roles contract и отвергает pending запись.

approvedNeonTestTarget читает только validated `.targets`. Явный neon-test opt-in с верными реальными IDs всё равно возвращает `Neon test target is not approved` **до создания DB client**. Env-переменные, добавление ролей к pending записи или смена state не активируют её. Подтверждённые metadata — конфигурационный discovery, не provider attestation или разрешение подключения. Любая будущая ручная правка targets — отдельное изменение кода/разрешения с review.

Существующие local guards, private credential holder, SQL identity/role checks, TLS verify-full и runtime pooled / migrations direct / отдельный bootstrap contract не изменены. Known project IDs gloomi/sidequest отклоняются и active, и pending schema. Новая регистрация не включает SQL, PostGIS, серверный TLS handshake или readiness приложения.

## Тесты и ограничения доказательств

Новые19 unit cases в `tests/unit/neon-pending-registry.test.ts`: реальный inactive metadata contract; несовпадающие project/branch/endpoint/host/DB/owner, region/PG/state; unknown role/root fields; duplicate/promotion denial; known foreign projects; sanitized errors; actual migration entrypoint refusal с fake credentials и Client/Pool connect spies (вызовов0). RED:18 FAIL/1 PASS до реализации; GREEN:19 PASS после.

Первый полный `npm run check` после реализации: strict/ESLint/architecture/secrets/docs/dependency/build PASS,135 unit и24 integration на прежней **локальной** изолированной PostgreSQL/PostGIS. Integration suite штатно проверяет локальные migration/seed сценарии; это не облачный SQL и не запуск bootstrap нового проекта. Production build прошёл. Новые записи не передавались в integration credentials; Neon соединения не открывались. E2E не запускались: пользовательские сценарии/компоненты не менялись. Изменения поведения реальной облачной БД этими тестами не проверены.

Fresh-context review и итоговые проверки фиксируются ниже после завершения. `.env.local` и исходные6 миграций проверяются по fingerprints до локального коммита. Зависимости, исходные локальные guards и runner locks/checksums не менялись.

## Блокеры и следующий шаг

Реальная облачная цель **заблокирована**. Для будущей активной регистрации не хватает разрешённого bootstrap, достоверного подтверждения отдельных runtime/migrator ролей и их privileges, marker/ACL и реального TLS/SQL identity smoke. Следующий этап описан в [плане bootstrap](NEON_BOOTSTRAP_PLAN.md) как предложение, не как выполненная или уже разрешённая операция. До отдельного согласования — остановка перед cloud SQL/credentials.

Карточка задачи, зависимости/критерии/риски — [NEON_REGISTRATION_PLAN](NEON_REGISTRATION_PLAN.md). Использованы writing-plans/executing-plans, TDD, security-review, Neon/neon-postgres и verification-before-completion; визуальные скиллы/установки не нужны.
