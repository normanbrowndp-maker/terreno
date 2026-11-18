# Этап 1 — технический фундамент

Дата: 2026-11-18. Основание: владелец утвердил модульный монолит Next.js/TypeScript, PostgreSQL/PostGIS, версионируемый API, пилот Астана/Алматы/Бурабай, данные ru/kk/en и разрешил локальную разработку этапа1. Railway/Neon/AWS SES/Cloudflare — планируемые интеграции, без развёртывания и подключения.

Исполнение: последовательно в текущей папке, по TRAVEL-003…008. Существующие документы и скиллы сохраняются. Состояние и фактические результаты фиксируются в STAGE1_REPORT. Первые этапы каталога, карты, маршрутизации и авторизации не реализуются.

## Цель и структура

Получить запускаемое приложение, строгие проверки, серверные границы модулей и безопасную основу SQL-миграций. `src/app` — тонкие страницы/HTTP; `src/modules/{catalog,geography,routing,identity,trips}` — публичные типы/порты без фиктивных repositories; `src/shared/{config,db,http}` — валидация, безопасность подключения, инфраструктура. Миграции/fixtures отделены от реального пилотного контента. Внешний API резервирует `/api/v1`, бизнес-логика не зависит от Next Request.

## Ограничения

- Никакой геймификации, платных API, облачных ресурсов, публикации и push.
- Не изменять существующую БД на5432 и установленный PostgreSQL. Только новый явно изолированный экземпляр/БД; при невозможности запуска честно указать непройденные DB-ворота.
- Секреты/данные/бинарные загрузки/backup остаются в ignored локальных каталогах. Runtime без DDL; отдельная роль миграций; destructive migrations запрещены.
- Сохранить исторические проверки этапа0/11 как snapshot checks; для нового этапа добавить самостоятельные проверки, не превращать старое условие «приложения нет» в фиктивный PASS.
- Базовый UI — читаемая адаптивная техническая стартовая страница; без макетов готового каталога и без генерации дизайна.

## Задачи и проверяемые шаги

### TRAVEL-003/004 — решения, Git и checkpoint

- [ ] Проверить файлы/настройки/резервные копии; создать проверенную копию текущего состояния.
- [ ] Создать безопасные .gitignore/.gitattributes, локальный Git и author из предоставленного email; просмотреть staging и выполнить проверку секретов перед commit.
- [ ] Сохранить baseline commit; работать на foundation/stage-1 без remote/push. Текущая папка задана пользователем, дополнительный worktree не создаётся.
- [ ] Адресно записать утверждённые решения, не считать выбранным провайдер routing/auth.

### TRAVEL-005 — Next.js и unit quality

- [ ] Уточнить stable-версии; закрепить зависимости/lock и npm scripts.
- [ ] Сначала failing tests: безопасная env validation, loopback DB-target guard, координаты и locale fallback.
- [ ] Реализовать минимальные config/domain helpers; доказать GREEN без утечки значений.
- [ ] Добавить стартовую страницу, live/readiness, versioned API contract metadata; тестировать HTTP и явные503 без БД.
- [ ] Проверить lint/typecheck/unit/build, commit.

### TRAVEL-006/007 — изолированная БД и миграции

- [ ] Проверить доступность локального PostgreSQL/PostGIS без записи в существующие БД. Изолированная среда: loopback55432/55433 или Compose, собственный data directory.
- [ ] Подготовить versioned SQL migration runner с advisory lock, checksum, транзакцией, запретом destructive SQL и отдельной runtime ролью.
- [ ] Подготовить только catalog/geography schema по DATABASE_SCHEMA; будущие аккаунты/поездки остаются интерфейсами.
- [ ] Integration: fresh/repeat/checksum/FK/publication/rollback, PostGIS метры, runtime rights; тестовые БД только с guard и без reset чужих данных.
- [ ] Доказать dump→restore в отдельную новую БД, если среда доступна; commit.

### TRAVEL-008 — CI и итоговая регрессия

- [ ] Vitest раздельно unit/DB integration; Playwright для smoke foundation, не для будущих функций.
- [ ] GitHub Actions без remote: frozen install/lint/typecheck/unit/real-PostGIS integration/build/E2E.
- [ ] Архитектурная проверка импортов, безопасные error DTO, secret scan staged/tracked, локальный dev/production HTTP smoke.
- [ ] Независимый итоговый code review по executing-plans; исправить значимые findings, повторить релевантные проверки.
- [ ] Обновить README/docs/статусы по фактическим результатам; итоговый локальный commit без push.

## Области усиленной проверки

1. Неправильный DATABASE_URL/test host: refuse до подключения; внешние URL и существующий5432 не использовать автоматически.
2. Ошибки configuration/DB: никаких секретов/stack в HTTP; live200 и ready503 при отказе.
3. Координаты/Unicode/locale: finite WGS84, meters, ru/kk/en, корректный fallback.
4. Частично выполненная/изменённая миграция: advisory lock, checksum mismatch, транзакционность и repeated-run без повторной записи.
5. Runtime DB role и module boundaries: без DDL, cross-module infrastructure imports и клиентского доступа к БД.

## Рабочие решения

Пользователь предоставил email без отдельного имени: в локальном Git этот адрес используется как user.email и user.name; вымышленное имя не вводится. Npm metadata сначала не читались из-за запрета записи глобального cache; повтор с разрешённым выполнением прошёл. Системные службы и глобальные настройки не меняются.
