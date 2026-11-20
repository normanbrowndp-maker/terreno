# TERRENO — технический handoff интеграции PostgreSQL/Neon

Продолжение **TRAVEL-026**, 2026-11-20. Архитектура остаётся Next.js/TypeScript, модульный монолит, PostgreSQL/PostGIS. **Хостинг команда ещё не выбрала. terreno-test сохраняется; он не подключён к приложению.** Предыдущая рекомендация среды с контролируемым ownership — вариант для обсуждения, а не принятое решение о переезде.

## Объём и статус

Цель: проверить локальную связку существующих модулей, SQL и API, отделив её от недоступного cloud_admin ACL. План: checkpoint → анализ существующего подключения → одноразовый локальный application rehearsal → guards/security regression → handoff. Зависимости: имеющиеся portable PostgreSQL17/PostGIS, Node/npm и lockfile. Критерии: действующие migrations/identity/locks/checksums; реальное чтение через runtime pool; честные API source/status; сохранение запрещённых к изменению файлов. Риск: принять локальную проверку за доказательство облачного TLS, ACL или готовности авторизации. Статус: локальные результаты ниже; Neon activation заблокирована.

## Что готово и что проверяется

| Часть | Состояние |
| --- | --- |
| Подключение БД | `connection-profile.ts` отделяет local от явно выбранного neon-test; remote PostgreSQL не принимается через local профиль. Neon требует точные approved IDs/host/database/role, правильный direct/pooled URL и TLS policy. |
| Runtime | `pool.ts` использует ограниченный pool, проверяет database identity и передаёт модулю только frozen query capability. Каталог не получает объект Pool/credentials. |
| Миграции | Реальный `migrateDatabase` применяет шесть неизменённых файлов, хранит checksums, использует session advisory lock и runner transaction. Повтор не применяет их заново. Lock contention и повреждённый checksum должны останавливать runner. |
| Каталог | `postgres.ts` читает versioned Italy demo параметризованными SQL и ST_X/ST_Y. SSR/API используют один loader. Неполная коллекция не выдаётся за полноценный postgres-каталог. |
| API | Read-only `/api/v1/cities`, `/cities/{slug-or-id}`, `/places`, `/places/{slug-or-id}`; фильтры,400/404, `Cache-Control:no-store`. `/health/ready` отражает доступность схемы/identity, а не наличие всего контента. |
| География | PostGIS хранит WGS84 geometry; локально проверяются реальные координаты каталога. SQL остаётся совместимым с текущей public схемой; private extension schema не внедрена. |
| Users/routes/trips | Контракты модулей, а не готовые DB repositories. Auth, сохранение аккаунтов/поездок и дорожный routing не реализованы. Избранное хранится в браузере; PostgreSQL persistence не имитируется. |

Bundled fallback остаётся демонстрационным: ответы сообщают `backend=bundled` и причину (`not-seeded`, `incomplete-seed`, `database-unavailable`). Успешный HTTP200 с таким fallback **не доказывает подключения БД**. В новом тесте отдельно проверяется `backend=postgres, availability=ready` после локальной загрузки demo.

## Воспроизводимая локальная проверка без .env.local

Требуются уже установленные зависимости и `.local/postgresql` с PostGIS, Windows и свободный loopback-порт55433:

```powershell
npx vitest run --config vitest.bootstrap.config.ts tests/bootstrap-local/application.test.ts
```

Проверка создаёт отдельный кластер в ignored `.local/bootstrap-rehearsal/run-*`, со случайными локальными credentials только для этой fixture. Проверяет физический data_directory/cluster_name/PG17; не присоединяется к чужому listener. Если55433 занят — **FAIL**, не stop/adopt чужой службы и не ослабление guard. Не меняет `.env.local`, persistent `.local/postgres-data`, provider resources или registry. Кластер и его test-only demo удаляются проверенным cleanup; роли/расширения создаются только внутри него.

Применяется обычная **local** модель ролей/ACL из существующей локальной среды. Это не повтор SQL10/20, не имитация успешного Neon bootstrap и не проверка41 cloud predicates на локальных LOGIN-ролях. Dummy служебные роли harness не являются подключением к Neon.

