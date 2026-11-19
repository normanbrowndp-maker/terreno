# TRAVEL-025.1 — Windows direct TLS channel, без cloud connection

**Обновление TRAVEL-025.2:** официальный Windows CA источник подтверждён, локальный bundle подготовлен и офлайн проверен; [источник, fingerprint и проверки](NEON_CA_VERIFICATION.md). Команда ниже теперь содержит проверенный SHA256. Это не разрешение на cloud connection/SQL; исторические результаты TRAVEL-025.1 ниже сохранены.

## Результат и границы

Исходная ветка feature/neon-test-profile, checkpoint ad5ce75; дерево/index были чистыми. Metadata TRAVEL-025 и тесты TRAVEL-024 не повторялись без необходимости. Через MCP credentials не получались, cloud socket/SQL не открывались. `.env.local`, pending registry, исходные6 migrations,10_prepare/20_verify и guards не менялись.

**Цель:** подготовить проверяемую инструкцию direct verify-full и дополнить безопасный read-only inspection. **План:** проверить локальный клиент без сети → RED tests → расширить00 → выполнить только read-only local tests → targeted strict/lint/static/docs/secrets → локальный commit. **Зависимости:** существующий portable psql17, libpq/OpenSSL, позднее согласованные public CA bundle и личный доступ владельца к скрытому prompt. **Критерии:** нет cloud/secret leakage, сохранены guards, локальные запросы работают READ ONLY, TLS capability отделена от фактического handshake. **Риски:** неутверждённый CA, перехват терминала, наследуемые настройки, неполные статистические данные. **Статус:** локальная подготовка выполнена; реальный TLS/SQL ожидает отдельного согласования канала и выполнения.

Найден `.local/postgresql/bin/psql.exe`, версия **17.12** (в текущем PATH psql не найден). Проверена именно соседняя `.local/postgresql/bin/libpq.dll`: PQlibVersion170012, OpenSSL dependency libssl-3-x64.dll, поддерживаются sslmode/sslrootcert/ssl_min_protocol_version/sslcertmode/gssencmode/channel_binding/host/hostaddr. Для проверки PQconndefaults читались только имена опций, не значения environment/credentials; сетевых вызовов не было. Это подтверждение локальной возможности TLS, **не успешный handshake**, не проверка сертификата Neon и не доказательство наличия доверенного root CA.

