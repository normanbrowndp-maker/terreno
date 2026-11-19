# TRAVEL-020 — Neon test: код, аккаунты и границы

Актуализация TRAVEL-023: [реальная metadata запись](NEON_TARGET_REGISTRATION.md) сохранена неактивно в pendingTargets; active targets всё ещё пуст. Утверждения о полностью пустом registry ниже — исторический результат TRAVEL-020/022. Bootstrap/SQL/credentials не выполнялись, активация отдельно.

Последующее состояние: по отдельному разрешению [TRAVEL-022](NEON_PROJECT_CREATION.md) создан новый terreno-test; реальные IDs записаны в отчёте. Этот исторический профиль не регистрирует их автоматически: рабочий registry по-прежнему пуст, bootstrap/SQL/credentials ещё не выполнялись.

2026-11-19. Разрешена локальная подготовка и чтение Neon metadata. Облачные ресурсы/SQL/migrations, credentials retrieval, `.env.local` changes, Railway/AWS/Cloudflare, paid actions, deploy и push не выполнялись. План с целью/зависимостями/критериями/тестами/рисками — [NEON_TEST_PLAN](NEON_TEST_PLAN.md). Checkpoint исходного аудита1598ee4, ветка `feature/neon-test-profile`.

## Две привязки доступа

`Primary` и `Нурман` — friendly names подключений в Codex, не имена Neon org/project/database/role и не GitHub owner/repository. Они выбирают контекст авторизации (`link_id`). Успешное чтение metadata подтверждает доступ к организациям, но не удостоверяет личность человека или различие персональных user IDs.

| Подключение | Организация Neon (имя / ID) | Проект | Ветки | Базы |
| --- | --- | --- | --- | --- |
| Нурман | `norman` / `org-lucky-base-56347525` | `gloomi` / `misty-resonance-03471928` | `production` | `neondb` |
| Primary | `yesenovyesen@gmail.com` (display name организации) / `org-weathered-sound-22479821` | `sidequest-dev` / `holy-fire-78012026` | `production`, `sidequest-school-20261109`, `backup-sidequest-school-20261110`, `sidequest-school-backup-before-024-20261110` | `neondb` во всех; `sidequest_school` в трёх school/backup ветках |

Обе org — Free, по одному видимому проекту, PG18, регион Neon `aws-eu-central-1`. Выполнены list_organizations/projects/branches/postgres_databases и describe_project. Таблицы/строки и SQL не запрашивались, compute не пробуждался нашими SQL. Выделенной TERRENO по именам проектов/веток/БД в этих доступных контекстах нет; содержимое `neondb` и иные аккаунты не исследовались.

**Рекомендуется Нурман/org norman и новый отдельный `terreno-test`**, чтобы организационно отделить TERRENO от sidequest. По Free-квотам преимущества не установлено: планы одинаковы, изоляцию даёт новый проект, а не label подключения. Меньшее число веток чужого проекта не увеличивает квоту нового. Владельцу ещё нужно выбрать один account/org перед созданием; не создавать сразу в обоих. Точный account-wide storage/остаток compute не измерен.

## GitHub: подтверждённое и неизвестное

Git origin приложения — https://github.com/normanbrowndp-maker/terreno.git. Это **GitHub repository**, не Neon org/project/database. У обоих Neon-проектов `creation_source=console`: факт создания через Console не исключает последующую интеграцию.

В доступном Neon MCP нет инструмента чтения repository integration/installation; полученные project/settings metadata не содержат GitHub repository fields. GitHub OAuth в Neon Auth — другая функция, не Git-привязка, она не запрашивалась. Сходство norman/Нурман с именами GitHub и GitHub avatar не доказывают связь.

**Связь terreno.git с Neon не подтверждена, но её отсутствие также не доказано.** Репозитории gloomi/sidequest неизвестны. Для окончательной проверки нужен экран интеграций Neon/GitHub или отдельный read API с такими сведениями. Новых связей не создавали.

## Проверенная конфигурация, выключенная по умолчанию

[Рабочий registry](../src/shared/db/neon-test-targets.json) — schemaVersion1 и **пустой targets**. Реальных выдуманных IDs/hosts и fixtures в нём нет. Production resolver отклоняет все Neon подключения до создания клиента даже при явном opt-in. Environment не может одобрить target или передать registry JSON.

[Readonly Zod schema](../src/shared/db/neon-test-config.ts) требует project ID/name=`terreno-test`/organization ID, branch→project, endpoint→project/branch/exact direct hostname, database=`travel_test_foundation`, роли runtime=`travel_test_runtime` и migrations=`travel_test_migrator`, отдельную bootstrap role из будущей metadata, verifiedAt/source. Unknown fields отклоняются; вложенные metadata заморожены. Known gloomi/sidequest project IDs дополнительно запрещены.

Схема и поле source **не являются доказательством доверия**: реальная запись допускается только после получения management metadata нового проекта и code review. Pure validator/фальшивые fixtures не разрешают enrollment. Никаких реальных IDs для ещё не созданного terreno-test не назначено.

