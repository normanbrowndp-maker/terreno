# План проверки качества

## TERRENO Italy — текущая регрессия

Фактически выполнено 2026-11-18: `npm run check` — PASS (53 unit,24 real integration, strict/lint/build и все gates); `npm run test:e2e` —14/14 на production build. Регрессии ревью: неполная коллекция, потеря ownership между preflight/upsert с rollback до child writes, URL reload/back/reset и pending saves при storage event. Дополнительно34 скриншота/10 сравнений и реальное отключение/восстановление только изолированной БД: live200, ready503→200, truthful bundled→postgres. Полная проверка аудита не чистая:16 известных dev-only findings; production audit0. [Полный результат](ITALY_REPORT.md).

TRAVEL-014…017: полная схема/файлы фото, точный48-city inventory/19 регионов, диакритика/aliases, bounded API input, категории/нет подтверждённых часов; browser saved version/corruption/denial/cross-tab/удаление фильтра; настоящая Mercator geometry и стабильная SSR serialization. Real PostGIS: повторный demo seed, production separation, coordinates/distance, runtime refusal и city-country FK. Исходные DB tests сохранены; counts обновляются с6 миграциями, transaction-fixture checks адресованы исходным UUID, а не предполагают пустоту всей demo-БД.

E2E проверяет пять семейств экранов на1440/768/390/360, реальные фото, поиск/навигацию, ошибки/неизвестные записи, отсутствие runtime/hydration errors и photo fallback. Финальные screenshots и сравнение с PDF — отдельные artifacts. Итоговые команды/числа записываются после свежего полного прогона; старые результаты ниже не считаются подтверждением новых экранов.

Статус: **план продукта и реализованные проверки фундамента**, 2026-11-18. Исторические проверки этапа0: [audit/VALIDATION](audit/VALIDATION.md). Сейчас установлены и реально запускаются unit, real-PostGIS integration, Chromium E2E, strict/lint/build и safety gates; числа/команды в STAGE1_REPORT. CI workflow подготовлен, удалённо не исполнялся. Будущие каталог/auth/planner тесты ниже остаются планом.

## Стратегия

Unit проверяет чистые правила; integration использует **реальную изолированную PostgreSQL/PostGIS**, а не SQLite; contract проверяет DTO против OpenAPI; Playwright Test проверяет пользовательские действия. Провайдеры во время обязательного CI подменяются контролируемыми doubles; отдельно редкие live contract probes разрешённого сервиса с лимитом и без личных данных. Успех mocked test не является доказательством покрытия дорог Казахстана.

Цель не максимальное число тестов. Каждая проверка должна защищать от конкретного сбоя, ошибки данных или нарушения прав. Общий процент coverage не заменяет сценарии ниже. Для исправления бага сначала воспроизводящий failing test, потом минимальное исправление и регрессия. Для doc-only этапа0 достаточно structural/hash/review проверки; искусственные продуктовые тесты не создаются.

## Матрица требований и проверок

| Набор | Требования/этап | Основные assertions | Когда обязателен |
| --- | --- | --- | --- |
| QA-00 | Подготовка | 10 документов, ссылки,7 полей задач,170 оригинальных хешей, нет продукта/новых skills | TRAVEL-001/002 |
| QA-01 | Основа/этап1 | Чистая установка, env failure без secrets, live200, readiness503 без БД | TRAVEL-005/006 |
| QA-02 | Схема/этап1 | FK страны/региона, UNIQUE, publication, migration locking/repeat, distance meters, bbox index | TRAVEL-007 |
| QA-03 | Восстановление/этап1 | Отдельная БД, совпадают counts/FK/контрольные записи/версия схемы/PostGIS, dev не затронута | TRAVEL-008 |
| QA-04 | FR-01…04/этап2 | Published-only, q/фильтры AND, Unicode NFC, fallback, pagination/sort, 400/404, source/license | TRAVEL-009/010 и UI задачи |
| QA-05 | FR-05…06/этап3 | bbox/ranges/500, truncated, stale viewport response, geolocation denied, WebGL/tiles down, attribution | Ворота3 |
| QA-06 | FR-07…08/этап4 | 2/10 stops success,1/11 fail, правильный порядок/units, partial=null totals,422/429/5xx/timeout | Ворота4 |
| QA-07 | FR-09…12/этап5 | Вход/выход/reset/revoke, userA vs userB, child ownership, CSRF, rate limit, no shared cache | Ворота5 |
| QA-08 | FR-10…11/этап5 | Reload persistence, concurrent409/no partial write, favorites idempotent, visits date, archived place snapshot | Ворота5 |
| QA-09 | FR-13…14/этап6 | Закрыто/неизвестно, impossible day, разные timezones/DST, no invented IDs, editable output, no silent save | Ворота6 |
| QA-10 | FR-15…16/этап7/8 | Полный критический E2E, accessibility и performance не ухудшились | Каждое расширение/дизайн |

QA-ID — набор проверки, не задача разработки; задачи всегда имеют TRAVEL-ID.

## Обязательные негативные сценарии

