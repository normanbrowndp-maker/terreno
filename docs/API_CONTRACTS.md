# Проект API-контрактов

## Действующие Italy preview endpoints — TRAVEL-015

`GET /api/v1/cities`, `/cities/{slug-or-id}`, `/places`, `/places/{slug-or-id}` под существующим префиксом `/api/v1` работают read-only. Списки принимают `q` (max80), `city` (slug), `category` (cafe/food/viewpoint/event/garden/museum/landmark), `openNow=true|false`, `limit=1…50` (default50). Дублированные/неизвестные параметры и неправильные значения дают400 `INVALID_QUERY`; отсутствующая запись404 `NOT_FOUND`. При `openNow=true` список пуст: live-расписания не подтверждены. Это честное отсутствие данных, не вычисление «открыто».

Ответ: `{data,meta}`. В meta обязательны `dataset=italy-editorial-demo-v1`, фактический `backend=postgres|bundled`, `availability=ready|database-unavailable|not-seeded|database-not-configured`, `verifiedAt`, `contentLocale=en`, `openingStatus=not-verified`; списки также `total/limit`. Source/media metadata и исходные WGS84 доступны в DTO. При отсутствии БД возвращается явно помеченный bundled sample, без заявления о записи в PostgreSQL. HTTP ошибки не содержат SQL/credentials. Cache-Control:no-store.

`/api/v1` сохраняет совместимую foundation metadata; `/health/live` и `/health/ready` сохранены. Public write/auth/bookmark API отсутствует; bookmarks только browser storage. Следующие разделы — прежний целевой контракт production/routing/trips, он не является перечнем реализованного. Прежние примеры другой географии исторические и не используются текущим каталогом.

Статус: **бизнес-контракты предложены**, 2026-11-18. На этапе1 реализованы только GET /health/live, /health/ready и /api/v1 (metadata {data:{apiVersion:'v1',stage:'foundation'}}). Все places/map/routes/trips/auth endpoints ниже остаются будущими и не имитируются заглушками. Base path `/api/v1`, JSON UTF-8, Node runtime. OpenAPI3.1 для каталога — TRAVEL-010.

## Общие правила