Несекретные настройки будущего процесса:

| Ключ | Правило |
| --- | --- |
| `TRAVEL_DATABASE_PROFILE` | default local; только точный `neon-test` включает дополнительный путь; unknown profile — отказ |
| `TRAVEL_NEON_TEST_PROJECT_ID` | Точное совпадение approved registry |
| `TRAVEL_NEON_TEST_BRANCH_ID` | Точное совпадение approved registry |
| `TRAVEL_NEON_TEST_ENDPOINT_ID` | Точное совпадение approved registry |

Произвольный `*.neon.tech` не принимается. Pooled hostname выводится из проверенного direct host/endpoint ID; это не wildcard discovery.

## Runtime / migrations / bootstrap

| Операция | Соединение / права | Реализация и ограничение |
| --- | --- | --- |
| Runtime | Pooled, `travel_test_runtime`, read-only | Будущий отдельный `DATABASE_URL`, marker/session-role/privilege verification |
| Migrations и demo seed | Direct, `travel_test_migrator`, владелец тестовой БД без neon_superuser | Существующие команды с `--test` используют `TEST_DATABASE_URL`; dev/restore не разрешены в Neon profile |
| Bootstrap | Direct, отдельная роль из проверенной будущей metadata | Отдельный согласованный привилегированный этап; pure validator требует bootstrap-stage context. Исполняемого bootstrap/DDL CLI нет; runtime/seed/migrate его не включают |

Обычный local development `MIGRATION_DATABASE_URL` не перенаправляется в облако. Не экспортировать Neon env глобально для локальных тестов; позже применять отдельный процесс/secret injection. `.env.local` не заменяется. Обычные integration tests сохраняют local-only guards.