По [libpq17 SSL](https://www.postgresql.org/docs/17/libpq-ssl.html) verify-full проверяет цепочку и hostname. На Windows libpq/OpenSSL trust не следует автоматически отождествлять с Windows Certificate Store: нужен проверенный public CA bundle. На момент TRAVEL-025.1 его источник/fingerprint не были определены; TRAVEL-025.2 подготовил официальный Mozilla/curl snapshot 2026-11-05. Не использовать скачанный с непроверенного сервера leaf как новый доверенный root, не ослаблять до require/verify-ca.

## Credentials — только скрытый prompt владельца

Предлагаемый канал: владелец вручную запускает psql в **отдельном доверенном локальном терминале**, не в Codex tool/PTY, не под записью/транскрипцией. `-W` принудительно запрашивает пароль без echo. Пароль не входит в команду/URL, shell variables/history, PGPASSWORD, файл или MCP-ответ. Не вставлять connection string/пароль в чат, SQL-редактор, командную строку или clipboard-автоматизацию агента. psql получает пароль непосредственно в собственную память; агент не участвует в вводе. Компрометированный/записываемый терминал эта схема не защищает — при таком окружении остановка.

`-X` исключает psqlrc, `-f` исключает интерактивный SQL history, passfile=NUL исключает подбор пароля из pgpass, sslcertmode=disable — автоматический client cert/key, gssencmode=disable исключает альтернативный GSS encryption. Наследуемые PG*/PSQL*/OPENSSL* настройки должны отсутствовать. Никаких -a/-e/-b, output/log-file/tee/Start-Transcript. Пароль скрытого prompt не является PowerShell-командой. [psql options](https://www.postgresql.org/docs/17/app-psql.html), [почему не PGPASSWORD](https://www.postgresql.org/docs/17/libpq-envars.html).

## Точная инструкция — НЕ запускалась, требует согласования

1. В новом обычном PowerShell `-NoProfile` перейти в `C:\Users\EsenovE\Desktop\Ds`. Отключить запись терминала средствами владельца. Не запускать эту инструкцию в инструментальном терминале агента.
2. Непосредственно перед подключением повторно сверить management tuple через Нурман, включая host без -pooler, branch/endpoint/database/owner/region/PG17. Прежние metadata не являются вечным разрешением для изменённого endpoint. В случае несовпадения — остановка.
3. Проверить подготовленный `.local/neon-ca/approved-ca.pem` командой `python -B docs/audit/verify_neon_ca.py` (только офлайн). Источник — официальный curl/Mozilla snapshot, SHA256 зафиксирован ниже и в [отчёте](NEON_CA_VERIFICATION.md). Не устанавливать CA в Windows trust store. При отсутствии файла, изменении fingerprint или истечении CA — остановиться; не скачивать замену автоматически. CA не секрет, но его подлинность критична.
4. После отдельного согласования выполнить следующий **не содержащий секретов** код. Он устанавливает только локальные переменные процесса; `.env.local` не используется и не меняется.

```powershell
$ErrorActionPreference = 'Stop'
if (@(Get-ChildItem Env: | Where-Object Name -Match '^(PG|PSQL|OPENSSL_)').Count) {
  throw 'Inherited PostgreSQL/OpenSSL settings detected; use a clean terminal.'
}
$caFile = (Resolve-Path -LiteralPath '.local/neon-ca/approved-ca.pem').Path
if ((Get-FileHash -LiteralPath $caFile -Algorithm SHA256).Hash -ne '427c064216761a1e72a8b30f0d954d08cb6e4435a82091fb865afd20c8497285') {
  throw 'Unapproved CA bundle fingerprint.'
}
$caForLibpq = $caFile.Replace('\','/')
$inspectConnection = "host=ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech port=5432 dbname=travel_test_foundation user=terreno_bootstrap_owner sslmode=verify-full sslrootcert='$caForLibpq' ssl_min_protocol_version=TLSv1.2 sslcertmode=disable gssencmode=disable channel_binding=require passfile=NUL connect_timeout=10 options='-c default_transaction_read_only=on -c travel.bootstrap.project_id=broad-wind-62771105 -c travel.bootstrap.branch_id=br-mute-river-bavdwjwl -c travel.bootstrap.endpoint_id=ep-curly-moon-ba3f3csy -c travel.bootstrap.host=ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech'"
& '.local/postgresql/bin/psql.exe' -X -W -v ON_ERROR_STOP=1 -v VERBOSITY=terse -P pager=off -d $inspectConnection -c '\conninfo' -f 'db/bootstrap/neon-test/00_inspect.sql'
if ($LASTEXITCODE -ne 0) { throw 'Read-only inspection failed; stop, do not downgrade TLS or retry writes.' }
```

Пароль вводится только в появившийся скрытый prompt. Если SCRAM channel binding не поддерживается, сертификат не проходит проверку, CA/hostname/роль не совпадают или соединение недоступно — отказ; параметры не ослаблять автоматически. Наличие параметра channel_binding в libpq проверено, поддержка удалённой стороной пока неизвестна. Не добавлять `hostaddr` вместо endpoint-host и не использовать pooled hostname.

Успешное подключение с этими зафиксированными параметрами и утверждённым CA будет клиентским evidence проверки цепочки/hostname; conninfo показывает текущий host/TLS параметры без пароля. Server-side pg_stat_ssl — дополнительное наблюдение, не доказательство verify-full клиентом. SQL session/current_user/database/version сверяются guard и выводом00. Пользовательские receipt GUCs — утверждения клиента после management проверки, не provider attestation. Зафиксировать только безопасный итог/ошибку класса, не raw terminal dump с возможными посторонними данными. Запрос SQL не может сам доказать Neon project/endpoint identity.

## Read-only SQL исправлен и проверен локально

00 сохраняет BEGIN READ ONLY/guard/COMMIT, добавляет statement/lock timeout, server version/session role/read_only и server TLS observation. Исправлен pgX wildcard; inventory включает все user schemas, owners, extension provenance, estimated rows; добавлены memberships ADMIN/INHERIT/SET, raw database/schema/table/column/default/function ACL и effective DB/schema/table/column/sequence/function privileges (включая MAINTAIN). CASE защищает privilege-функции от неподходящих relkind. Password fields, function source и пользовательские строки не выбираются.

`estimated_rows` — статистика, не точный COUNT. Неожиданные таблицы/схемы/objects/ACL означают остановку и отдельное решение о bounded read-only проверке данных; нулевая оценка не доказывает пустоту. Если каталог слишком велик или timeout/permission error — не продолжать частичный аудит как PASS, согласовать pagination/scope. Облачные схемы/роли могут отличаться от локальных — текущие тесты этого не удостоверяют.

Новые tests/inspection-local: RED2 FAIL/1 PASS на старом SQL → **GREEN3/3**. Выполнены только SELECT/session settings на прежнем физически проверенном localhost test cluster; не создавались роли/extensions/objects, не запускались migrations/seed. Только тестовая копия SQL заменяет ожидаемый bootstrap login на существующий local test migrator; облачный guard не ослаблен. Проверены наличие обязательных полей, READ ONLY и отказ foreign receipt с rollback. Тесты TRAVEL-024 и cloud handshake не повторялись.

## Следующая граница

Финальные адресные проверки TRAVEL-025.1: `npm run typecheck` и `npm run lint` — PASS; `npm run test:unit -- tests/unit/neon-bootstrap-plan.test.ts` — **10/10 PASS**; `npm run test:inspection:local` — **3/3 PASS**; `npm run check:docs` — PASS (170 исторических hashes,42 Markdown files); `npm run check:secrets` — PASS (index + working/untracked, значения скрыты); `git diff --check` — PASS. Отдельно подтверждены неизменность `.env.local` по прежнему SHA256 и отсутствие diff в src/scripts/исходных migrations/10/20/package-lock. Production build, полный integration/E2E и bootstrap rehearsal не повторялись: приложение/guards/migrations не менялись, новый SQL проверен отдельной локальной integration-командой. Проверки не доказывают облачную совместимость или TLS handshake.

На момент TRAVEL-025.1 оставалось определить источник/fingerprint CA; этот пункт закрыт TRAVEL-025.2. Остаются доверенный терминал и скрытый ввод владельца, согласованный доступ к паролю без передачи секрета агенту; затем отдельное согласование выполнения инструкции. Текущее задание запрещает cloud connection/SQL. После успешного разрешённого inspection — отдельное решение по10/20; никакой автоматической активации targets, DDL/migrations/seed, Railway или push. Наличие psql и CA не доказывает реальную доступность endpoint, TLS handshake или SQL identity.
