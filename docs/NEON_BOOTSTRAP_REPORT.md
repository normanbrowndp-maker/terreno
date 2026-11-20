# TRAVEL-024 — безопасная подготовка bootstrap, без Neon SQL

**Последующее уточнение владельца, TRAVEL-026:** terreno-test сохраняется, окончательное решение о hosting принимает команда позднее. [Handoff локальной интеграции и открытых решений](NEON_INTEGRATION_HANDOFF.md) отделяет проверенный код от cloud_admin ACL blocker. Нового cloud bootstrap нет. Рекомендация controlled ownership далее — результат предыдущего сравнения, не утверждённая смена архитектуры.

## TRAVEL-026 — cloud_admin ACL: сравнение решений, 20 ноября 2026

**Текущий итог: bootstrap остаётся заблокирован; новую облачную попытку не выполнять.** Ниже — результат продолжения после evidence778, а не новый bootstrap-этап. Исторические результаты далее сохраняются. Все прежние незакоммиченные изменения сохранены; checkpoint этого сравнения — ignored `.local/audit/travel026-options-*` (без копии `.env.local`).

Цель: выбрать поддерживаемую границу доступа без расширения runtime allowlist. План: официальные ограничения → локальная модель двух политик → фактические вызовы и шесть миграций → решение. Зависимости: существующий disposable PG17 harness и подтверждённый [список778 routines](audit/neon_routine_evidence.json). Критерий приёмки решения: не меньшая защита, отрицательные тесты, сохранение identity/ACL/marker/ownership и исходных миграций. Основной риск — ошибочно принять namespace lookup за полный контроль EXECUTE.

### Сравнение

| Вариант | Доказательства | Итог |
| --- | --- | --- |
| Делегирование ACL от владельца extension routines | PostgreSQL позволяет владельцу убрать PUBLIC EXECUTE и делегировать bootstrap EXECUTE WITH GRANT OPTION. Прежний локальный тест provider-owned routine снова прошёл: prepare/verify/repeat и rollback. Neon не предоставляет клиентский superuser; cloud_admin — внутреннее зарезервированное имя. В изученной официальной документации нет клиентского механизма управления этими function ACL. Права neon_superuser на таблицы/sequence не дают таких прав на routines. | SQL-механизм корректен, но поддерживаемый способ выполнить его в данном Neon-проекте **не подтверждён**. Это не разрешение SET ROLE cloud_admin и не обещание, что Neon Support выполнит делегирование. |
| Свежая установка в travel_extensions без runtime USAGE | Локально PostGIS и pg_trgm установлены в отдельную схему. Прямые qualified functions/types/operators отклоняются; has_function_privilege остаётся true. Однако casts и заранее связанные view dependencies могут вызвать скрытые routines. | Простая замена predicate на schema USAGE AND function EXECUTE **слабее** действующего allowlist. Для принятия без изменения архитектуры не подходит. |

На этом шаге cloud SQL/MCP не вызывались. Неработающий REVOKE в Neon не повторялся. Не предлагается расширять allowlist, давать runtime membership/USAGE или редактировать системные каталоги. Нового безопасного security predicate, эквивалентного прежнему при существующих geometry-колонках, **не доказано**; production SQL/guards поэтому не менялись.

### Реальные локальные результаты

`npx vitest run --config vitest.bootstrap.config.ts tests/bootstrap-local/extension-boundary.test.ts tests/bootstrap-local/routine-evidence.test.ts` — **11/11 PASS**, два файла. Среда: PostgreSQL17.12, PostGIS3.7.0, pg_trgm1.6; это локальная модель, а не доказательство тождественности версии/хуков Neon. Все кластеры одноразовые localhost, физическая identity проверяется harness; production seed не запускался.

Новый `extension-boundary.test.ts` проверил:

- Fresh private installation возможна; PostGIS extrelocatable=false. Перенос уже установленного PostGIS через обычный ALTER EXTENSION SET SCHEMA не поддержан; обход с UPDATE pg_extension не использовать.
- Без schema USAGE прямые function/type/operator lookups дают42501, unqualified ST_X даёт42883.
- **Все шесть неизменённых SQL-файлов миграций** применены локально одной транзакцией как непривилегированный migrator при `search_path=public,travel_extensions`. При одном public первая миграция отклоняется42704 (geometry не найдена). Это проверка DDL, не production migration runner, не checksum/history runner и не полный продуктовый набор тестов.
- SQL-standard SECURITY INVOKER wrapper для ST_X позволяет текущую проекцию longitude без private schema USAGE и без SECURITY DEFINER. Такой wrapper всё равно отвергается нынешним public routine allowlist; это исследовательская fixture, **не внедрённый bridge**.
- Доказанный обход упрощённого schema predicate: runtime читает `location::text` из public-таблицы с geometry. Скрытая `text(geometry)` имеет EXECUTE=true, schema USAGE=false, naive_callable=false, но cast успешен. При текущем ACL allowlist тот же cast даёт42501. Эта операция не требует предварительного выдавания schema USAGE или создания runtime-объектов.
- Созданная доверенным администратором public SECURITY INVOKER view вызывает скрытые `similarity(text,text)` и `postgis_lib_version()` без runtime schema USAGE. При исходном function ACL тот же SELECT отклоняется42501. Это отрицательный тест возможной зависимости, не утверждение о наличии такой view в TERRENO.
- Гипотеза обхода через PREPARE **не подтвердилась в fixture с переключением session authorization**: lookup перепроверяется и EXECUTE отклоняется42501. Изначально ожидавший успех тест исправлен по фактическому результату; на нём вывод о недостаточности схемы не основан. Документированное ограничение живых prepared sessions не объявляется протестированным для стабильной pooled-сессии.