- UUID в canonical string; времена RFC3339 UTC; date `YYYY-MM-DD`; единицы расстояния m и времени s. GeoJSON `[longitude, latitude]`.
- Публичный каталог не требует входа; личные endpoints — серверная cookie-сессия и owner scope. Session токен не передаётся в query/localStorage.
- Неизвестные query/body поля отвергаются 400; повтор одного scalar query-параметра — 400. Категория и регион по одному; multi-select не входит в v1.
- Успех списка: `{ "data": [], "page": { "limit": 20, "offset": 0, "hasMore": false } }`. Карта использует GeoJSON envelope ниже; карточка `{ "data": {...} }`. Для ошибок единый формат.
- Public cache только для published; private `Cache-Control: private, no-store`. Request ID возвращается также в `X-Request-ID`.
- Request body максимум 64 KiB для route preview и trip mutation. Серверные лимиты и external deadlines обязательны, не полагаться на UI.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные параметры запроса",
    "details": [{ "field": "limit", "reason": "Ожидается целое число от 1 до 100" }],
    "requestId": "example-request-id"
  }
}
```

Ошибки: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN для запрещённого действия вне сокрытия ownership; 404 NOT_FOUND (включая чужую поездку); 409 VERSION_CONFLICT; 413 PAYLOAD_TOO_LARGE; 422 ROUTE_UNAVAILABLE; 429 RATE_LIMITED с Retry-After; 502 PROVIDER_BAD_RESPONSE; 503 DEPENDENCY_UNAVAILABLE; 504 PROVIDER_TIMEOUT. В 5xx не возвращать stack, SQL, cookies, credentials или полный upstream body.

## Каталог — этап 2

### GET /places

| Параметр | Правила |
| --- | --- |
| country | ISO alpha-2, default KZ, только включённые страны; неизвестная/не включённая — 400 |
| regionId | UUID, необязательный; неверный формат — 400, отсутствующий в стране регион — 400 |
| category | code из справочника, необязательный; неизвестный — 400 |
| q | trim, Unicode NFC, 2…100 символов; пустой после trim равен отсутствию |
| locale | ru/kk/en, default ru; неподдерживаемый — 400 |
| sort | name или updated_desc, default name |
| limit | integer 1…100, default 20 |
| offset | integer 0…10 000, default 0; больший offset — 400, позднее возможна cursor pagination |

Порядок name: `lower(displayName),id` с фиксированной collation выбранной БД; updated_desc: `updated_at DESC,id ASC`. Приёмка — стабильность на одинаковых данных и согласованность страницы/API, не лингвистический рейтинг. Поиск ищет подстроку имени в любом имеющемся переводе, отображение использует locale fallback. Запрос за пределом набора даёт 200 и пустой массив. Все фильтры объединяются AND. hasMore вычисляется через limit+1; total count не обязателен.

```json
{
  "data": [{
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Синтетическое место для примера",
    "contentLocale": "ru",
    "countryCode": "KZ",
    "regionId": "22222222-2222-4222-8222-222222222222",
    "categoryCodes": ["nature"],
    "location": { "type": "Point", "coordinates": [76.9, 43.2] },
    "visitDurationMinutes": null,
    "verifiedAt": "2026-11-18T00:00:00Z",
    "version": 1
  }],
  "page": { "limit": 20, "offset": 0, "hasMore": false }
}
```

Пример вымышленный, не источник достопримечательности. Публичный DTO не содержит draft status, роли и внутренние поля импорта.

### GET /places/{placeId}

locale как выше. 200 data: поля списка + `description: string|null`, `timezone: string`, `addressText: string|null`, `updatedAt`, `sources: [{name,url,license,attribution,checkedAt}]`, `media: [{url,alt,author,license,sourceUrl}]`. URL медиа формируется сервером из контролируемого storage key. Неизвестный/archived/draft — 404; синтаксически неверный UUID — 400. Отсутствующая информация возвращается null, источники обязательны для published.

### GET /countries; GET /regions; GET /categories

200 `{data:[...]}`. countries: code/name/contentLocale; regions требует country (default KZ), возвращает id/code/countryCode/name/timezone/contentLocale; categories — code/name/contentLocale. locale имеет те же правила. Справочники маленькие, фиксированный максимальный объём 500 записей на ответ; превышение требует pagination до расширения контента, не молчаливого усечения. Не существует публичных POST/PUT для редакции каталога; публикация — контролируемый import script.

## Карта — этап 3

### GET /places/map

Общие country/regionId/category/q/locale как в /places. Обязательный `bbox=west,south,east,north`: четыре finite number, longitude [-180,180], latitude [-90,90], south<north. В первом KZ-выпуске west<east; bbox через антимеридиан отклоняется 400 с явным reason. До страны с пересечением антимеридиана расширить контракт/запросы и тесты. limit 1…500, default 500; offset/sort не принимаются.

200:

```json
{
  "data": { "type": "FeatureCollection", "features": [] },
  "meta": { "limit": 500, "truncated": false }
}
```

Каждая Feature: id=placeId, geometry Point, properties `{name,contentLocale,categoryCodes}`. Выборка по bbox и тем же фильтрам, стабильный id order. При >limit — truncated=true, UI предлагает приблизить карту; API не утверждает полноту покрытия. Сервер не принимает произвольный provider URL.

### Будущий поиск рядом

Не входит в первый контракт: отдельное уточнение radiusM и центра, max-radius и privacy потребуется перед реализацией. Не добавлять неоднозначный nearby без единиц.

## Маршрутизация — этап 4

### POST /routes/preview

Публичный preview без сохранения; лимит запросов, origin policy и cancellation. Тело:

```json
{
  "placeIds": ["11111111-1111-4111-8111-111111111111", "33333333-3333-4333-8333-333333333333"],
  "mode": "driving"
}
```

От 2 до 10 UUID, повтор места допускается для возврата; соседние одинаковые placeIds — 400. Все места published из активных стран. Неизвестное место — 404; mode из разрешённых провайдером, первый предлагаемый — driving, другое значение — 400. Произвольные координаты/URL и optimize не принимаются. Сервер берёт текущие координаты, порядок сохраняет.

200 data: `status: calculated|partial`, `mode`, `provider`, `calculatedAt`, `inputHash`, `placeVersions: [{placeId,version}]`, `distanceM: number|null`, `durationS: number|null`, `legs: [{fromIndex,toIndex,status:calculated|unavailable,distanceM:number|null,durationS:number|null,geometry:GeoJSONLineString|null,reason:string|null}]`.

Для полностью рассчитанного пути total — сумма всех legs. Для partial total=null, чтобы не выдавать неполный путь за весь. Если никакой участок не рассчитан — 422 ROUTE_UNAVAILABLE. Если зависимость недоступна/истёк deadline — 503/504. Время ожидания всего запроса ≤10 с; retry upstream максимум один только для transient network/5xx в пределах deadline, не повторять 4xx и не игнорировать 429. Тайлы/геокодер не используются как routing.

Геометрия поставщика проверяется на finite WGS84; метрики неотрицательные, число legs=N-1. Прямолинейная оценка не подставляется вместо результата. Покрытие driving по Казахстану — предмет stage gate, до выбора провайдера endpoint не считается готовым.

## Аккаунт и сохранение — этап 5

Auth routes, протокол регистрации и восстановления определит ADR-005; данный документ фиксирует поведение, а не совместимость с ещё не выбранной библиотекой. GET `/me` → 200 `{data:{id,displayName}}` для сессии, иначе 401.

| Endpoint | Запрос/результат | Доступ |
| --- | --- | --- |
| GET /trips | limit 1…100 default20, offset0…10000; 200 data summaries {id,title,startDate,endDate,version,updatedAt} + page | Только свои, порядок updatedAt desc/id |
| POST /trips | {title,startDate:null или date,endDate:null или date,defaultTimezone}; 201 data Trip, Location | ownerId из сессии |
| GET /trips/{id} | 200 data Trip | owner, иначе 404 |
| PATCH /trips/{id} | {expectedVersion, title?,startDate?,endDate?,defaultTimezone?,days?}; 200 data Trip | Транзакция/version; 409 при конфликте |
| DELETE /trips/{id} | expectedVersion в query; soft archive, 204 | owner; stale version409; чужой404 |
| PUT /favorites/{placeId} | Без body; 204 | Идемпотентно, только published place |
| DELETE /favorites/{placeId} | Без body; 204 даже если записи нет | Только своё |
| GET /favorites | Pagination/locale как /places, только свои опубликованные карточки; archived не возвращать | private |
| PUT /visits/{placeId}/{date} | {notes:string или null}, 204 | Date не в будущем по timezone места; 1 запись на день |
| DELETE /visits/{placeId}/{date} | Без body, 204 | Только своё |
| GET /visits | limit/offset как /trips; 200 {placeId,visitedOn,notes} + page | private; archived сохраняется в истории |

GET /visits дополнительно возвращает `placeName`, `location`, `placeAvailable`: сервер читает сохранённый каталог, включая archived, только в owner-scoped истории; публичную карточку архивного места это не открывает. Физическое удаление мест с visits/trip references запрещено штатным процессом.

Trip DTO: `{id,title,startDate,endDate,defaultTimezone,version,createdAt,updatedAt,days:[{id,dayIndex,date,timezone,stops:[{id,placeId,position,visitDurationMinutes,notes,nameSnapshot,locationSnapshot,placeAvailable,placeVersionSnapshot}]}]}`. POST создаёт days=[]; PATCH days заменяет всю последовательность в одной транзакции. Вход day `{id?:UUID,dayIndex,date,timezone,stops:[{id?:UUID,placeId,position,visitDurationMinutes,notes}]}`: известные id принадлежат этой поездке, новые генерируются сервером; snapshots/ownerId запрещены во входе. Не более 30 дней и 10 stops на день первого выпуска; соседние одинаковые места допустимы в сохранённом плане, но для routing требуется устранить нулевой участок.

title 1…200 после trim, notes ≤2000, expectedVersion positive integer, позиции/индексы непрерывны от0, dates обоих концов согласованы. Все проверки полного состояния выполняются до commit, при ошибке ничего не меняется. При заданном диапазоне дни внутри диапазона и date=startDate+dayIndex; для недатированной поездки date=null. Максимальный диапазон 30 календарных дней. Клиент не отправляет снимки источников/геометрии как доверенные данные. Удаление/архивирование требует подтверждения в UI, а не внешнего разрешения на каждое действие владельца.

### Сохранение расчёта для поездки

Этап5: POST `/trips/{id}/route-snapshots`, body `{expectedVersion,dayIndex,mode}`. Owner scope; 404 для чужой/архивной поездки,400 для дня без2…10 пригодных остановок. Сервер читает точки/версии, выполняет расчёт **вне транзакции**, затем в короткой транзакции перепроверяет trip version и версии мест. При изменении409 без записи; иначе сохраняет snapshot с trip_version/input_hash и возвращает201 `{data:RouteSnapshot}`. Trip version от этого не меняется: содержимое поездки не редактируется. Повтор одинакового актуального inputHash возвращает200 с существующим snapshot. Snapshot DTO: `{id,tripId,tripVersion,dayIndex,mode,inputHash,placeVersions,status,provider,calculatedAt,stale,distanceM,durationS,legs}`; структура legs/placeVersions совпадает с preview. GET `/trips/{id}/route-snapshots` возвращает `{data:[...]}` только для владельца, максимум один последний snapshot на dayIndex/mode, с stale при несовпадении текущих версий. Это техническая часть сохранения маршрута этапа5, не новая возможность этапа0. Изменение остановок не подменяет старый расчёт новым.

## Планирование — этап 6

Контракт `/planner/preview` **зарезервирован концептуально**, не готов к реализации: сначала ADR по ограничениям, часовым поясам, покрытию часов работы, transport modes и LLM. Результат должен ссылаться на существующие placeId, раскрывать assumptions и warnings, объяснять невыполнимые ограничения и требовать явного сохранения. Новая версия OpenAPI и тестовые примеры — обязательный вход этапа 6.

## Эксплуатационные endpoints — этап 1

GET `/health/live` → 200 `{status:"ok"}` без обращения в БД; GET `/health/ready` → 200 `{status:"ready"}` после соединения и проверки версии схемы, иначе 503 `{status:"not_ready"}` без сведений об адресе/секретах. Эти пути вне `/api/v1`. Подробные диагностики не публикуются.
