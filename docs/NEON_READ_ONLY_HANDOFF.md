# TRAVEL-025.3 — ручной direct read-only inspection

**Исторический вариант:** последующий запрос владельца разрешил самостоятельный MCP SQL. Read-only inspection выполнен агентом; результат — [NEON_CLOUD_INSPECTION](NEON_CLOUD_INSPECTION.md). Ответ/ручной запуск владельца больше не требуется для этого inspection. Direct psql verify-full остаётся непроверенным; инструкция ниже сохранена как альтернативный канал, а не выполненный сценарий.

2026-11-19. Исходный checkpoint `edc2902`, ветка `feature/neon-test-profile`, Git перед задачей чист. **Статус: подготовлено к ручному запуску; результат владельца ещё не получен.** Реальное TLS соединение/SQL и готовность к bootstrap пока не подтверждены. Разрешён только ручной запуск владельцем существующего00, без psql в терминале агента и без получения credentials агентом.

**Цель:** получить безопасный обезличенный результат первого direct verify-full/READ ONLY00. **План:** свежая management сверка → офлайн CA/проверка инструкции → подтверждение владельцем exact цели и собственного защищённого терминала → ручной psql -W → обезличенный отчёт → оценка готовности отдельного bootstrap. **Зависимости:** существующий psql17.12/CA, личный доступ владельца к паролю bootstrap owner. **Критерии:** подтверждение неизменённой клиентской политики и успешного соединения, полный00 без ошибок/усечения, фактические session/owner/extensions/ACL/objects либо честный неизвестный результат. **Риски:** ошибочный проект, раскрытие credentials, неполный вывод, принятие metadata/pg_stat_ssl за доказательство client hostname validation. Проверки — только адресные; большие тесты TRAVEL-024/025.1 не повторять.

## Подтверждено до передачи управления

Через MCP **Нурман** выполнены только describe_project/list_branches/list_postgres_endpoints/list_postgres_databases — management, без SQL и credentials:

| Поле | Сверенное значение |
| --- | --- |
| Организация / тариф | norman / org-lucky-base-56347525 / free_v3 |
| Проект | terreno-test / broad-wind-62771105 |
| Ветка | test / br-mute-river-bavdwjwl |
| Endpoint | ep-curly-moon-ba3f3csy, project/branch совпадают, не disabled |
| Direct hostname | ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech |
| База / management owner | travel_test_foundation / terreno_bootstrap_owner |
| Регион / management PG major | aws-eu-central-1 /17 |
| Compute min/max | 0.25/0.25 CU |

`python -B docs/audit/verify_neon_ca.py` — PASS: файл существует, SHA256 `427c064216761a1e72a8b30f0d954d08cb6e4435a82091fb865afd20c8497285`,118 актуальных CA, ISRG Root X1, загрузка в OpenSSL рядом с libpq170012. Verifier не подключается к сети. Проверка CA не является handshake. База, схемы и данные не читались через MCP.

Адресные локальные проверки: PowerShell Parser и exact direct host/verify-full — PASS (код не исполнялся); публичный блок совпадает с edc2902 побайтно после нормализации CRLF/LF; `check:docs` — PASS (170 исторических hashes,44 Markdown files); `check:secrets` — PASS (index/working/untracked, значения скрыты); `git diff --check` — PASS. Fingerprint `.env.local` совпал с прежним, diff src/db/scripts/package/lock отсутствует. Первая вспомогательная PowerShell проверка сравнения текста дала false failure из-за замены CRLF буквальным `\n`; причину подтвердило сравнение исходных bytes в Python с корректной нормализацией. Блок подключения не исправлялся/не ослаблялся. Продуктовые тесты/build не запускались: изменяется только документация.

## Действия владельца

