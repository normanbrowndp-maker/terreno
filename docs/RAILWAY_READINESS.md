# TERRENO — TRAVEL-032: подготовка Railway

Дата: 2026-11-21. Статус: локальная подготовка проверена; первый deployment заблокирован выбором и безопасным подключением внешней БД. Это отдельный запрос владельца с ID TRAVEL-032; прежняя запись о публикации GitHub сохраняется как история.

Цель — подготовить существующий Next.js к Railway без сервисов, deployment и расходов на новые ресурсы. План: read-only inventory → минимальная конфигурация запуска → честный отказ без БД → локальные проверки. Зависимости: текущий Next.js/Node, PostgreSQL/PostGIS и неизменённые DB guards. Критерии: сборка, PORT, health/API, отсутствие скрытого fallback, сохранение работающей локальной БД. Риски: автоматический deploy при подключении GitHub, недопустимый внешний endpoint, секреты в диагностике.

## Что подтверждено

- Ветка `feature/neon-test-profile`, исходный HEAD `b41af5aa60ca660a5989984f633b51963fa810ff`, origin `https://github.com/normanbrowndp-maker/terreno.git`. В начале рабочее дерево чистое. Коммиты и push на этом шаге не выполнялись.
- Railway MCP подтвердил проект `terreno` (`be1a33e8-62d7-4049-94be-ffbee488d904`), workspace `norman's Projects`, environment `staging` (`40ba73a9-c0e6-489b-aaeb-24e691f95d1b`). В успешном inventory: нет services, volumes, buckets, shared variables и staged changes. Никаких изменяющих Railway-вызовов не было.
- Один повтор inventory/списка deployments временно вернул transport HTTP 500; последующее read-only перечитывание успешно подтвердило ноль services/resources/staged changes и пустой список deployments. Агент deployment не запускал. Тариф и текущий счёт аккаунта не проверены; бесплатное размещение не обещается.

## Локальная конфигурация

- [railway.json](../railway.json): Railpack, `npm run build`, `npm run start:railway`, healthcheck `/health/ready`, timeout 120 s, ON_FAILURE с максимумом 3 повторов процесса. Это не механизм включения/отключения GitHub autodeploy. Нет pre-deploy/bootstrap/migration/seed-команд.
- `start:railway` слушает `0.0.0.0`. Next CLI читает `PORT` из окружения процесса. Исходный локальный `npm run start` продолжает слушать loopback. Сборка — `npm ci` и `npm run build`.
- [Шаблон переменных](../infra/railway/runtime.env.example) не содержит credentials и ничего не включает. `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`; `RAILPACK_NODE_VERSION=26.13.1` совпадает с локальной версией; `RAILPACK_NODE_NPM_INSTALL="npm ci"` использует lockfile. npm закреплён в `packageManager`. Доступность этого Node/npm в Linux Railpack ещё требует проверки при отдельно разрешённой сборке.
- `PORT` предоставляет Railway; его не нужно помещать в `.env.local`. Будущие `DATABASE_URL`, `TRAVEL_DATABASE_PROFILE`, `TRAVEL_DATABASE_ID` заполняются только после утверждения внешней цели. Их пустые значения намеренно дают not ready. Административные/migration secrets не должны попадать в application service.
- Production без доступной, проверенной и полностью заполненной БД возвращает API `503 CATALOG_UNAVAILABLE` без `data` и с `Cache-Control: no-store`; `/health/live` — 200, `/health/ready` — 503. Readiness проверяет также usable catalog. Страницы показывают maintenance UI; их HTTP-статус остаётся 200, а readiness/API являются сигналом недоступности. CatalogProvider при отказе не монтируется, сохранённые browser IDs не сверяются с пустым каталогом. В dev/test явно обозначенный bundled fallback сохранён.

## GitHub без автоматического запуска

Существующий MCP `connect-service-source` требует service ID. Обычный connect немедленно начинает build/deploy; staged connect откладывает применение до accept-deploy, но тоже требует существующего сервиса. Без создания сервиса привязать репозиторий к этому проекту доступным способом нельзя. Подключение не выполнялось; GitHub App access не проверялся.

После отдельного разрешения на следующий шаг:

