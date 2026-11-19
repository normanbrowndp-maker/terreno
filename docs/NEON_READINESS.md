# TRAVEL-019 — проверка Neon перед подключением TERRENO

Дата: **2026-11-19**. Проверка ограничена чтением метаданных Neon и локального кода. Облачные ресурсы не создавались, SQL и миграции не запускались, данные/настройки существующих БД не менялись. Пароли, токены и строки подключения не запрашивались. Railway/AWS/Cloudflare не использовались. Код приложения, зависимости, миграции и env-файлы не изменены; этот отчёт не является разрешением на provisioning.

## Карточка задачи

- **Цель:** подтвердить доступ MCP/авторизацию, найти выделенную TERRENO, оценить совместимость SQL/защит и подготовить безопасный план тестовой среды с учётом стоимости.
- **План:** проверить Git/документы/миграции; прочитать организации → проекты → ветки → названия БД и metadata compute; сверить актуальные официальные документы; проверить существующие unit guards; записать результат и следующий шаг.
- **Зависимости:** подключённый Neon MCP, два доступных аккаунта, шесть существующих миграций, документация Neon. CLI/новые пакеты/credentials не нужны.
- **Критерии приёмки:** фактический список проектов и границы вывода об отсутствии TERRENO; подтверждённая поддержка PostGIS/pg_trgm; отличия от локальной среды и блокеры приложения; минимальный план и расходы; ни одного облачного изменения.
- **Тесты:** успешные management API read-вызовы; статический просмотр всех шести SQL-файлов и guards;27 существующих unit-тестов конфигурации/безопасности/readiness, docs/integrity/secret scan и diff check.
- **Риски:** два аккаунта требуют явного выбора перед будущими записями; metadata не доказывает установленный PostGIS; версии расширений различаются; current runtime/migration guards local-only; Free-квоты конечны; некоторые read-only SQL способны пробуждать compute, поэтому SQL сегодня не выполнялся.
- **Статус:** аудит и план завершены. Фактическое облачное подключение, создание ресурсов и миграции **не выполнялись и не разрешены этим заданием**.

Контрольная точка до локальной документации: `eb28132d7a99d78d2fbd9b7b64e1da9cdbda15e9`, ветка `feature/terreno-italia`; index/worktree были чистыми. GitHub push этого отчёта не выполняется автоматически.

## MCP и авторизация

Доступны два подключения: **«Нурман»** и **Primary**. Для каждого успешны `list_organizations`, `list_projects`, `list_branches`, `list_postgres_databases`, `describe_project`, `list_postgres_endpoints`. Это подтверждает действующую авторизацию management API в обоих подключениях. Для вызовов нужно явно выбирать правильный account binding `link_id`; новый login не понадобился. Значения binding и персональный email не требуются в проектной документации.

У management-подключений есть ADMIN permission на соответствующие проекты. Это не роль, которую следует отдавать приложению, и не разрешение на изменение ресурсов. Сегодня использовались только metadata read-вызовы и документация. `get_connection_string`, SQL, creation/update/delete, prepare migration и инструменты получения секретов не вызывались.

## Обнаруженные проекты

| Подключение / организация | Проект | PostgreSQL | Регион Neon | Ветки | Названия баз |
| --- | --- | --- | --- | --- | --- |
| Нурман / norman | `gloomi` |18 | `aws-eu-central-1` |1: `production` | `neondb` |
| Primary | `sidequest-dev` |18 | `aws-eu-central-1` |4: `production`, `sidequest-school-20261109`, `backup-sidequest-school-20261110`, `sidequest-school-backup-before-024-20261110` | `neondb`; `sidequest_school` в трёх school/backup-ветках |