### Влияние отдельной схемы на существующий код

Миграции000/004 используют unqualified geometry и ST_IsEmpty/ST_X/ST_Y;000 также создаёт geography expression GiST. Остальные001/002/003/005 применились без изменения при том же migration search_path, включая trigger/grant SQL. GiST/types/operators существуют в extension schema; нельзя выдать runtime USAGE ради разрешения lookup всех778 routines.

Runtime `src/modules/catalog/postgres.ts` использует unqualified ST_X/ST_Y, поэтому без bridge перестаёт работать. Локально проверен только ST_X bridge; ST_Y и полный runtime/API набор с ним не реализовывались. Seed использует ST_SetSRID/ST_MakePoint и потребовал бы отдельного административного search_path; seed здесь не запускался. Текущий runner не настраивает spatial search_path явно; его реальный запуск с private schema не проверен. SQL20 требует extensions в public и проверяет public routines; простая смена namespace обошла бы область сканирования, поэтому необходим был бы отдельный пересмотр всей политики, dependencies/casts и lifetime соединений. Ни search_path, ни namespace requirements, ни один из41 predicates не изменён.

### Рекомендация и условие следующего запуска

**Рекомендуемый вариант при сохранении утверждённой строгой политики — PostgreSQL17/PostGIS с контролируемыми владельцами extension routines и ACL.** Сейчас продолжать на существующей локальной среде; выбор/создание облачного сервера или изменение архитектурного решения потребует отдельного согласования. Это сохраняет модульный монолит, PostGIS-модель, шесть миграций и узкие runtime grants; не требует выделять отдельный spatial microservice или переписывать backend. Цена такого решения — отдельная ответственность за обслуживание/backup/обновления либо проверка возможностей другого managed provider; платных ресурсов не создавалось.

Для Neon новый bootstrap имеет смысл **только после подтверждения Neon поддерживаемого owner-side пути**: PUBLIC EXECUTE можно удалить, bootstrap может управлять нужными function ACL (например, получив scoped EXECUTE WITH GRANT OPTION от владельца), и права не возвращаются незаметно при extension update. Это обязательные условия, не найденная функция Neon и не уже выполненное изменение. Затем нужны точная локальная модель предложенного provider механизма, отдельное разрешение облачных изменений и атомарные prepare/verify/после-COMMIT проверки без изменения41 predicates. Пока этих условий нет — COMMIT не готов, retries прекратить. Обращение к Neon от имени владельца не отправлялось.

Новые изменения этого продолжения: только локальный исследовательский тест и адресное обновление существующей документации/статуса. Исходные шесть миграций, db guards, .env.local, pendingTargets и bootstrap SQL сохранены по hashes checkpoint:24/24 файла без изменений. Предыдущие незакоммиченные изменения не удалялись; новый commit/push не выполнялся.

Финальные проверки: `npx tsc --noEmit` PASS после исправления TS2532 в новом тесте явным отказом при пустом manifest; ESLint нового файла PASS; `check:secrets` PASS; `verify_stage1.py` PASS (170 исходных hashes,44 Markdown); `git diff --check` PASS (есть только предупреждения нормализации CRLF). После последней правки теста его6/6 сценариев повторно PASS. Вначале исследовательские ожидания по внутреннему postgis_full_version, casts и prepared statements не совпали с фактическим поведением: fixtures и утверждения уточнены по ошибкам; успешный cached bypass не заявляется. Проверки безопасности продукта не отключались. Полные unit/build/API/E2E не повторялись: приложение не менялось, запущены только указанные локальные DB-тесты и статические проверки.

### Официальные источники