- API: неизвестные поля, повтор scalar параметра, NaN/Infinity, неправильный UUID, oversize body, limit101, offset10001, пустой/длинный q, инъекция строкой и непредусмотренная сортировка.
- География: перепутанные lat/lon, точки вне допустимых интервалов, неверный SRID, радиус в метрах, bbox через антимеридиан отклоняется в KZ-v1; точка на границе bbox обрабатывается согласно зафиксированному SQL.
- Контент: отсутствующий перевод, казахские символы, неизвестные часы работы, неопределённая лицензия блокирует публикацию, источник недоступен во время импорта, дубликаты разных источников не сливаются автоматически.
- Маршрут: нет дороги между двумя точками; неизвестное место; malformed upstream; неправильное число legs; negative distance; deadline; rate limit. Нельзя рисовать прямую как рассчитанный путь.
- Поездки: пользовательB меняет UUID поездки/дня/stop пользователяA; неизвестный stop ID в PATCH; ownerId в body; version устарела; середина транзакции падает; удалённое место остаётся в snapshot.
- Сохранённый routing: пока провайдер отвечает, stop/место изменилось —409 и никакой записи; повтор inputHash идемпотентен; partial сохраняет legs без выдуманного total; archived visit остаётся читаемым только владельцу.
- Auth: logout/revoke прекращает доступ, reset-токен истёк/использован повторно, CSRF attempt отклонён, аккаунт удалён, private response не попадает другому пользователю через cache.
- Планировщик: дня недостаточно, временная зона меняется в поездке, закрытый день, расписание неизвестно, провайдер недоступен, LLM возвращает несуществующие placeId/инструкцию/невалидный JSON. Обычный validator отклоняет результат.

## Среда и данные

Изолированные dev/test БД и runtime/migrator роли. Перед изменяющими integration тестами проверить loopback host, `travel_test_*`, разрешённую роль; проверка одного NODE_ENV не даёт защиты от подключения к реальной БД. Никаких production URL в CI. Fresh DB на job предпочтительнее очистки общего экземпляра. Не применять reset/TRUNCATE к существующим пользовательским данным.

Синтетические fixtures стабильны, не содержат реальных пользователей, email/паролей/частных поездок. Для публичного пилота проверенные реальные данные хранят provenance; performance dataset10k явно synthetic и не публикуется как каталог. В CI фиксированы seed, timezone/locale, версии runtime/БД/browser и провайдерские doubles.

## Браузер и доступность

Playwright: сначала Chromium в обязательном PR gate; Firefox/WebKit при выходе пользовательского этапа, если выбраны поддерживаемыми браузерами. Viewports360/768/1280; network failure и reload. Локаторы по роли/label; не привязывать тесты к декоративным CSS-классам. Artifacts trace/screenshot при failure без session secrets.

Сценарии этапа2: открыть каталог → фильтр через URL → карточка → назад с тем же состоянием; empty state; ошибка БД/повтор; длинное ru/kk имя; keyboard focus и labels. Этап5 добавляет каталог→маршрут→вход→сохранить→logout→login→открыть. Согласовать перенос гостевого маршрута через вход (ISSUE-07) до реализации, не считать его автоматическим.

axe дополняется ручным keyboard/zoom review. Карта не единственный способ выбрать место; drag reorder имеет кнопки вверх/вниз; ошибки связаны с полями; live feedback читаем screen reader. Дизайн остаётся минимальным до этапа8.

## Производительность

Условия:10k synthetic places,20 параллельных клиентов,5мин, warm-up отдельно. Зафиксировать CPU/RAM, ОС, DB config, версии и запросы. Бюджет catalog API p95≤500мс, ошибки<1%, без внешних API. Следить за N+1, ростом connections и bounded response. EXPLAIN(ANALYZE,BUFFERS) только на разрешённой локальной тестовой БД; query plans не должны включать приватные значения.

Web Vitals — цели LCP2.5с/INP200мс/CLS0.1, не результаты. Без полевых данных не объявлять p75 выполненным. Карта лениво загружается, отказ провайдера проверяется отдельно от скорости каталога.

## Безопасность и зависимости

До появления кода security audit ограничен архитектурными требованиями. После package-lock — audit прямых/транзитивных зависимостей, ручной разбор exploitability и фиксация решения по каждой существенной находке. Не запускать force update ради зелёного отчёта. SAST/secrets scan плюс ручной review ownership/SQL/XSS/SSRF/CSRF/session. Отсутствие находок в scanner не считается доказательством полной безопасности.

## Команды будущего gate

Команды npm ci/lint/typecheck/test:unit/test:integration/build/test:e2e уже созданы и запущены. npm run check объединяет quality gates, включая source/index secrets, immutable skills/docs и зависимость с истекающим dev-review. Integration не пропускается без БД. Будущие пользовательские QA-04…10 не выполнялись за исключением начального UI smoke, поскольку соответствующие функции ещё не реализованы.

## Отчёт и критерий выхода

Для каждой TRAVEL-задачи записывать команду, окружение, дату, exit code, число сценариев, failure и исправление. При сбое сохранять воспроизведение и не отключать проверку. Известный дефект с нарушением критериев блокирует ворота этапа; перенос допускается только явным пересмотром требований владельцем, с записью решения. После изменений повторять затронутый слой и критический сквозной сценарий, без бессмысленного повторного прогона уже достаточных проверок.
