# TRAVEL-025 — остановка до SQL на проверке административного канала

2026-11-19. Исходный checkpoint3692eb6d722c7e142fcf92276c5dc7b423c19633, feature/neon-test-profile; index/worktree перед работой чистые. Старые результаты TRAVEL-024 не перезапускались и не выдаются за cloud evidence.

## Карточка задачи

- **Цель:** первый реальный read-only inspection существующей TERRENO test DB с direct PostgreSQL и TLS verify-full, без изменений базы.
- **План:** Git/контекст → management metadata → доказуемый direct TLS и защищённая передача credentials → только00_inspect → сравнение с10/20. До transport proof SQL не разрешён.
- **Зависимости:** Нурман, exact tuple ниже, согласованный административный канал с secret-safe injection и проверкой сертификата/hostname. Наличие SQL-инструмента само по себе этот канал не подтверждает.
- **Критерии:** действительные SQL результаты и TLS evidence либо честная остановка; нет credentials в transcript/logs/Git, DDL/DML/других проектов/env changes/activation/push.
- **Проверки:** свежие5 management metadata calls; контракт SQL/credential tools; официальная документация MCP; статический просмотр00 и сравнение с ранее изученными10/20; docs/secret/diff checks. Без unit/integration/build повторов, поскольку runtime/SQL не менялись.
- **Риски:** принять HTTPS MCP за доказательство direct DB TLS; раскрыть secret через tool response; подменить реальные SQL facts metadata; неполное покрытие00.
- **Статус:** **остановлено до первого SQL**. Direct verify-full/защищённый secret channel не подтверждены доступным интерфейсом. Это не SQL PASS и не оценка MCP как небезопасного сервиса.

## Metadata, повторно подтверждённые через Нурман

| Поле | Значение |
| --- | --- |
| Организация | norman / org-lucky-base-56347525, Free |
| Проект | terreno-test / broad-wind-62771105 |
| Ветка | test / br-mute-river-bavdwjwl, project_id совпал |
| Endpoint | ep-curly-moon-ba3f3csy, project_id/branch_id совпали, read_write |
| Direct hostname | ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech |
| DB / owner_name | travel_test_foundation / terreno_bootstrap_owner |
| Регион / management PG major | aws-eu-central-1 /17 |

Выполнены list_organizations, describe_project, list_branches, list_postgres_endpoints, list_postgres_databases только для заданных org/project/branch. Primary/gloomi/sidequest SQL и изменения не вызывались. Эти данные не подтверждают current_user/session_user, server patch version, extensions, memberships, ACL или отсутствие пользовательских данных.

## Почему SQL не выполнялся

В контрактах доступных run_sql/run_sql_transaction можно явно указать project/branch/compute/database/role, но нет выбора/подтверждения direct PostgreSQL transport, sslmode=verify-full, CA/hostname verification или TLS evidence. compute_id выбирает compute, не доказывает клиентскую TLS-политику. Публичное [описание Neon MCP](https://neon.com/docs/ai/neon-mcp-server) документирует SQL/role/secret scopes, но не удостоверяет transport policy установленного здесь connector. Поэтому нельзя выдать его наличие за подтверждённый direct verify-full.

get_connection_string возвращает строку с паролем; защищённый sink для прямой передачи из MCP в PostgreSQL client без попадания в transcript/logs не согласован и не подтверждён. Этот инструмент, списки ролей с возможными password fields и другие credential tools **не вызывались**. [Neon прямо отмечает](https://neon.com/docs/ai/neon-mcp-server#secrets-in-tool-results), что секреты в результатах инструментов достигают model provider/transcript. secrets=none полезен для MCP metadata, но не является скрытой передачей пароля direct-клиенту. Конфигурация подключения не менялась.

Никаких пробных SELECT, pg_stat_ssl, describe_branch, SQL diagnostics, DO или00_inspect в облаке не запускалось: проверку транспорта нельзя обходить запросом, требующим ещё не утверждённого соединения. pg_stat_ssl сам по себе всё равно не доказывает проверку hostname клиентом.

## Фактический SQL результат и сравнение с bootstrap

| Проверка | Результат |
| --- | --- |
| Direct PostgreSQL / TLS verify-full | Не подтверждено; handshake не выполнялся |
| Реальная server version / current_user / session_user | Не проверены SQL |
| Владелец БД | Только management owner_name, SQL не проверен |
| PostGIS/pg_trgm и другие extensions | Неизвестно, не запрашивались SQL |
| Роли, memberships, ACL, schemas/objects/data | Не проверены SQL |
| Готовность к10_prepare/20_verify | Не подтверждена; запуск запрещён |

00_inspect требует guard receipt GUCs в той же сессии после проверки transport/management; это утверждения клиента, не provider attestation. В00 также обнаружен пробел относительно полного запроса TRAVEL-025: нет inventory memberships/table-column-sequence/default ACL и всех schemas; object inventory ограничен public; нет доказательства отсутствия неожиданных данных. NOT LIKE 'pg_%' в definer filter использует wildcard `_` и может пропускать обычные pgX-схемы (в10/20 это уже исправлено TRAVEL-024). Поэтому даже успешный00 сам по себе не закрыл бы весь запрошенный audit.

Минимальные предложения, **не применённые**: отдельно проверить/дополнить00 только catalog SELECT для memberships/эффективных ACL/всех user schemas и исправить namespace filter; определить ограниченную проверку неожиданных данных без чтения пользовательских строк. Не менять10/20/guards/6 migrations или облако ради обхода этого пробела.

## Что нужно для продолжения

1. Согласованный secret-safe административный канал: exact direct host/5432, проверка CA/hostname, bootstrap login, пароли только в памяти процесса/утверждённом secret injector, без tool-result/command-line/file/log exposure. Либо проверяемое свидетельство transport policy самого административного connector, соответствующее требованиям владельца. Не просить прислать password/URL в чат.
2. Перед соединением — свежая management сверка и действующий pure transport guard. До неё не получать credentials и не открывать DB socket.
3. После согласования покрытия00 — выполнить разрешённый read-only inspection, записать реальные SQL/TLS evidence. Текущее разрешение на read-only сохраняется; повторное разрешение того же чтения не требуется, но недостающий канал должен быть определён.
4. Любые cloud writes10+20, роли/extensions/ownership, LOGIN/активация registry, migrations/seed/Railway/push — отдельное разрешение. В TRAVEL-025 эти действия не выполнены.

Изменяется только документация. Registry остаётся pending; `.env.local`, приложение, SQL00/10/20 и шесть миграций не менялись. Использованы Neon/neon-postgres и verification-before-completion; визуальные скиллы и субагенты не требовались.

Итог локальной проверки: check:docs PASS (170 original hashes,41 Markdown files, failures0), check:secrets PASS, diff --check exit0. Git diff по src/scripts/db/package/lock относительно3692eb6 пуст; fingerprint `.env.local` совпал с ранее сохранённым baseline. Код/SQL/зависимости не менялись, поэтому unit/integration/build/E2E не повторялись. Локальный отчёт сохраняется без push; текущий SHA коммита сообщается отдельно, без self-reference в документе.