Session advisory locks, checksums, order, forward-only policy и единая транзакция [runner](../src/shared/db/migrate.ts) сохранены; исходные0…5 не менялись. [Transaction pooling Neon](https://neon.com/docs/connect/connection-pooling) не поддерживает session advisory locks: pooled migration URL отклоняется до connect.

## Identity / TLS / секреты

- Старые [target](../src/shared/db/target.ts) и [physical identity](../src/shared/db/identity.ts) сохранены. Local profile делегирует им и не принимает remote автоматически. Некорректный local identity отвергается до сериализации metadata.
- [Neon identity](../src/shared/db/profile-identity.ts) требует `public.travel_neon_test_identity`: ровно один bootstrap marker с project_id/branch_id/endpoint_id/database_name/purpose=`test`. Сверяются actual database, current_user/session_user; отсутствие, копия другой ветки и несовпадение IDs — отказ.
- Проверяются role flags и отсутствие neon_superuser membership. Runtime не может быть DB owner, создавать в public или иметь DML/TRIGGER/REFERENCES права; миграционная роль должна владеть выделенной БД. Marker проверяется через pg_class: обычная таблица, владелец — точная bootstrap-role из approved metadata; table/column modification privileges запрещены и runtime, и migrator. Runtime также не может иметь column INSERT/UPDATE/REFERENCES, CREATE/TEMP на БД, USAGE/UPDATE на public sequences или membership в migrator/bootstrap; migrator не может состоять в bootstrap. Проверка MEMBER консервативно отклоняет членство даже с NOINHERIT.
- Marker не заменяет exact endpoint mapping. При клонировании/переназначении compute нужны новая проверка management metadata и адресная регистрация. Это конфигурационная граница, не криптографическая provider attestation каждого запроса. Bootstrap/operator и reviewed migrations остаются доверенными: DBA способен менять инфраструктуру, а SECURITY DEFINER-функции и дополнительные схемы требуют отдельного анализа перед enrollment. Runtime guard проверяет перечисленные ACL/flags, а не доказывает отсутствие любых возможных SQL side effects.
- URL: PostgreSQL, exact host,5432/default, точные DB/login, только `sslmode=verify-full`. Дубли/fragment/malformed encoding/routing/session/cert-path/TLS overrides отклоняются. Дополнительные параметры Console URL требуют отдельной оценки.
- Neon profile запрещает наследуемые `PG*` overrides и глобальное отключение TLS validation. Driver certificate-validation override не добавлен. Проверен SSL parser установленного pg; фактический handshake до появления ресурса не выполнялся.
- [GuardedConnection](../src/shared/db/connection-profile.ts) хранит URL в JS `#private`; узкий callback передаёт его только driver constructor. JSON/inspect/string/spread/structuredClone не раскрывают URL/password. Errors/CLI не сохраняют raw cause драйвера. Сам callback — доверенный sink, намеренно логировать raw URL нельзя.
- Callback каталога получает замороженный объект только с query-closure, а не Pool: внутренние options/connectionString недоступны через JSON, inspect, spread или свойства callback-аргумента. Регрессионный тест использует настоящий Pool без открытия сокета.
- При изменении target metadata существующий pool требует restart, а не молчаливое переключение цели.

## Минимальный следующий облачный этап и Railway

1. Подтвердить один account/org, Free, регион (предложен Frankfurt), PG17, один compute0.25 CU/scale-to-zero. После **отдельного разрешения** создать новый пустой terreno-test; не clone gloomi/sidequest.
2. Получить реальные management project/org/branch/endpoint/host/owner metadata; сверить связи, зарегистрировать reviewed target. Не копировать fixtures.
3. Отдельный разрешённый bootstrap: роли/ownership, test DB, PostGIS/pg_trgm, bootstrap-owned ordinary marker table, SELECT-only marker ACL и отзыв PUBLIC TEMP/CREATE. Не выдавать runtime membership в migrator/bootstrap или column/sequence write privileges; migrator не получает bootstrap membership. Не запускать `infra/local/init.sql` в Neon как есть и не использовать локальные example credentials.
4. Без печати секретов — отдельное окружение, TLS/identity/no-write smoke; после разрешения cloud migrations — direct0…5, checksums/re-run0 и demo48/12 с повторным seed, spatial/publication/isolation tests. Подтвердить фактические версии: Neon PG17/PostGIS3.5.7 отличается от локальной3.7.0.
5. Перед Railway: production/test separation, region/budget, runtime pooled low-privilege secret storage, отдельный direct migration job, readiness/cold-start budgets, egress/backup/restore/security checks. Railway сейчас не подключался.

## Фактические проверки и блокеры

Изменённые файлы: новые `src/shared/db/{neon-test-config.ts,neon-test-targets.json,neon-test.ts,connection-profile.ts,profile-identity.ts}`; интеграция в `pool.ts`, `migrate.ts`, `src/modules/catalog/seed.ts`, `scripts/seed-italy.ts`. Новые тесты: `tests/fixtures/neon-test.ts`, `tests/unit/{neon-test-profile,neon-profile-identity,neon-profile-entrypoints,runtime-query-port}.test.ts`. Документы: этот отчёт, NEON_TEST_PLAN, ARCHITECTURE, DECISIONS, NEON_READINESS (историческая ссылка), ROADMAP, README, CHANGELOG, ISSUES и текущие границы AGENTS.md. Зависимости/lock/CI не менялись.

Fixtures только в `tests/fixtures/neon-test.ts`; рабочий registry пуст. Тестируются неверные IDs/связи/host/database/role/transport/TLS, foreign projects, pre-connect refusal, secret serialization и действительный отказ seed CLI без URL в stderr. Identity тесты используют fake query rows, driver parser не открывает сеть; локальная интеграция использует прежний защищённый PostGIS. Это не cloud integration PASS.

Итоговый повтор после исправлений review: `npm run check` exit0 — ESLint/strict, architecture56 files, secrets/docs170 original hashes, dependency gate,116 unit/16 files и24 real local integration/3 files, production build; `npm run test:e2e`14/14 на новой сборке. Предыдущий полный прогон до review:104 unit,24 integration,14 E2E. Первоначально E2E не стартовал из-за занятого3000; остановлен наш старый preview через его сохранённую exec-сессию, флаг reuse/checks не менялся. `.env.local` integrity fingerprint совпал; `git diff --exit-code 1598ee4 -- db/migrations src/shared/db/target.ts src/shared/db/identity.ts infra/local/init.sql` exit0. Все6 миграций и исходные local guards/identity неизменны.

Новые правила прошли RED→GREEN:25 исходных policy assertions,20 identity assertions, malformed password/ambient driver env и invalid public local marker. Entry-point regression дополнительно воспроизведена на старых двух файлах (2 FAIL/1 PASS), после немедленного восстановления новой реализации —3 PASS. Первая попытка вывода replay-log встретила cp1251 UnicodeEncodeError; исходники восстановлены в finally, лог прочитан UTF-8, это не ошибка приложения.

Свежий полный npm audit в этом запуске вернул0 vulnerabilities/exit0, без обновления package/lock и без отключения gate. Исторические16 dev-only findings в старых отчётах/исключении сохраняются как история; причина изменения advisory feed этим заданием не исследовалась. Нельзя выдавать её за наше исправление версии.

Независимое read-only review завершено: три Important findings — непроверенные owner/type/ACL marker, column ACL/role escalation и выдача внутреннего Pool callback-у. Все исправлены за один correction pass: отдельный regression прогон сначала12 FAIL/20 PASS, затем32 PASS; после этого повторены полный gate и E2E. Второе независимое review не выполнялось. Полный gate внутри Windows sandbox сначала остановился на uv_os_get_passwd/ENOMEM в os.userInfo (tsx); минимальный вызов воспроизвёл это только внутри sandbox. Тот же код и проверки вне sandbox прошли без изменения пакетов или отключения gates.

Блокеры реального подключения: нового ресурса/IDs нет, registry пуст, account/provisioning/bootstrap/cloud SQL ещё не разрешены, managed-role/TLS/PostGIS smoke не выполнен, GitHub linkage неизвестен. Это ожидаемые границы подготовки, а не утверждение, что приложение уже подключено к Neon.