Обе организации имеют **Free**. У обоих проектов API показывает6 часов истории и logical-size limit1073741824 bytes. У `gloomi` один compute с диапазоном0.25–2 CU, у `sidequest-dev` три: два0.25–2 CU и один фиксированный0.25 CU; настройки не менялись. API-поле suspend timeout0 означает default policy плана, а не отключённый сон. Параметр `pooler_enabled=false` в metadata не является доказательством отсутствия pooled hostname: [Neon объясняет](https://neon.com/docs/connect/connection-pooling), что pooled endpoint доступен независимо от переключателя отображаемого URL.

**Выделенные проект, ветка или БД с именем TERRENO/terreno не обнаружены в двух доступных подключениях.** Не делается более широкий вывод об иных аккаунтах или о содержимом таблиц под общими именами `neondb`: таблицы/строки чужих проектов не исследовались. Ни один из обнаруженных проектов не следует молча принимать за TERRENO.

`aws-eu-central-1` — размещение сервиса Neon во Frankfurt, не подключение AWS-аккаунта владельца. Вызовов AWS MCP не было. Дополнительное обезличенное evidence хранится только в ignored `.local/neon-readiness-evidence.json`.

## PostgreSQL/PostGIS: подтверждено и не проверено

[Текущая таблица расширений Neon](https://neon.com/docs/extensions/pg-extensions), обновлённая2026-11-18, указывает:

| Компонент | Предлагаемый Neon PG17 | Доступный Neon PG18 | Сохранённая локальная проверка |
| --- | --- | --- | --- |
| PostgreSQL major |17 поддерживается |18 поддерживается |17.12 |
| PostGIS |3.5.7 |3.6.4 |3.7.0 |
| pg_trgm |1.6 |1.6 | Расширение использовано в локальных интеграционных тестах |

[PostGIS](https://neon.com/docs/extensions/postgis) и [pg_trgm](https://neon.com/docs/extensions/pg_trgm) поддерживаются сервисом и включаются отдельно в нужной БД. Это будущие DDL-действия под bootstrap-ролью, не выполненные проверки этого аудита. Наличие/версии уже установленных расширений в `gloomi`/`sidequest-dev` не запрашивались.

Используемые geometry(Point,4326), geography cast, ST_X/Y/IsEmpty/Distance, GiST/GIN, UUID, JSONB, PL/pgSQL и deferred constraint triggers принципиально соответствуют PostgreSQL/PostGIS. Функций, явно требующих PostGIS3.7, в существующем SQL не обнаружено. **Статическая совместимость не заменяет прогон на Neon3.5.7**: после будущего отдельного разрешения нужны реальные геозапросы, constraints и повторный seed в изолированном проекте. Рекомендуется PG17 для первого smoke, чтобы не совмещать подключение Neon с major upgrade;18 — отдельная матрица позже.

## Сопоставление миграций и подключения

| Файл / компонент | Оценка | Что требуется перед облачным запуском |
| --- | --- | --- |
| `1794960000000_catalog.sql` | SQL каталога принципиально совместим | PostGIS/pg_trgm и runtime-роль должны существовать до запуска; SQL использует geometry/gin_trgm_ops и GRANT |
| `1794960000001_publication_move_guard.sql` | Обычный PL/pgSQL/deferred trigger | Проверить в будущей реальной тестовой БД, включая перенос child между parents |
| `1794960000002_license_normalization.sql` | Обычный CHECK | Проверить constraints/нормализацию лицензий |
| `1794960000003_runtime_privileges.sql` | REVOKE TEMPORARY у PUBLIC | Миграционная роль должна владеть выделенной БД/иметь требуемое право |
| `1794960000004_italy_editorial.sql` | Additive cities/JSONB/read model | Совместимость spatial indexes; точное имя runtime-роли зависит от имени БД |
| `1794960000005_city_country_guard.sql` | UNIQUE + составной FK | Проверить отклонение city/country mismatch |
| [target.ts](../src/shared/db/target.ts) | **Блокер подключения** | Допускает только loopback55432/55433, фиксированные database/role и пустой query string; Neon host5432 и TLS options отклоняются |
| [identity.ts](../src/shared/db/identity.ts) | **Блокер идентичности** | Требует marker и совпадение с `cluster_name`; локальную физическую идентичность нельзя считать переносимой на managed Neon |
| [migrate.ts](../src/shared/db/migrate.ts) | Runner сохраняется | Использует session advisory lock: требуется direct connection, не transaction pooler; нужны сохраняемые checksums/order/transaction/forward-only policy |
| [pool.ts](../src/shared/db/pool.ts) и seed script | Тоже local-only guards | Нового URL недостаточно: нужен явный облачный профиль, существующие локальные защиты сохранить |
| [infra/local/init.sql](../infra/local/init.sql) | **Не запускать в Neon как есть** | Локальный bootstrap с примерными credentials, ролями и cluster_name-marker; нужен отдельный адресный Neon bootstrap |

По [документации Neon](https://neon.com/docs/reference/compatibility) нет обычного PostgreSQL superuser/доступа к ОС. Для расширений использовать уполномоченную bootstrap-роль, для приложения — отдельную непривилегированную роль. Roles, создаваемые через Console/API по умолчанию, получают neon_superuser; для точных прав использовать SQL/явный restricted access. [Управление ролями](https://neon.com/docs/manage/roles).

Driver `pg` и node-pg-migrate можно сохранить. Runtime — pooled URL, миграции/seed/bootstrap — direct URL. Pooled PgBouncer transaction mode не поддерживает используемые session advisory locks. [Pooling](https://neon.com/docs/connect/connection-pooling). Требуется TLS с проверкой сертификата/имени узла; не применять `rejectUnauthorized:false`. [Secure connection](https://neon.com/docs/connect/connect-securely). Проверить конфигурацию именно установленного `pg`, cold-start timeout и границу между socket/statement timeout на следующем этапе.

Не переписывать шесть применённых миграций или checksums. Планировать отдельный cloud-target adapter и bootstrap; старый local-only путь и CI оставить действующими. Сам marker недостаточен при клонировании веток: облачный guard должен проверять заранее разрешённые project/branch/endpoint mapping, точный TLS-host, database, role и назначение среды. Не разрешать любой `*.neon.tech`, не выводить URL и не выдумывать недокументированные SQL-параметры идентичности Neon.

## Минимальный план отдельной тестовой среды — предложение

Варианты: новая БД внутри `gloomi` разделяет проект/roles/лимиты с чужим приложением; дочерняя ветка существующего проекта копирует его данные и также разделяет квоты. **Рекомендуется отдельный новый проект `terreno-test`** — без копирования `gloomi`/`sidequest-dev`, без персональных production-данных. Это предложение, ресурс не создан.

1. **Сначала локально:** подготовить явный Neon test target/identity/TLS профиль и unit-тесты отказа для wrong project/branch/host/db/role, pooled migrations и secret logging. Сохранить локальные guards, старый API/БД и все миграции. До разрешения реализации — только настоящий план.
2. Перед любыми cloud writes выбрать **один** аккаунт/организацию. Практичный кандидат — `Нурман / norman`, но это ещё не выбор владельца. Не создавать ресурсы сразу в обоих аккаунтах.
3. После отдельного разрешения provisioning: новый `terreno-test`, Free, PostgreSQL17, регион Neon Frankfurt (`aws-eu-central-1`) как предложение. Одна новая root-ветка/один RW compute, фиксированные min=max0.25 CU, scale-to-zero по Free policy. Существующие проекты/ветки не трогать. Записать возвращённые project/branch/endpoint IDs, не угадывать их.
4. Следующим отдельно разрешённым шагом bootstrap: выделенная БД `travel_test_foundation`, её owner/migrator `travel_test_migrator`, runtime `travel_test_runtime` без neon_superuser и write/DDL; подготовить расширения/identity/ACL. Это имя БД сохраняет существующую ветку выбора runtime-роли. Bootstrap-credential не давать приложению.
5. Секреты будущей новой среды — только в согласованном secret/local ignored хранилище, без замены текущего `.env.local` и без печати. Direct для migration/seed, pooled для runtime; публичных credentials/NEXT_PUBLIC_DATABASE_URL не создавать.
6. Только после разрешения запуска миграций: применить неизменённые0…5 один раз, проверить6 checksums, повторный запуск0 новых миграций; затем отдельно разрешённый demo seed48/12, повторный seed и отсутствие production records. Проверить runtime read/no-write, spatial distance/FK/publication/лицензии, pool TLS, readiness и честный fallback. По умолчанию CI продолжает использовать disposable local service, не облачную БД.
7. Зафиксировать реальные версии/объём/квоты и результаты; при несовместимости остановиться и диагностировать причину. Не делать down/reset, не сбрасывать существующие проекты и не повышать тариф автоматически. Существующий короткий restore window не считать полноценным production backup SLA.

## Лимиты и стоимость на дату проверки

[Neon plans](https://neon.com/docs/introduction/plans), обновление2026-11-12: Free —100 проектов,10 веток/проект,100 CU-hours/проект/месяц, до2 CU,1 GB БД/проект и20 GB суммарно,5 GB egress/проект/месяц; сон после5 минут, restore до6 часов/1 GB изменений. Сейчас найдено по одному проекту в каждой организации; это не измерение всех суммарных account-storage остатков. API отдельно подтвердил1 GiB logical limit у имеющихся проектов. Исчерпание compute/egress приостанавливает compute; storage limits блокируют увеличивающие хранение операции. Увеличение тарифа не планируется.

[Pricing](https://neon.com/pricing.md), обновление2026-11-04: Free $0; Launch $0.106/CU-hour + $0.35/GB-month, без ежемесячного минимума; history/extra branches/egress могут добавляться. Не использовать старые статьи с50 CU-hours/0.5 GB как актуальные лимиты.

Наши расчёты, не обещание счёта:0.25 CU ×8h ×22 дня =44 CU-hours — укладывается в100 при отсутствии иной нагрузки этого проекта.0.25 CU ×24h ×30 дней =180 CU-hours — не укладывается. Суммируются compute всех веток/реплик;5-минутные хвосты после запросов тоже расходуют время. В платном Launch те же44 CU-hours ≈$4.66 только compute; круглосуточные180 ≈$19.08 только compute, плюс storage/history/прочее. Это не предложение перейти на платный план.

Текущая подготовка не создаёт оплачиваемой ёмкости. Точный остаток CU/account-wide storage и фактический счёт не заявляются: metadata consumption counters не подменяют billing, paid consumption endpoint не запрашивался на Free. Для будущего теста предложенный бюджет —$0 в пределах Free. Фото/OSM assets из `public/` не переносить в PostgreSQL, keepalive/health-ready polling не делать постоянным способом держать compute активным.

## Фактические проверки и следующий шаг

- `npm run test:unit -- tests/unit/database-target.test.ts tests/unit/database-safety.test.ts tests/unit/readiness.test.ts tests/unit/config.test.ts`: **27 PASS /4 files**, без DB/SQL calls. Это проверка нынешних local-only правил, не доказательство Neon integration.
- Документы и исходные миграции изучены; новой интеграции/Neon extension smoke ещё нет. Build/E2E/full integration не перезапускались: код не меняется, облачные подключения/миграции в этом задании запрещены.
- `npm run check:docs`: PASS,170 исходных hashes,31 Markdown-файл, failures0. `npm run check:secrets`: PASS для index/worktree/untracked source. `git diff --check`: PASS. `git diff --exit-code eb28132 -- src db/migrations infra scripts package.json package-lock.json .github`: exit0 — код, миграции, инфраструктурные скрипты, зависимости и CI совпадают с checkpoint. Изменены только этот отчёт, ссылка в docs/README и граница/номер задачи в AGENTS; новые документы остаются локально, без commit/push.

Использованы доступные скиллы окружения `neon`/`neon-postgres` для managed PostgreSQL, pooling, branching и стоимости; `verification-before-completion` — для фактических проверок. Проектные визуальные скиллы не нужны этому аудиту и не активировались; новые пакеты/скиллы не устанавливались.

**Конкретный следующий шаг:** локально реализовать и проверить отдельный профиль Neon test target/identity/bootstrap plan, сохранив fail-closed local protection. Облачный ресурс создавать только после выбора аккаунта, согласования конфигурации и отдельного явного разрешения; сейчас не создано ничего.
