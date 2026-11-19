# TRAVEL-024 — безопасная подготовка bootstrap, без Neon SQL

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