1. **Перед запуском убедитесь в Neon Console, что выбран именно norman → terreno-test → test → travel_test_foundation**, с Project/Branch/Endpoint ID из таблицы. Роль — terreno_bootstrap_owner. При несовпадении остановитесь. Другие проекты не использовать.
2. Используйте собственный отдельный Windows Terminal/PowerShell `-NoProfile`, без записи/транскрипции и без агентского терминала. Перейдите в `C:\Users\EsenovE\Desktop\Ds`. Пароль не присылайте и не вводите в командную строку. Если защищённого терминала или личного доступа к существующему паролю нет, сообщите только об этом блокере; не сбрасывайте пароль.
3. Выполните офлайн `python -B docs/audit/verify_neon_ca.py`; при FAIL остановитесь. Затем откройте [NEON_DIRECT_CHANNEL.md](NEON_DIRECT_CHANNEL.md) и выполните его существующий PowerShell блок **без изменения** host/CA/verify-full/channel_binding/READ ONLY/SQL path. Полную строку подключения не копировать в чат; здесь она повторно не публикуется.
4. Введите пароль вручную **только** в скрытом prompt `Password for user terreno_bootstrap_owner:` и нажмите Enter. Отсутствие отображаемых символов нормально. Не использовать URI с паролем, env/PGPASSWORD, pgpass, файлы или перенаправление stdin. Агент не запускает psql и не наблюдает ввод.
5. Команда запускает `\conninfo` и ровно [00_inspect.sql](../db/bootstrap/neon-test/00_inspect.sql). BEGIN READ ONLY/SET LOCAL/DO identity guard/COMMIT — управляющая оболочка существующего файла; inventory читает системные каталоги. Не добавляйте произвольные SQL-команды. Не запускать10/20, migrations, seed, DDL/DML.
6. При ошибке сертификата/hostname/пароля/channel binding/identity или неполном выводе — остановиться без автоматического повтора/ослабления TLS. Сообщить только класс ошибки, например `certificate verify failed`, `hostname mismatch`, `password authentication failed`, `identity guard P0001`, `timeout`, `permission denied`. Удалите из сообщения URI/адреса/IP/посторонние идентификаторы, если они встретились; полный stack/terminal dump не присылать.
7. После успеха вручную заполните шаблон ниже. Не сохранять необработанный терминальный вывод через Tee/Start-Transcript/redirect. Перед отправкой просмотрите текст: только метаданные из00, без паролей, токенов, URL подключения, email/IP, личных данных или строк пользовательских таблиц. Отправка вручную проверенного текста в этот чат — предложенный канал передачи результата; если он неприемлем, не подключайтесь и сообщите об этом.

## Шаблон безопасного результата

Не подставлять ожидаемые значения вместо реально увиденных. «Неизвестно» и `(0 rows)` допустимы; отсутствие результата не означает PASS. Короткие значения project/db/role из таблицы не секретны, но connection string не нужен.

```text
Проверил выбранную цель terreno-test/test: да / нет
Защищённый терминал и ручной prompt, без передачи пароля: да / нет
Офлайн CA verifier: PASS / FAIL
Запустил блок NEON_DIRECT_CHANNEL без изменения: да / нет
conninfo: direct host/db/user совпали с таблицей: да / нет
conninfo: TLS version = ...; cipher = ...; bits = ...
psql: завершился без ошибок, финальный COMMIT, exit code 0: да / нет / неизвестно
00: server_version = ...; version_num = ...; read_only = ...
00: current role = ...; session_role = ...; database = ...; owner = ...
00: pg_stat_ssl ssl/version/cipher/bits = ... / нет строки
extensions: имена и версии всех строк, явно отметить postgis/pg_trgm или их отсутствие
roles: атрибуты трёх целевых ролей из00 / отсутствующие роли
memberships: обезличенные строки granted_role/member_role/grantor/admin_option/inherit_option/set_option
schemas/objects: схемы, owner, relkind, estimated_rows, extension_member; пустые результаты указать
SECURITY DEFINER: обезличенные строки / (0 rows)
ACL: обезличенные database/schema/table/column/sequence/default/function и effective privileges из00; пустые результаты указать
Есть пропущенные/усечённые разделы или ошибки: ...
Неожиданные объекты/права/состояние: ... / неизвестно
```

Для сторонних названий можно использовать устойчивые метки OTHER_ROLE_1/OTHER_SCHEMA_1/OTHER_OBJECT_1 вместо раскрытия названий. Сохраните одинаковые метки во всех разделах и все boolean/privilege/owner связи, иначе проверить ACL нельзя. Имена трёх утверждённых ролей и `PUBLIC`/`neon_superuser`/встроенных pg_* ролей можно оставить: они нужны для оценки опасных memberships. Не сокращайте непросмотренные ACL словом «нормально». Если вывод слишком велик для безопасной ручной передачи, остановитесь и сообщите размеры разделов; новый сбор/SQL будет согласовываться отдельно.

## Как будет оценён результат

Успех неизменённой команды с закреплённым CA и verify-full будет свидетельством проверки цепочки/hostname **со слов владельца**, а не самостоятельно наблюдавшимся агентом handshake. `pg_stat_ssl` подтверждает серверную SSL-сессию, но не клиентскую проверку имени. Management major17 не заменяет фактическую server_version; management owner не заменяет SQL owner. Пользовательские receipt GUCs — утверждения клиента, не provider attestation.

Проверим session_user=current_user, точные DB/role/PG17, SQL ownership, установленные extensions, graph memberships/SET/ADMIN/INHERIT, PUBLIC и эффективные ACL/SECURITY DEFINER, все user schemas/объекты. Наличие/отсутствие ролей и расширений не предрешено. estimated_rows — оценка, не доказательство пустоты таблиц; неожиданные объекты означают остановку до дополнительного отдельного решения. При неполном обезличенном результате готовность bootstrap останется неизвестной.

**До ответа владельца реально подтверждены только management metadata и офлайн CA/инструкция.** TLS, SQL state и готовность к bootstrap неизвестны. Любые bootstrap roles/grants/extensions/ownership/10/20, migrations/seed, pendingTargets/env/Railway/GitHub push запрещены и требуют отдельного разрешения после отчёта.
