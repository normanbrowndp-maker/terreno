# TRAVEL-022 — создан отдельный Neon terreno-test

Последующий [TRAVEL-023](NEON_TARGET_REGISTRATION.md) повторно подтвердил metadata и сохранил её в pendingTargets. Активных targets нет; состояние полностью пустого registry в исходном отчёте ниже — историческое.

Дата: 2026-11-19. Выполнено ровно одно создание проекта через Neon MCP по прямому разрешению владельца и параметрам [preflight TRAVEL-021](NEON_CREATION_PREFLIGHT.md). После создания читались только management metadata. Этот результат не означает, что приложение подключено к облачной БД.

## Карточка задачи

- **Цель:** создать один изолированный тестовый Neon-проект в norman на Free и зафиксировать реальные идентификаторы без секретов.
- **План:** чистый Git/checkpoint → повторная проверка org/Free/отсутствия проекта/региона/точного JSON → один create_project → read-only проверка проекта, ветки, endpoint, БД/owner → документация → остановка.
- **Зависимости:** опубликованный TRAVEL-020/021, binding Нурман, подтверждённый preflight и отдельное разрешение TRAVEL-022. Checkpoint: `8f7f3842a2c83528fd32710f6010c82aec4e2822`, ветка `feature/neon-test-profile`, исходное дерево/index чистые.
- **Критерии приёмки:** единственный новый terreno-test в выбранном org; Free/Frankfurt/PG17/ветка/БД/owner/compute соответствуют заявке; реальные IDs зафиксированы; существующие проекты не затронуты; registry/миграции/env неизменны; credentials/SQL/bootstrap/seed/push не выполняются.
- **Проверки:** list_organizations/list_projects/list_regions перед созданием; JSON equality с preflight; create_project ровно один раз; describe_project/list_branches/list_postgres_endpoints/list_postgres_databases и повторный org/project list после; локальные docs/secret gate, diff и integrity fingerprints. При timeout повторный create запрещён до перечитывания списка; ошибок/повторных попыток в фактическом выполнении не было.
- **Риски:** auto-suspend/cold start и конечные Free-квоты; после будущего upgrade организации изменятся условия проекта; SQL/TLS/версия PostGIS и ACL не проверены без отдельно разрешённого подключения; bootstrap owner нельзя использовать как runtime.
- **Статус:** **создание и management metadata проверка завершены**. Регистрация approved target и bootstrap не выполнялись и требуют следующего согласования.

## Повторный preflight и стоимость

В подключении **Нурман** `list_organizations` подтвердил org `norman` / `org-lucky-base-56347525`, `plan=free`. Перед созданием был виден только `gloomi`; совпадения `terreno-test` не было. `list_regions` подтвердил `aws-eu-central-1` (AWS Frankfurt). JSON параметров из документа автоматически сопоставлен с утверждёнными значениями, включая history21600 и Free-default suspend0; расхождений нет.