- [Neon: роли и ограничения администратора](https://neon.com/docs/manage/roles): customer superuser отсутствует; cloud_admin зарезервирован. Отсутствие описанного routine-ACL пути не доказывает невозможность provider-side помощи.
- [Neon: поддерживаемые расширения и установка](https://neon.com/docs/extensions/pg-extensions): стандартный CREATE EXTENSION, поддержка PostGIS/pg_trgm; это не гарантия передачи object ownership.
- [PostgreSQL17: privileges](https://www.postgresql.org/docs/17/ddl-priv.html): различие ownership/EXECUTE/schema lookup/type usage; schema revoke не полная граница доступа.
- [PostgreSQL17: CREATE VIEW](https://www.postgresql.org/docs/17/sql-createview.html): USAGE на схемы зависимостей view не требуется вызывающему пользователю.
- [PostGIS: изменение схемы](https://postgis.net/documentation/tips/tip-move-postgis-schema/): ограничение relocation. Изложенный там обход с изменением каталога не предлагается для Neon.

## TRAVEL-026 — конкретные routines/ACL и доказанная причина

2026-11-20: по новому разрешению выполнен ровно один rollback-only прогон через Нурман в том же exact terreno-test tuple. Новый [30_diagnose_routines.sql](../db/bootstrap/neon-test/30_diagnose_routines.sql) после10 читает ровно нарушителей исходного allowlist и завершает транзакцию безусловным RAISE с JSON evidence, даже при count0. BEGIN/COMMIT внутрь MCP batch не передавались. Функции не вызывались, bodies/пользовательские строки/passwords/settings не читались. Все41 условия20 и сам20 неизменны. Preflight и recovery были READ ONLY, с advisory lock23942026. Никаких других write-транзакций/повторов не выполнялось.

**Получен полный список778 уникальных signatures:**747 PostGIS +31 pg_trgm. Полное evidence без усечения — [audit/neon_routine_evidence.json](audit/neon_routine_evidence.json); общие поля owner/ACL/source вынесены в common, запись полностью восстанавливается объединением common с каждой routines-строкой. Число записей/уникальных signatures сверено с серверным count778. Большой вывод в интерфейсе усечён только отображением, артефакт содержит все записи из разобранного JSON.

| Примеры точных signatures | Extension | Owner |
| --- | --- | --- |
| public.postgis_full_version() | postgis | cloud_admin |
| public.st_astext(geometry) | postgis | cloud_admin |
| public.st_astext(geography, integer) | postgis | cloud_admin |
| public.st_z(geometry) | postgis | cloud_admin |
| public.similarity(text, text) | pg_trgm | cloud_admin |
| public.show_trgm(text) | pg_trgm | cloud_admin |

**У всех778:** raw ACL `{=X/cloud_admin,cloud_admin=X/cloud_admin}`; явный EXECUTE для PUBLIC и cloud_admin, grantor=cloud_admin, grant option=false. Эффективный источник runtime EXECUTE — **PUBLIC**, не явный grant runtime и не membership. runtime_superuser=false, runtime_owner_access=false, bootstrap_owner_access=false. Получены также prokind/volatility/extension/SECURITY DEFINER. Предикат20 корректно выявляет лишние права; не все нарушители являются обычными функциями (список включает pg_proc aggregates).

**Корневая причина:** installed extension routines принадлежат служебному cloud_admin. Bootstrap owner не владеет ими и не имеет EXECUTE grant option по собранным ACL. Поэтому `REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public FROM PUBLIC` под bootstrap owner не обеспечивает требуемый результат: при имеющемся EXECUTE PostgreSQL может вернуть warning/no-op вместо ERROR. Именно прежнее предположение об управляемости extension ACL, а не ошибочный allowlist20, оказалось неверным. [Официальные ограничения Neon roles](https://neon.com/docs/manage/roles): neon_superuser не является настоящим PostgreSQL SUPERUSER; cloud_admin — служебная зарезервированная роль, её доступ не запрашивался.

**Rollback:** diagnostic RAISE P0001 с JSON был последней выполняемой командой, COMMIT не достигнут. Recovery: READ ONLY/advisory lock получен, owner terreno_bootstrap_owner, marker NULL, app roles0, установлена только plpgsql1.0, пользовательских relations/routines0.8 отсортированных database ACL rows совпали с preflight. Полный откат подтверждён; лимит одного прогона исчерпан. Credentials, другие проекты, тариф, .env.local, pendingTargets,6 migrations/Railway/seed/push не затронуты.

**Минимальное исправление — предложение, не облачное применение:** сохранить41 guard и allowlist. Нужен разрешённый владельцем/поддержанный Neon способ управления ACL extension routines: от действительного владельца отозвать PUBLIC EXECUTE и делегировать bootstrap owner необходимые EXECUTE WITH GRANT OPTION на эти routines. Тогда текущие REVOKE и узкий GRANT в10 могут быть выполнены без доступа runtime к админ-ролям. Пример операции владельца только для одной signature (не команда текущему MCP аккаунту):

```sql
REVOKE EXECUTE ON FUNCTION public.postgis_full_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.postgis_full_version()
  TO terreno_bootstrap_owner WITH GRANT OPTION;
```

Для реального bootstrap подготовка ACL должна покрыть обе extensions, включая нужные spatial routines, и соблюсти атомарность; нельзя автоматически выполнить SET ROLE cloud_admin, GRANT membership cloud_admin/runtime или притвориться, что данный административный путь уже доступен. Если Neon не предоставляет поддержанный путь владения/ACL, существующие требования нельзя выполнить только перестановкой команд10 под текущими полномочиями.10 поэтому не изменялся вслепую; расширение allowlist/исключение extension routines из проверки не предлагается. **Локальная модель исправления готова, облачный bootstrap с COMMIT пока не готов: механизм прав владельца в Neon не подтверждён.**

**Реальные локальные проверки:**4/4 новых routine-evidence сценария прошли после RED (PUBLIC/signature/owner/extension; explicit и membership; NULL proacl defaults; пустой результат/полный fresh rollback). Добавлен отдельный regression с фактическими cloud_admin ACL: prepare/verify отказывают, owner-side REVOKE + bootstrap GRANT OPTION позволяют строгий verify и два повтора, runtime не получает EXECUTE запрещённой routine или cloud_admin membership. При его разработке устранены только ошибки fixture: порядок ACL не семантичен; non-superuser owner нужен schema USAGE; один лишь PUBLIC REVOKE без bootstrap grant option недостаточен для повторного управления ACL. Все эти действия выполнялись только в disposable local cluster. Дополнительных cloud записей не было. TypeScript/ESLint новой диагностики прошли; прежняя большая батарея не повторялась.

Финальный совместный прогон нового файла: **5/5 PASS**. Нормализованный evidence-файл проверен повторным восстановлением всех778 записей, уникальностью signatures и общими фактическими ACL/source; все immutable fingerprints (включая10/20/production guards/6 migrations/registry/.env.local) совпали с контрольной точкой этого продолжения.

## TRAVEL-026 — единственная rollback-only диагностика: предикат установлен

2026-11-20. По новому явному разрешению выполнен ровно один диагностический write-batch через MCP Нурман в exact project broad-wind-62771105/branch br-mute-river-bavdwjwl/endpoint ep-curly-moon-ba3f3csy/database travel_test_foundation. Перед запуском сверены свежие management metadata и read-only исходное состояние с advisory lock; незакоммиченные файлы сохранены в ignored checkpoint. Все41 условия20 остались неизменными; прежние тесты повторно не запускались.

В один `run_sql_transaction` переданы receipts/timeouts, DO prepare, именованный DO verify и последним **обязательный безусловный terminal abort diagnostic_all_checks_passed**. Внешние BEGIN/COMMIT из файлов не передавались, промежуточного COMMIT не было. prepare прошёл; verify вернул **P0001 / DETAIL runtime_routine_allowlist:P0001**. Terminal abort присутствовал в запросе, но не достигнут из-за более раннего guard exception; вся транзакция откатилась. Прогон не повторялся.

**Доказано в облаке:** сработал последний предикат20: существует public routine, для которой has_function_privilege(travel_test_runtime,oid,'EXECUTE')=true, а совокупный allowlist (имя, отсутствие SECURITY DEFINER, immutable/stable, принадлежность PostGIS extension) не соблюдён. То есть10 не обеспечил требуемое отсутствие лишнего эффективного EXECUTE. Ошибка самой проверки не доказана, ослаблять/расширять её нельзя. **Не установлены:** конкретная signature, владелец и источник EXECUTE (PUBLIC/explicit ACL/другое). Модель чужого owner/PUBLIC EXECUTE локально воспроизводит тот же предикат, но принадлежность облачной routine конкретному provider owner этим ответом ещё не доказана.

**Read-only recovery:** advisory xact lock23942026 получен; database/role/session_role совпали, read_only=on. Owner terreno_bootstrap_owner, marker NULL, app roles0, extensions только plpgsql1.0, пользовательские relations/routines0. Все8 database ACL rows побайтно совпали с отсортированным preflight. Полный rollback подтверждён, неизвестного COMMIT нет. Дополнительных write-транзакций не было; разрешение на этот диагностический прогон исчерпано. SQL-файлы, миграции, `.env.local`, pendingTargets и другие проекты не менялись; credentials не получались.

**Минимальное направление исправления:** сохранить20 и узкий allowlist; устранить реальный источник EXECUTE на недопустимых routines в10, выполняя REVOKE от роли, действительно имеющей право отзыва. Если PUBLIC/grant принадлежит provider owner, нельзя считать REVOKE под текущим bootstrap owner успешным только по отсутствию SQL ERROR: предупреждение не меняет ACL. Не выдавать runtime membership/admin и не расширять allowlist ради PASS. Перед выбором точного GRANT/REVOKE нужны signature/owner/ACL нарушающих routines из временного post-prepare состояния; после отката их уже нет. Это можно получить только отдельно разрешённой точечной rollback-only диагностикой с безопасным metadata evidence либо подтверждённым provider способом управления extension privileges. Сейчас такая дополнительная запись **не выполняется**. Локальная проверка будущей правки должна включать уже готовую provider-owned routine regression, исчезновение лишнего EXECUTE, сохранение нужных spatial calls, повтор и полный rollback. Bootstrap с COMMIT не выполнен и пока не объявляется готовым.

## TRAVEL-026 — локальная диагностика20, облачный предикат ещё неизвестен

2026-11-20. Прежние незакоммиченные файлы сохранены в ignored checkpoint `.local/audit/travel026-verify-*`; секреты/`.env.local` не копировались. Цель текущего продолжения — определить точный отказ20 без нового cloud bootstrap. План: разбор всех условий → локальные отрицательные тесты → безопасные имена предикатов → сохранность guards → prepare/verify/repeat/rollback → предложение следующей диагностики. Зависимости — portable PG17/PostGIS, существующий disposable harness. Риски — спутать модель provider ACL с реальным Neon evidence или назвать rollback-only прогон read-only. Критерий решения — доказательство конкретного облачного предиката; **этот критерий пока не выполнен**.

**Проверки20 сохранены:** все41 исходных top-level OR-предикатов выделены в последовательные IF в исходном порядке; выражения сравнены с checkpoint после нормализации только whitespace,41/41 совпали. При любой TRUE отказ остаётся P0001, включая identity, owner/extensions, marker schema/data/ACL, role flags/memberships, runtime DDL/DML/sequence/SECURITY DEFINER и routine allowlist. Добавлены только имена этапов и контролируемый DETAIL `<predicate>[/<approved-role>]:<SQLSTATE>`; lookup несуществующей роли также получает отдельный код. Значения настроек, SQL text, названия произвольных объектов, credentials и исходный SQLERRM в DETAIL не выводятся. COMMIT остался после всех проверок,10_prepare/production guards/6 migrations/registry/env не менялись в этом продолжении.

**Локально доказано:** если отдельная extension routine принадлежит provider/admin, bootstrap NOSUPERUSER не может убрать её PUBLIC EXECUTE. Модель с `public.postgis_full_version()` owner=rehearsal_admin/PUBLIC EXECUTE даёт:10 проходит, runtime_execute=true,20 отказывает **runtime_routine_allowlist:P0001**. После восстановления владельца/ACL чистый20 проходит. Это воспроизводит класс verify-only отказа, но **не устанавливает, что именно этот предикат сработал в Neon**: фактическое post-prepare состояние прошлой облачной транзакции утрачено откатом; owner/ACL установленных в ней extensions не наблюдались. Иные причины (role settings/membership, marker, owner, ACL и т.д.) остаются возможными. Ошибка самих security-предикатов не доказана, поэтому допуски/grants/allowlist не расширялись и10 не исправлялся по предположению.

**Регрессия:** tests/bootstrap-local/verify-diagnostics.test.ts проверяет отдельные runtime DB TEMP, marker column ACL, upward membership и provider-routine отказы; чистый prepare/verify/repeat; полное отсутствие новых ролей/extensions/marker и прежний DB owner после fresh verify-failure rollback. Есть обязательный terminal-abort сценарий: успешные prepare и verify без внутреннего COMMIT заканчиваются diagnostic_all_checks_passed/P0001 и тоже полностью откатываются.9/9 сценариев двух файлов (новые5 + прежние first-nonsuperuser4) PASS; до добавления DETAIL новые три отрицательных сценария были RED из-за отсутствующего detail. Доработанный terminal-abort сценарий дополнительно проверен адресно.10 статических unit, TypeScript и ESLint — PASS. Полные build/product integration/E2E и миграции/seed не запускались.

### Предлагаемая облачная диагностика — не выполнялась, нужно отдельное разрешение

Обычные read-only SELECT в уже откатившейся БД покажут отсутствие marker/ролей/extensions, а не потерянное состояние после10. Поэтому обещать установить исторический предикат только такими SELECT нельзя. Нужен один **rollback-only диагностический прогон**, не read-only: в разрешённой точной test-цели через один MCP transaction передать receipts/timeouts, DO prepare и DO verify с именованными отказами **без внешних BEGIN/COMMIT**, затем обязательно:

```sql
DO $abort$ BEGIN
  RAISE EXCEPTION 'Diagnostic rollback'
    USING ERRCODE='P0001', DETAIL='diagnostic_all_checks_passed';
END $abort$;
```

При первом отказе20 его DETAIL покажет конкретный предикат/SQLSTATE и транзакция откатится. Если все проверки проходят, последний безусловный RAISE всё равно прерывает всю транзакцию до wrapper COMMIT. Никакие новые объекты/данные не должны сохраняться; после ответа или timeout обязательны read-only advisory-lock recovery и проверка исходного состояния. Это временные DDL/DML внутри откатываемой транзакции, **не разрешённое сейчас облачное чтение и не bootstrap с COMMIT**. Без нового разрешения не выполнять, не получать credentials и не делать автоматический повтор. Принципиальную возможность этого abort пути проверил новый локальный тест.

**Готовность:** локальный диагностический20 готов; исправленный production bootstrap к новой cloud попытке с COMMIT пока **не готов** — точная облачная причина неизвестна. В этом продолжении ни одного Neon tool/SQL вызова не было. Другие проекты, `.env.local`, pendingTargets, migrations/seed/Railway/GitHub/тариф не затронуты. Ниже сохранены исторические результаты прошлой попытки.

## TRAVEL-026 — 0LP01 исправлен; единственный повтор откатился на verify

2026-11-20. Продолжена текущая задача с сохранённым `first-nonsuperuser.test.ts` и всеми прежними незакоммиченными документами. Контрольная файловая копия/immutable fingerprints сохранены в ignored `.local/audit/`; секреты не копировались. Цель — точная диагностика0LP01, минимальная правка, локальные regression/rollback/repeat и одна явно разрешённая облачная попытка. Критерии успешного bootstrap включают отдельный post-COMMIT read-only20; **они не выполнены, bootstrap не завершён**.

**Точная причина0LP01 доказана локально на PG17.12:** non-superuser CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS/INHERIT создатель получает два grants на новую роль: ADMIN=true/INHERIT=false/SET=false от rehearsal_admin (аналог cloud_admin) и ADMIN=false/INHERIT=true/SET=true от самого bootstrap owner. Конкретный `GRANT travel_test_migrator TO terreno_bootstrap_owner WITH ADMIN TRUE, INHERIT TRUE, SET TRUE` возвращает0LP01. Старый IF искал все три flags в одной строке и ошибочно запускал циклическую выдачу ADMIN себе. Сообщение сервера локализовано; regression проверяет SQLSTATE и фактические две membership rows, а не английский текст ошибки.

**Минимальная правка10:** наличие ADMIN проверяется отдельно от INHERIT/SET. Если ADMIN уже есть, при необходимости выдаются только INHERIT/SET; superuser/pre-existing путь без ADMIN сохраняет исходный полный GRANT. Требуемые эффективные права не снижены; при повторе лишних grants нет. Identity/marker/ACL/ownership проверки,20_verify,00_inspect, production guards, registry и6 migrations неизменны.

**Реальные локальные проверки:** старый SQL дал extensions:0LP01 в тесте первого non-superuser bootstrap; после правки4/4 `first-nonsuperuser.test.ts` PASS (точная старая операция, late-failure rollback, успешная подготовка со строгим20, два повтора без изменения grants/marker).6 выбранных прежних bootstrap-тестов PASS,9 иных пропущены;10 статических unit PASS; TypeScript/ESLint нового теста PASS. Native PostGIS установлен в disposable fixture bootstrap-суперпользователем до снятия SUPERUSER: его managed Neon installer локально не эмулируется. Роли приложения в regression впервые создаются уже non-superuser с атрибутами Neon и membership neon_superuser. Migrations/seed не запускались даже в выбранных локальных сценариях. Полная продуктовая батарея/build не повторялась.

**Единственная разрешённая повторная cloud попытка:** через Нурман повторно сверены org norman/Free, project broad-wind-62771105, branch br-mute-river-bavdwjwl, endpoint ep-curly-moon-ba3f3csy/direct host и travel_test_foundation/terreno_bootstrap_owner. Read-only preflight с advisory lock подтвердил прежний откат и одну backend-сессию. Исправленный DO prepare и неизменённый DO verify переданы одним `run_sql_transaction` с receipts/timeouts и без вложенных BEGIN/COMMIT.10 прошёл;20 вернул **`P0001 Neon bootstrap refused (verify)`**, context inline_code_block line64 (exception handler). COMMIT не произошёл. Guard намеренно маскирует исходное условие, поэтому конкретное несовпадение внутри20 по этому сообщению неизвестно; считать гипотезы про provider ACL доказанными нельзя.

**Read-only recovery после ошибки:** получен advisory xact lock23942026, read_only=on, role=session_role=terreno_bootstrap_owner; owner прежний, marker NULL, app roles0, extensions только plpgsql1.0, пользовательских relations0. Database ACL совпадают с начальным состоянием: PUBLIC CONNECT/TEMPORARY, bootstrap/neon_superuser CREATE/CONNECT/TEMPORARY. Полный rollback подтверждён, неопределённого COMMIT/оставленной выполняющейся транзакции нет. Дальнейших cloud writes не было; лимит одной повторной попытки исчерпан.

**Оставшийся блокер:** отдельный отказ неизменённого20 в реальной Neon-среде. Для продолжения понадобится точечная диагностика его предикатов/безопасных кодов отказа и новое явное разрешение cloud записи; ослабление guards недопустимо. Credentials/connection strings не получались; direct TLS verify-full не заявляется. `.env.local`, pendingTargets, migrations/seed/Railway/GitHub/тариф и другие Neon-проекты не изменены. Локальная правка и тест сохранены. Ниже — исторический первый отказ.

## TRAVEL-026 — MCP попытка откатилась, bootstrap не завершён

2026-11-19: владелец отдельно разрешил официальный MCP Нурман как административный канал без требования доказать direct verify-full. Exact org/project/branch/endpoint/database/owner/Free сверены; preflight READ ONLY совпал с TRAVEL-025.3. Контракт `run_sql_transaction` — одна транзакция ([официальный README](https://github.com/neondatabase/mcp-server-neon#readme)); общая сессия/receipt/SET LOCAL подтверждены read-only пробой. Шесть migration checksums совпали с manifest.

Одна попытка передала неизменённые DO prepare/verify и SET LOCAL в транзакционный wrapper MCP. Заменены только внешние BEGIN/COMMIT; промежуточного COMMIT/SET ROLE не было. Исходные SQL-файлы/guards не изменялись. Подготовка отказала: `P0001 Neon bootstrap refused (prepare)`, `DETAIL extensions:0LP01` (invalid_grant_operation).20 не достигнут, COMMIT не произошёл. Ответ верхнего уровня INVALID_ARGUMENT был раскрыт по безопасному text content до настоящего SQLSTATE — это не ошибка параметров целевой БД.

Read-only recovery после получения advisory xact lock23942026 подтвердил: app roles0, postgis/pg_trgm0, marker NULL, owner terreno_bootstrap_owner; in-flight bootstrap не остался. Атомарный rollback сработал, повторной попытки/ручного исправления облака не было. Это **не bootstrap PASS** и не неизвестный успешный COMMIT.

Блокер локализован до стадии extensions, включающей downward `GRANT ... ADMIN TRUE` и CREATE EXTENSION. Основной подозреваемый — выдача ADMIN самому создателю роли: PostgreSQL17 запрещает циклический member/grantor ADMIN grant ([исходник PostgreSQL17](https://raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/src/backend/commands/user.c)); createrole_self_grant выдаёт INHERIT/SET отдельно от ADMIN. Это объяснение по коду, не отдельно воспроизведённый cloud GRANT. Guard сохраняет только stage/SQLSTATE, поэтому более точный исходный текст ошибки недоступен. Локальная прежняя репетиция начинала создание с SUPERUSER; её non-superuser тест проверял повтор с уже подготовленными roles/extensions, а не первое создание. Нужна точечная локальная диагностика первого non-superuser bootstrap и корректировка membership-логики с сохранением эффективных ADMIN/INHERIT/SET и всех identity/ACL требований перед новым cloud apply. Изменять/ослаблять guards либо повторять текущий план вслепую нельзя.

Credentials не получались, direct TLS verify-full не проверен и не заявляется. Migrations/seed/registry/.env.local/Railway/push/другие проекты не затронуты. Ниже сохранены исторические результаты TRAVEL-024; они не доказывают успешный cloud bootstrap.

2026-11-19. Продолжена та же задача после лимита, существующие файлы сохранены. Baseline a7331e8, план-checkpoint61fbdde; отдельная feature/neon-test-profile, без push. В первой части задачи через Нурман повторно получены безопасные management metadata: norman/org-lucky-base-56347525 Free; broad-wind-62771105; br-mute-river-bavdwjwl/test; ep-curly-moon-ba3f3csy и точный direct host; travel_test_foundation/terreno_bootstrap_owner; aws-eu-central-1/PG17. После возобновления облачных вызовов не было.

## Точный SQL и зависимости

Готовые артефакты находятся в [db/bootstrap/neon-test](../db/bootstrap/neon-test/manifest.json): manifest с точным tuple и SHA256 всех6 неизменённых migrations, 00_inspect.sql, 10_prepare.sql и20_verify.sql. Это дополнительные SQL-файлы, не migrations и не cloud apply команда. Порядок/транзакционные границы — [NEON_BOOTSTRAP_PLAN](NEON_BOOTSTRAP_PLAN.md).

Подготовлен pure transport/metadata guard и отдельный `npm run test:bootstrap:local`. Последний создаёт новый временный localhost-кластер из уже имеющихся PG17/PostGIS binaries; не читает `.env.local`, текущий local admin state или Neon credentials. Проверяет cluster_name/data_directory/major до DDL и останавливает только собственный сервер. Локальный случайный тестовый secret не выводится; init-secret удаляется после initdb. После закрытия текущей репетиции удаляется только проверенная временная директория. Windows portable binaries обязательны; эта команда не является готовой Linux CI-репетицией.

## Роли и минимальные права

| Роль | Планируемые права/назначение | Чего не получает |
| --- | --- | --- |
| terreno_bootstrap_owner | Административная подготовка, extensions, владелец marker; downward ADMIN/INHERIT/SET на migrator для повторов и передачи ownership | Не используется приложением; credentials не выдаются этим планом |
| travel_test_migrator | NOLOGIN, NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS/NOINHERIT; DB owner, public USAGE/CREATE, собственный DDL; SELECT marker | Нет membership в bootstrap/neon_superuser/runtime, нет прав менять marker |
| travel_test_runtime | Те же ограничительные flags/NOLOGIN; CONNECT, public USAGE, SELECT marker; каталог получает SELECT из существующих migrations; узкий extension-owned immutable/stable spatial EXECUTE | Нет DB/schema ownership, CREATE/TEMP, DML/table/column/sequence writes, membership/SET ROLE вверх, callable SECURITY DEFINER |
| Будущие writer-роли | Пока только архитектурное предложение: отдельные scope/schema и явные grants | Не создаются в TRAVEL-024; права не добавляются catalog runtime |

В текущем коде identity guard требует DB ownership у migrator; migration003 работает с database PUBLIC TEMP policy. Поэтому передача ownership предусмотрена условно и только внутри этой тестовой БД. Владение подразумевает доверенный DDL/возможность нарушить доступность: ACL не делают migrator безопасным для произвольного клиентского SQL. Без переработки контрактов нельзя гарантировать DB owner полный запрет установки trusted extensions. Runtime этим владельцем не является.

## Повтор, частичный отказ и восстановление

Все изменения10 и проверки20 — одна транзакция. Создаются только отсутствующие роли с точными flags; dirty существующие роли/memberships отвергаются без их исправления. Корректный частичный NOLOGIN role дополняется. Marker должен иметь точные columns/types/NOT NULL/PK и validated singleton/purpose CHECK expressions, обычный relkind, bootstrap owner и отсутствие RLS/пользовательских triggers. Table/column ACL не допускают сторонних grantees или grant options; app-роли получают только table SELECT. Пустой корректный marker получает одну строку; чужие/NULL metadata и лишние строки не перезаписываются. Ownership изменяется только из bootstrap в migrator; неизвестный владелец — отказ.

При SQL-ошибке выполнить ROLLBACK/закрыть ту же сессию; не продолжать с20 отдельно и не выполнять DROP/REASSIGN OWNED/CASCADE. При потере сети около COMMIT результат неоднозначен: сначала заново management/transport + разрешённый read-only00/ACL snapshot, затем сравнение с ожидаемым состоянием. Не повторять DDL вслепую. Корректный завершённый набор повторяется без сброса данных/ролей; dirty частичное состояние требует адресного нового плана. После будущего LOGIN/credential activation этот NOLOGIN-only план намеренно откажет: не применять его для незаметного сброса login/password.

Ошибки SQL санитизированы до постоянного сообщения и фиксированных stage/SQLSTATE, без SQLERRM/сырых credentials. Будущий клиент обязан санитизировать сетевые/driver ошибки и не логировать connection object/URL. Receipt GUCs не удостоверяют физическую Neon-цель; direct certificate verification и доверенная свежая management сверка обязательны до первого запроса.

## Реальные локальные проверки

- Unit/static policy:9 новых тестов прошли RED9 FAIL → GREEN9 PASS. Проверяются точный manifest/checksums, metadata, direct/pooled/TLS, role/DB/region/PG mismatch, env overrides и secret-free result/errors. Итоговые количества общего suite фиксируются после финальных проверок.
- Отдельная real PG17/PostGIS репетиция: **11/11 PASS**, повторно после возобновления. Включены чужой receipt до DDL; dirty partial role; late-failure rollback ролей/extensions/marker/ownership; nullable unconstrained marker rejection; compatible partial completion; повтор и ownership под NOSUPERUSER CREATEDB/CREATEROLE bootstrap с уже установленными extensions; все6 исходных SQL под non-admin migrator и действующий assertProfileIdentity; runtime spatial SELECT/отказы DML/DDL/TEMP/SET ROLE; запрет изменения marker мигратором; column-only/sequence/SECURITY DEFINER/marker ACL drift; отказ без перезаписи foreign marker.
- Nullable marker regression отдельно воспроизведена: прежний SQL ошибочно принимал NULL; RED1 FAIL, затем исправлены NOT NULL/type/PK/schema и IS DISTINCT FROM проверки, общий rehearsal11 PASS.
- Исправлены реальные первоначальные проблемы: CREATE DATABASE в test setup вынесен из multi-command implicit transaction; ACL-функции ограждены CASE по relkind; PostgreSQL17 self-grant/repeat semantics учтены через явную admin→migrator membership и createrole_self_grant. Проверки не отключались.
- `npm run check` после возобновления exit0: strict, ESLint, unit/integration, production build, architecture/secrets/docs/dependency gates. До review149 unit/24 local integration; окончательный повтор после review — **150 unit/24 local integration, build и все gates PASS**, npm audit0. E2E не запускались: UI не менялся.

## Итог независимого review

Одно fresh-context read-only review выявило5 Important; исправлены за один correction pass. Новый unit recovery test: RED1 FAIL/9 PASS → GREEN10 PASS. Четыре новых rehearsal cases: RED4 FAIL/11 PASS → GREEN **15/15 PASS**. Исправления: explicit inspect-recovery transport intent для migrator-owned DB; CREATE во всех user schemas и PostgreSQL17 MAINTAIN; точные reserved-schema фильтры; начальный public inventory и default ACL gate; validated marker expressions/сторонние table-column grants; совпадающая с grant policy проверка extension ownership/volatility/SECURITY INVOKER исполняемых spatial routines. Второе независимое review не выполнялось.

Файл10 теперь предназначен только для initial/pre-migration состояния с marker/extension inventory; при существующих application objects он отказывает до blanket ACL. После migrations допускаются read-only inspection и20 verification с manifest-known таблицами migrator-owner; не запускать10 для автоматической перенастройки уже мигрировавшей БД. Это предотвращает попадание чужих public tables под неизменный GRANT SELECT ALL migration000. Default grants runtime/PUBLIC от migrator проверяются и не принимаются как доверенные. inspect-recovery разрешает только read-only восстановление evidence при bootstrap- или migrator-owner, с тем же exact tuple/bootstrap connection identity; initial prepare всё ещё требует начального owner. Реальный SQL marker/ACL проверяется после отдельно разрешённого подключения, не выводится из metadata.

Minor отложен: при отказе initdb до входа в cleanup-блок test harness может оставить файл случайного **локального** init-secret в ignored rehearsal-directory. Это не Neon credentials и не Git/log leak; текущие успешные репетиции удалили init-secret и собственные кластеры. Не объявлять обработку этого failure path полностью закрытой. Declined to judge: Neon admin/extension capabilities и TLS negotiation — отдельные cloud smoke, в рамках текущего запрета SQL не проверялись.

Первичная установка extension проверена локальным superuser. Повтор/ownership/миграции проверены без superuser; это не доказательство Neon-specific административных возможностей или фактической доступной версии PostGIS. Dummy neon_superuser существует только в изолированном тестовом кластере для проверки запрета membership. Перед облачным выполнением нужны реальные approved smoke, а не перенос результатов этой симуляции.

## Будущие cloud smoke — ещё не выполнялись

Положительные: exact metadata + verify-full/direct; read-only inspection фактического server/owner/capabilities; one-transaction bootstrap; NOLOGIN/flags/memberships/marker/ACL/extensions evidence; повтор с сохранением OIDs/строки/ownership; пространственный запрос и подготовка к шести migrations. После отдельного credential/activation разрешения — runtime pooled SELECT и migration direct identity.

Отрицательные: неверный org/project/branch/endpoint/host/DB/session role/major; pooled bootstrap, слабый TLS/SSL overrides; dirty role flags/membership/SET ROLE; nullable/wrong-owner/view/RLS/trigger/foreign marker; column-only grant, sequence USAGE, public EXECUTE/SECURITY DEFINER; повреждённый checksum; ошибка до COMMIT и разрыв около COMMIT. Ожидается отказ, ROLLBACK и санитизированный журнал, без автоматической правки неизвестного объекта или ослабления guard.

## Будущая запись аккаунтов, избранного и поездок

Catalog runtime остаётся read-only. Бизнес-данные следует разместить в отдельных private schemas (identity/trips) и обращаться к ним через отдельные server-side writer credentials с явными правами на нужные таблицы/столбцы/последовательности, RLS и проверенным user ownership. Не выдавать общие DML или membership migrator каталожной роли. Generic SELECT defaults на будущие public tables не создаются — иначе новые персональные таблицы могли бы открыться каталогу.

Если понадобятся SECURITY DEFINER процедуры, это отдельный review: NOLOGIN owner с узкими правами, явные schema-qualified relations, безопасный search_path с pg_temp последним, REVOKE EXECUTE FROM PUBLIC, только необходимые signatures, проверка user ownership и отрицательные cross-user тесты. Предпочесть invoker/RLS при достаточности; не доверять userId из браузера как доказательству авторизации. Эти возможности сейчас не реализованы.

## Конкретные следующие разрешения

1. Безопасный способ административного доступа и **первый cloud read-only00_inspect** с exact direct verify-full; получение/хранение cloud credentials, если требуется, согласовать отдельно.
2. После inspection — одна транзакция10+20: две NOLOGIN роли; explicit admin→migrator downward membership/default ACL; PostGIS/pg_trgm; bootstrap-owned marker/одна строка/ACL; PUBLIC/schema/sequence/function restrictions; условная передача ownership только travel_test_foundation.
3. LOGIN/credentials, активная registry запись, реальные application smoke, migrations/seed и Railway — отдельные последующие этапы. В TRAVEL-024 ни один из этих пунктов не выполнен.
