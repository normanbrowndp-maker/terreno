# TRAVEL-020 — Neon test: код, аккаунты и границы

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
- Проверяются role flags и отсутствие neon_superuser membership. Runtime не может быть DB owner, создавать в public или иметь DML/TRIGGER/REFERENCES права; миграционная роль должна владеть выделенной БД. Marker должен принадлежать bootstrap-role, runtime/migrator получают только SELECT.
- Marker не заменяет exact endpoint mapping. При клонировании/переназначении compute нужны новая проверка management metadata и адресная регистрация. Это конфигурационная граница, не криптографическая provider attestation каждого запроса.
- URL: PostgreSQL, exact host,5432/default, точные DB/login, только `sslmode=verify-full`. Дубли/fragment/malformed encoding/routing/session/cert-path/TLS overrides отклоняются. Дополнительные параметры Console URL требуют отдельной оценки.
- Neon profile запрещает наследуемые `PG*` overrides и глобальное отключение TLS validation. Driver certificate-validation override не добавлен. Проверен SSL parser установленного pg; фактический handshake до появления ресурса не выполнялся.
- [GuardedConnection](../src/shared/db/connection-profile.ts) хранит URL в JS `#private`; узкий callback передаёт его только driver constructor. JSON/inspect/string/spread/structuredClone не раскрывают URL/password. Errors/CLI не сохраняют raw cause драйвера. Сам callback — доверенный sink, намеренно логировать raw URL нельзя.
- При изменении target metadata существующий pool требует restart, а не молчаливое переключение цели.

## Минимальный следующий облачный этап и Railway

1. Подтвердить один account/org, Free, регион (предложен Frankfurt), PG17, один compute0.25 CU/scale-to-zero. После **отдельного разрешения** создать новый пустой terreno-test; не clone gloomi/sidequest.
2. Получить реальные management project/org/branch/endpoint/host/owner metadata; сверить связи, зарегистрировать reviewed target. Не копировать fixtures.
3. Отдельный разрешённый bootstrap: роли/ownership, test DB, PostGIS/pg_trgm, marker/ACL. Не запускать `infra/local/init.sql` в Neon как есть и не использовать локальные example credentials.
4. Без печати секретов — отдельное окружение, TLS/identity/no-write smoke; после разрешения cloud migrations — direct0…5, checksums/re-run0 и demo48/12 с повторным seed, spatial/publication/isolation tests. Подтвердить фактические версии: Neon PG17/PostGIS3.5.7 отличается от локальной3.7.0.
5. Перед Railway: production/test separation, region/budget, runtime pooled low-privilege secret storage, отдельный direct migration job, readiness/cold-start budgets, egress/backup/restore/security checks. Railway сейчас не подключался.

## Фактические проверки и блокеры

Fixtures только в `tests/fixtures/neon-test.ts`; рабочий registry пуст. Тестируются неверные IDs/связи/host/database/role/transport/TLS, foreign projects, pre-connect refusal, secret serialization и действительный отказ seed CLI без URL в stderr. Identity тесты используют fake query rows, driver parser не открывает сеть; локальная интеграция использует прежний защищённый PostGIS. Это не cloud integration PASS.

Фактически выполнено до независимого review: `npm run check` exit0 — ESLint/strict, architecture56 files, secrets/docs170 original hashes, dependency gate,104 unit/15 files и24 real local integration/3 files, production build; `npm run test:e2e`14/14 на новой сборке. Первоначально E2E не стартовал из-за занятого3000; остановлен наш старый preview через его сохранённую exec-сессию, флаг reuse/checks не менялся. `.env.local` integrity fingerprint совпал; `git diff --exit-code 1598ee4 -- db/migrations src/shared/db/target.ts src/shared/db/identity.ts infra/local/init.sql` exit0. Все6 миграций и исходные local guards/identity неизменны.

Новые правила прошли RED→GREEN:25 исходных policy assertions,20 identity assertions, malformed password/ambient driver env и invalid public local marker. Entry-point regression дополнительно воспроизведена на старых двух файлах (2 FAIL/1 PASS), после немедленного восстановления новой реализации —3 PASS. Первая попытка вывода replay-log встретила cp1251 UnicodeEncodeError; исходники восстановлены в finally, лог прочитан UTF-8, это не ошибка приложения.

Свежий полный npm audit в этом запуске вернул0 vulnerabilities/exit0, без обновления package/lock и без отключения gate. Исторические16 dev-only findings в старых отчётах/исключении сохраняются как история; причина изменения advisory feed этим заданием не исследовалась. Нельзя выдавать её за наше исправление версии.

Независимое review и итоговые correction/verification результаты дополняются после их завершения. Блокеры реального подключения: нового ресурса/IDs нет, registry пуст, account/provisioning/bootstrap/cloud SQL ещё не разрешены, managed-role/TLS/PostGIS smoke не выполнен, GitHub linkage неизвестен. Это ожидаемые границы подготовки, а не утверждение, что приложение уже подключено к Neon.