Перечитаны официальные [pricing](https://neon.com/pricing), [Free limits](https://neon.com/faqs/free-plan-limits-and-quotas) и [Create project API](https://neon.com/docs/reference/api/projects/create-project.md). Free — $0, карта не требуется; текущие лимиты100 проектов,100 CU-hours/проект/месяц,1 GB PostgreSQL storage/проект,20 GB суммарно и5 GB egress/проект/месяц. Переход на платный тариф/подтверждение оплаты не требовались и не выполнялись. Повторный `list_organizations` после создания снова показал `free`.

## Подтверждённые безопасные метаданные

| Поле | Значение |
| --- | --- |
| MCP binding | Нурман (Primary не вызывался) |
| Организация / org ID | norman / `org-lucky-base-56347525` |
| Проект / project ID | terreno-test / `broad-wind-62771105` |
| Ветка / branch ID | test / `br-mute-river-bavdwjwl` |
| Default/root branch | true; parent_id отсутствует; одна ветка, state ready |
| Endpoint ID | `ep-curly-moon-ba3f3csy` |
| Direct hostname (без credentials) | `ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech` |
| База | `travel_test_foundation` |
| Владелец БД | `terreno_bootstrap_owner` |
| Регион | `aws-eu-central-1` — AWS Frankfurt |
| PostgreSQL major по management API | 17 |
| Compute type / количество | read_write / один |
| Compute min / max | 0.25 CU / 0.25 CU |
| Suspend timeout metadata | 0 = default плана, на Free5 минут простоя |
| History retention | 21600 секунд (6 часов) |
| Создан (UTC) | `2026-11-19T05:53:14Z` |
| Creation source | neon-mcp-server |

Ссылка на [проект в Neon Console](https://console.neon.tech/app/projects/broad-wind-62771105). Hostname — публичная routing metadata, не URL с паролем. При чтении endpoint был active; истечение5 минут простоя не ожидалось и SQL для пробуждения не выполнялся. Значение policy подтверждено metadata и документацией Free, не отдельным runtime sleep-тестом.

`list_branches` вернул root branch без parent_id. Его `init_source=parent-data` — служебное значение Neon, само по себе не доказывает клонирование внешнего проекта; create_project не содержит parent/import/restore аргументов. После создания список norman содержит ровно прежний gloomi и новый terreno-test. Запросов изменения gloomi или любых вызовов Primary/sidequest не было.

`list_postgres_databases` подтвердил имя единственной БД и owner_name; список ролей не запрашивался, поскольку его опубликованный output допускает поле password. SQL role flags/ACL, наличие PostGIS, patch version сервера, таблицы и TLS handshake не проверялись. Начальная bootstrap-role автоматически создана Neon при создании проекта; runtime/migrator роли вручную не создавались.

## Что сохранено и чего этот шаг не разрешает

- Новые IDs находятся только в этом отчёте. `src/shared/db/neon-test-targets.json` остаётся `{schemaVersion:1, targets:[]}`: ни один endpoint ещё не зарегистрирован как разрешённый runtime target.
- `.env.local`, шесть исходных SQL миграций, код приложения, зависимости и secret-storage настройки не менялись. Перед работой сняты локальные integrity fingerprints для env/registry/миграций без вывода содержимого; итоговая сверка всех8 файлов перед локальным коммитом прошла.
- Получение connection strings/passwords/credentials, SQL, ручной bootstrap, расширения, migrations, seed, Railway/AWS/Cloudflare и paid actions не выполнялись. Дополнительные Neon Auth/Realtime/Functions/Storage/AI Gateway не запрашивались.
- Изменения документации сохраняются только локально. Предыдущее разрешение push относилось к TRAVEL-021; в TRAVEL-022 GitHub push запрещён.

## Локальные проверки и следующая граница

Для этой задачи выполнены: `npm run check:docs` PASS (170 исходных hashes,35 Markdown files, failures0), `npm run check:secrets` PASS (index/worktree/untracked source), `git diff --check` exit0, integrity8 файлов PASS, docs-only tracked diff PASS. Автоматические management metadata assertions также PASS: org/project identity, Free, region/PG17, root branch, endpoint, фактические/default compute, history, database owner и единственный новый проект. Unit/integration/E2E/build повторно не запускались: приложение не меняется, cloud SQL запрещён. Результаты116/24/14 из TRAVEL-020 остаются историческим свидетельством, а не облачными тестами нового проекта.

Следующий шаг — **отдельное согласование регистрации точной разрешённой цели и bootstrap**: reviewed tuple из фактических project/branch/endpoint/host/DB/roles; затем отдельный план PostGIS, identity marker и минимальных прав. Имена будущих runtime/migration ролей в схеме пока не означают их существования. До согласования не заполнять registry, не получать credentials и не подключать приложение. Реальный ресурс уже существует, повторно создавать terreno-test нельзя.