1. Проверить доступ Railway GitHub App только к `normanbrowndp-maker/terreno`; при необходимости владелец разрешает доступ в GitHub.
2. Создать пустой сервис без source/deploy. Подготовить build/start/health settings. Не использовать обычный connect: он может немедленно запустить build.
3. Через MCP подготовить только staged source в точном staging: repo `normanbrowndp-maker/terreno`, branch `feature/neon-test-profile`, `staged:true`; при необходимости pin проверенного commit SHA. Перечитать staged changes. Не вызывать accept-deploy и не применять изменения в dashboard. Это отложенная привязка, не подключённый работающий сервис.
4. Перед применением обеспечить Disable autodeploy либо commit pin без слежения за веткой. Если настройка недоступна до первого connect, не применять source до отдельного разрешения на первый deployment. Только после подготовки БД, проверки лимитов/расходов и разрешения — применить pending changes. `Wait for CI` не заменяет Disable autodeploy; main автоматически не подключать.

## Что требуется от внешней PostgreSQL

Текущий resolver допускает только loopback local и отдельно утверждённый neon-test; внешнего generic/Oracle профиля нет. Произвольный удалённый URL остаётся запрещён. Пустой env-шаблон не является реализацией внешнего профиля. Guards, registry/pendingTargets, `.env.local`, bootstrap и шесть миграций не менялись.

Нужен отдельно согласованный строгий профиль с точным hostname/port/database/role и проверкой identity, TLS verify-full с доверенным CA, сетевым доступом из Railway, таймаутами и небольшим pool. Целевая PG17 должна поддерживать PostGIS/pg_trgm и управляемые ownership/ACL расширений, необходимые текущим проверкам. Runtime остаётся непривилегированным reader; bootstrap и мигратор — отдельные административные каналы. Существующие проверки ACL/identity, checksums и advisory locks сохраняются. Подготовка схемы/наполнение выполняются отдельно после разрешения, не из build/start. Нужны backup/restore и план обновлений.

Neon остаётся BLOCKED BY PROVIDER ACL. Oracle рассматривается, но не выбран и не подключён. Новый PostgreSQL в Railway не создавался. Приложение пока обслуживает versioned editorial dataset; готовность БД не означает готовность отдельного массового production-контента.

## Реальные проверки

- `npm run build`, `npm run typecheck`, `npm run lint` — PASS. Выявленный TS-тип окружения нового smoke-runner и использование обычной ссылки вместо Next Link исправлены; проверки не отключались.
- Unit: 161/161, включая 7 новых production-catalog/503/readiness/санитизация/fallback тестов. Новый тест сначала воспроизвёл ложный readiness 200 при пустом каталоге, затем прошёл после исправления route.
- `npm run test:production` — PASS: два отдельных production-процесса на динамическом PORT; отсутствующая БД и запрещённый внешний `.invalid` endpoint; в каждом live/ready, четыре API и пять страниц. Синтетическое значение не попало в HTTP/логи. Реальных внешних DB-соединений не выполнялось.
- Local application rehearsal: 10/10 с физическим изолированным PostgreSQL/PostGIS, существующим runner, шестью миграциями и API/guards. Chromium: 2/2 foundation desktop/mobile, production Next + реальная локальная БД; API подтвердил postgres/ready и 49 мест трёх стран.
- Architecture boundary, credential pattern scan, docs checker (170 исходных hashes, 46 Markdown-файлов) и `git diff --check` — PASS. SHA256 всех 25 защищённых файлов совпали с контрольной точкой, включая `.env.local`, DB guards/registry, bootstrap и шесть миграций; HEAD не изменился. Предупреждения Git касались нормализации CRLF→LF, ошибок whitespace нет.
- Официальная Railway JSON schema доступна (HTTP 200), но установленный Ajv не поддерживает её draft 2020-12, полная schema-validation не подтверждена. Использованные поля сверены с официальным reference и локальными assertions. Зависимости ради валидатора не устанавливались. Linux Railpack build, Railway routing и облачная БД не тестировались.

Навыки: vercel-react-best-practices, systematic-debugging, test-driven-development, security-review, verification-before-completion. Дизайн-скиллы не требовались для изменения server readiness и запуска.

## Следующий практический шаг

Выбрать внешнюю PostgreSQL с контролируемыми extension ACL и согласовать строгий профиль подключения. Затем отдельно разрешить создание пустого Railway service, staged GitHub source без применения, проверку бюджета и первый deployment. Локальные изменения этой задачи ещё не опубликованы.

Источники: [service/source](https://docs.railway.com/services), [GitHub autodeploy и Disable](https://docs.railway.com/deployments/github-autodeploys), [config-as-code](https://docs.railway.com/config-as-code/reference), [Railpack Node](https://railpack.com/languages/node).
