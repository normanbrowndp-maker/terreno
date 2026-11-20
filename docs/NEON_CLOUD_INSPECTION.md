# TRAVEL-025 — остановка до SQL на проверке административного канала

## TRAVEL-025.3 — фактический результат самостоятельного MCP inspection

2026-11-19: последующий явный запрос владельца разрешил самостоятельный read-only SQL через официальный Neon MCP, с честным указанием неизвестных свойств транспорта. Он заменил требование только ручного psql для этой проверки. Использован **Нурман**, exact project `broad-wind-62771105`, branch `br-mute-river-bavdwjwl`, compute `ep-curly-moon-ba3f3csy`, database `travel_test_foundation`, role `terreno_bootstrap_owner`. Свежие management project/org/endpoint/database сверены; другие проекты не запрашивались SQL. Credentials/connection strings не получались и не сохранялись.

Выполнены три `run_sql_transaction`: первая — session identity, вторая —17 catalog SELECT из00, третья — доступность двух extensions и права bootstrap owner. Во всех первой командой было `SET TRANSACTION READ ONLY`, с локальными timeouts. Для второй транзакции использованы неизменённый DO guard из00 и его receipt GUCs, установленные по management tuple; внешние BEGIN/COMMIT заменены транзакционной оболочкой MCP. Исходный00, guards и миграции не менялись. Результаты не усечены, identity вернул read_only=on/true. 10/20 не запускались.

| Проверка | Настоящий SQL результат |
| --- | --- |
| PostgreSQL | 17.12 (4d8000a), version_num170012 |
| current_user / session_user | оба terreno_bootstrap_owner |
| Database / SQL owner | travel_test_foundation / terreno_bootstrap_owner |
| Роли приложения | travel_test_runtime и travel_test_migrator отсутствуют |
| Bootstrap flags | LOGIN/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS/INHERIT=true, SUPERUSER=false |
| Membership | bootstrap owner → neon_superuser, ADMIN=false, INHERIT/SET=true; всего11 membership rows |
| Установленные extensions | только plpgsql1.0; postgis/pg_trgm отсутствуют |
| Доступные extensions | postgis3.5.7, pg_trgm1.6; это available, не installed |
| Схемы | из user schemas только public, owner pg_database_owner; PUBLIC USAGE, без PUBLIC CREATE |
| Пользовательские relations/routines/SECURITY DEFINER |0 строк; таблиц/представлений/последовательностей и пользовательских routine в проверенных user schemas нет |
| Database ACL | PUBLIC CONNECT/TEMPORARY; bootstrap owner и neon_superuser CREATE/CONNECT/TEMPORARY |
| Table/column/sequence/function ACL | объектов нет; соответствующие результаты пусты, app-role effective checks также пусты из-за отсутствия ролей |
| Default ACL |9 provider rows: creator cloud_admin/public, grantee neon_superuser, grant options; не ACL несуществующего migrator |
| Bootstrap capability observations | database CREATE/public CREATE=true, createrole_self_grant пуст; план10 задаёт его локально |
| pg_stat_ssl | ssl=false, version/cipher/bits=NULL у наблюдаемого PostgreSQL backend |

**Transport boundary:** запросы реально выполнены через MCP, а не через локальный direct psql. API tool выбирает точную цель, но не раскрывает/не удостоверяет клиентский sslmode, CA или проверку hostname. Backend ssl=false не доказывает состояние внешнего участка MCP/proxy и не является PASS verify-full. TLS verification не отключали; direct TLS verify-full остаётся **не подтверждён**. Успешный SQL и HTTPS connector нельзя выдавать за прямой TLS handshake. Ранее подготовленный CA в этом пути не применялся.

**Сравнение с10/20:** исходный owner/PG17, отсутствие app roles/marker/пользовательских объектов и доступность extensions соответствуют начальному состоянию плана. PUBLIC TEMPORARY должен быть отозван bootstrap; существующий provider cloud_admin/neon_superuser default ACL не считается ACL runtime/migrator и не должен автоматически изменяться. Привилегированный bootstrap owner запрещено использовать runtime. Неожиданных пользовательских объектов в catalog inventory не обнаружено; пользовательские строки не читались. Наличие available extension/CREATEROLE не доказывает успешность будущего CREATE ROLE/EXTENSION/ownership — эти операции не проверялись записью.

**Итог:** read-only inspection через MCP завершён. Состояние БД подходит для следующего отдельно разрешаемого bootstrap; выполнение существующих10/20 с их требованием direct verify-full остаётся не разрешённым/не подтверждённым этим MCP evidence. Следующий шаг — решение владельца о bootstrap scope и административном канале; никаких SQL writes, активации registry, migrations/seed/env/Railway/push здесь не выполнено. Исторический отчёт TRAVEL-025 ниже сохранён.

Последующий TRAVEL-025.1 подготовил [Windows direct TLS канал](NEON_DIRECT_CHANNEL.md) и исправил покрытие00 с локальными READ ONLY тестами. Клиентская часть проверена офлайн; CA/реальный handshake/облачный SQL остаются за границей. Исходные результаты ниже сохранены исторически.

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
