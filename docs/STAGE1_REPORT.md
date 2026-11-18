# Отчёт этапа 1

2026-11-18. Работа продолжается; окончательная сводка будет записана после final review и итогового прогона. Этот файл уже фиксирует проверенные факты, а не обещание готовности.

## Выполнено к текущей проверке

- Git: baseline commit cec7ee7, feature branch foundation/stage-1, только local author settings, remote не создан.
- Проверенная копия195 исходных файлов: `C:\Users\EsenovE\AppData\Local\Temp\travel-stage1-20261118-121953`.
- Next16.4.6/React19.3.1/TypeScript5.9.3; strict + noUncheckedIndexedAccess/exactOptionalPropertyTypes; ESLint9.39.5.
- Модули catalog/geography/routing/identity/trips как публичные контракты; без готовых бизнес-функций.
- Стартовая страница, /health/live, /health/ready, /api/v1 metadata; business catalog endpoints пока404.
- Изолированная native PG17.12/PostGIS3.7 на55433, свои data directory/роли/dev/test/restore. Существующие5432/55432 не трогались.
- Две forward-only миграции каталожной схемы; advisory lock, checksum, одна транзакция и runtime без DDL.
- Последние фактические результаты:27 unit,14 integration,2 Chromium E2E прошли; strict typecheck и production build прошли. Restore marker/schema/checksum/65 constraints проверены в отдельной пустой test DB.

## Рабочие решения

Ruling: работа в указанной папке и feature branch без дополнительного worktree — исходный проект не имел истории, user явно попросил создать основу здесь; контрольная копия и baseline commit обеспечивают возврат.

Ruling: точка хранится geometry(Point,4326) + range CHECK; distances cast to geography — geography нормализует невалидные координаты до CHECK, а интеграционный тест должен отклонять181°; нужны соответствующие bbox/geography expression indexes.

Ruling: Windows native portable PG/PostGIS выбран вместо установки Docker/WSL — система не меняется; цена решения: отдельный downloader/DLL workaround. Compose как непроверенная здесь альтернатива подготовлен.

Ruling: ESLint9.39.5 выбран для совместимости объявленных peers; EOL и unpatched picomatch dev advisory оставлены явным долгом в DEPENDENCY_REVIEW, production audit0. Новых публичных входов к glob нет.

## Исправленные причины сбоев

Npm cache EPERM → разрешённое выполнение; Git ownership sandbox → exact command-scoped safe.directory без global exception; ESM config warning → type=module; занятый55432 →55433 без остановки listener; Windows inherited pipes pg_ctl → stdio ignore/windowsHide; недостающие DLL PostGIS → комплект из того же официального архива; Vitest5 describe.sequential отсутствует → обычный последовательный describe; неправильный импорт внутреннего MigrationLoader type → выведение из публичных runner options; reparent publication invariant → отдельная миграция и RED→GREEN тест; restore spatial_ref_sys ACL → provision extension отдельно, штатные reference data не перезаписывать.

## Ограничения

GitHub workflow и Compose не исполнялись в облаке/контейнерах на этом компьютере. Full npm audit не чистый, см. DEPENDENCY_REVIEW. Каталог, карта, auth и внешние сервисы не реализованы и не подключены. Реальные пилотные данные/лицензии/редактор остаются задачей следующего этапа.