Проверяется настоящий migration runner и настоящий `pg` runtime pool. SQL/identity/loader/API handlers не замоканы; заглушён только `server-only` import marker, а Pool.connect наблюдается с передачей оригинальному драйверу для корректного закрытия созданных pools. Route handlers вызываются напрямую: это интеграционная DB/API-проверка, **не HTTP E2E/SSR render**. Demo seed вызывается только в одноразовой локальной fixture; cloud seed и production import не запускались.

## Neon-specific блокеры

1. **Владелец extension routines.** Предыдущая разрешённая rollback-only диагностика установила778 signatures:747 PostGIS +31 pg_trgm, owner cloud_admin, PUBLIC EXECUTE без grant option. Bootstrap owner не может убрать owner-granted PUBLIC ACL. Нового cloud SQL/REVOKE в этом продолжении не было. Полное [evidence](audit/neon_routine_evidence.json) и [история/локальное сравнение](NEON_BOOTSTRAP_REPORT.md) сохранены.
2. **Schema isolation не принята.** Локально cast `location::text` вызывает скрытую функцию без schema USAGE, хотя прежний function ACL её блокирует; view dependencies также обходят namespace lookup. Поэтому predicate `schema USAGE AND function EXECUTE` не заменяет действующий allowlist. Все41 predicates сохранены; новой политики безопасности нет.
3. **Роли входа ещё предстоит согласовать.** Bootstrap намеренно создаёт NOLOGIN runtime/migrator roles, а текущая SQL identity требует совпадения current_user/session_user с утверждённой ролью. Нельзя просто выдать LOGIN, добавить admin membership или использовать SET ROLE, объявив интеграцию готовой. Требуется отдельный дизайн и разрешение фазы аутентификации/активации, согласованный с NOLOGIN gate и exact identity. Локальные LOGIN-роли теста относятся к local профилю.
4. **Реальный сетевой TLS ещё не доказан.** Unit проверяет URL/TLS-policy/driver boundary. Успешный прежний Neon MCP inspection не доказывает direct или pooled TLS verify-full клиента приложения. Не получать secrets через вывод MCP; использовать отдельно согласованный защищённый канал.
5. **Цель намеренно неактивна.** `targets=[]`, одна запись `pendingTargets/state=pending-bootstrap`. Real connection resolver её отвергает до создания драйвера. Runtime и migration роли/SQL evidence не выдумываются. `.env.local` не переключался на Neon.
6. **Операционные проверки впереди.** Cloud cold start, latency и timeout budgets, версии расширений, restore/backup, extension updates и текущие квоты/расходы не подтверждены этим локальным прогоном. Нет решения о Railway, AWS или другом hosting.

Сохранённая цель: norman / `broad-wind-62771105`, test / `br-mute-river-bavdwjwl`, endpoint `ep-curly-moon-ba3f3csy`, БД `travel_test_foundation`, Frankfurt/PG17. Источник — проверенная ранее metadata registry; management metadata и состояние облака сейчас **не перечитывались**. Последнее подтверждённое recovery показало полный rollback, а не установленный bootstrap.

## Краткое сравнение для команды — решения пока нет

| Вариант | Что сохраняется | Что необходимо доказать / эксплуатационная цена |
| --- | --- | --- |
| Neon с подтверждённым управлением ACL | Существующий terreno-test, стандартный pg/SQL, direct migrations и pooled runtime | Поддерживаемое owner-side удаление PUBLIC EXECUTE и управление нужными ACL; поведение обновления extensions. Клиентский механизм пока не подтверждён. Текущий Free-проект сохраняем, новых ресурсов не создаём. |
| Другой managed PostgreSQL/PostGIS | Модульный монолит, SQL reader, migrations и узкие runtime grants | До выбора проверить именно routine ownership/ACL, доступные версии PostGIS, регион, TLS, backups/restore и стоимость. Само слово managed не гарантирует нужных прав. Провайдер не выбран и не подключён. |
| PostgreSQL с контролируемым ownership | Та же модель данных и guards, явный контроль extension ACL | Команда отвечает за обновления, резервирование, восстановление, мониторинг и доступ; расходы/владелец эксплуатации должны быть согласованы. Локальная среда уже позволяет продолжать разработку без такого облачного решения. |

Официальные основания: [Neon roles](https://neon.com/docs/manage/roles) описывает ограниченный customer admin и зарезервированные роли; документированного self-service пути исправить эти function ACL не найдено. [PostgreSQL17 privileges](https://www.postgresql.org/docs/17/ddl-priv.html) различает владение/grant option и namespace lookup. Это не обещание доступности provider-side помощи или конкретных тарифов.

## Следующие практические действия

1. Продолжать локальную разработку через действующий PostgreSQL adapter; не вводить новый ORM, второй backend или общий multi-provider framework ради этого блокера.
2. Команде получить подтверждение Neon о поддерживаемом owner-side routine ACL пути (включая отсутствие возврата PUBLIC grants при обновлениях). Обращение от имени владельца не отправлено; предложение текста: «Как в PG17 управлять PUBLIC EXECUTE у cloud_admin-owned PostGIS/pg_trgm routines без membership cloud_admin и без повышения runtime privileges?»
3. Совместно выбрать вариант хостинга и схему LOGIN/NOLOGIN/SQL identity; при отсутствии Neon ACL пути не повторять bootstrap, а оценить два остальных варианта по той же проверке прав. Строгая политика не меняется автоматически.
4. Только после подтверждённого решения: отдельно согласовать безопасный credential channel и облачные изменения, проверить предложенный механизм локально, затем exact-target preflight/атомарный bootstrap/post-COMMIT verification. Миграции, registry activation и подключение приложения — отдельные явно разрешённые действия, а не побочный эффект handoff.

## Результаты этого продолжения

Фактически выполнено в этом продолжении:

| Проверка | Результат |
| --- | --- |
| Новый local application rehearsal |10/10 PASS: физическая isolation/занятый порт,6 migrations/checksums/repeat, advisory lock и checksum drift rejection/recovery, not-seeded fallback, локальный demo + PostGIS coordinates, runtime pool и API list/detail/filter/400/404, запрет runtime writes/DDL/TEMP/marker/SET ROLE, identity mismatch/503/санитизация, incomplete-seed recovery, прежний random-port режим harness. |
| Восемь выбранных unit-файлов |108/108 PASS: neon-test-profile, neon-pending-registry, neon-profile-identity, neon-profile-entrypoints, database-safety, database-target, runtime-query-port, readiness. Сетевое соединение Neon не создавалось. |
| `npx tsc --noEmit` | PASS. |
| ESLint application.test.ts и cluster.ts | PASS, max-warnings=0. |
| `npm run check:architecture` | PASS,56 source files. |
| `npm run check:secrets` | PASS; working/untracked/index source, значения не печатаются. |
| `python -B docs/audit/verify_stage1.py` | PASS,170 original hashes;45 Markdown files. |
| Protected hashes / checkpoint |72/72 файлов неизменны: весь src,6 migrations, bootstrap SQL/manifest и .env.local. Pending registry входит в src. CRC zip исходных14 незакоммиченных файлов проверена. |
| `git diff --check` | PASS; только предупреждения Git о нормализации CRLF. |

Начальный RED подтвердил, что старый harness не поддерживал fixed port; добавлена минимальная test-only опция. В первой версии API-теста ожидалось, что `q=Roma` вернёт только Roma; существующий поиск также ищет по региону Emilia-Romagna. Тест исправлен добавлением документированного `city=roma`, продуктовая семантика не менялась. Ошибок production-кода в проверенной локальной связке не выявлено; ненужных рефакторингов нет.

Исторические TRAVEL-024/026 totals не подменяют свежий прогон. Исходные41 security predicates не изменены и SQL10/20 в этом продолжении не запускались. Полные product unit/integration/build, браузерные E2E и HTTP/SSR server checks здесь не повторялись; запущенные10 DB integration и108 selected unit не выдаются за эти полные наборы. Cloud подключение, transport TLS и readiness остаются неподтверждёнными.

Изменения: новый `tests/bootstrap-local/application.test.ts`, минимальная поддержка явного локального порта в существующем harness и адресные updates docs/AGENTS. Прежние незакоммиченные файлы сохранены в ignored `.local/audit/travel026-handoff-*` с проверяемой zip-копией; секреты/`.env.local` туда не копировались. Это продолжение TRAVEL-026, не новый этап и не утверждение облачной готовности.
