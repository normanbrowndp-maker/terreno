# Правила работы над туристической платформой

## Приоритет и текущая граница

Текущий продукт — TERRENO, туристический путеводитель. Италия — первая страна в каталоге. Поддержка новых стран остаётся целью архитектуры. Функциональность, достоверность, стабильность, архитектура, безопасность и тестирование обязательны. Владелец разрешил точное воспроизведение desktop/mobile дизайна terreno-1.pdf; прежняя география Казахстана отменена. Геймификация запрещена: не добавлять XP, уровни, достижения, награды, игровые задания, рейтинги активности и соревнования. История, избранное, посещения и личная статистика разрешены.

Этап1 завершён; отчёт — docs/STAGE1_REPORT.md. Владелец разрешил итальянский интерфейс по PDF: главную/географическую карту,48 подтверждённых городов, страницы городов/мест, поиск/фильтры и сохранение на устройстве; безопасное расширение API/PostGIS, demo-контент отдельно от production. План — docs/ITALY_IMPLEMENTATION_PLAN.md. Backend не переписывать, старые миграции/тесты сохранять. Auth и дорожные маршруты не имитировать. Последующим явным запросом владелец разрешил TRAVEL-018: обычную публикацию текущей ветки `feature/terreno-italia` в существующий `origin` https://github.com/normanbrowndp-maker/terreno.git, без force, merge и изменения чужих веток. Отчёт — docs/GITHUB_PUBLISH.md. Railway/Neon/AWS SES/Cloudflare, платные сервисы и deploy не разрешены. Новый явный запрос владельца определяет дальнейший объём; уже данное разрешение повторно не запрашивать.

## Сначала контекст

Продолжение TRAVEL-026 — local integration/handoff: владелец сохраняет terreno-test, окончательный hosting/архитектурный выбор отложен до решения команды. Предыдущая рекомендация ownership-controlled PostgreSQL не является утверждённым переездом. Актуальная сводка — docs/NEON_INTEGRATION_HANDOFF.md. Подготовлен одноразовый local application rehearsal (реальный runner/pool/API handlers, без чтения env-файла и без SQL10/20); cloud SQL/roles/bootstrap/41 predicates/migrations/registry/env/Railway/AWS/push сохранять. Неработающий cloud REVOKE не повторять. NOLOGIN→подключение приложения требует отдельного согласованного решения, не менять роли автоматически.

TRAVEL-026, сравнение cloud_admin ACL и private schema: новый cloud SQL не выполнялся. Локальный PG17/PostGIS эксперимент доказал, что schema USAGE AND function EXECUTE слабее нынешнего allowlist: скрытая text(geometry) вызывается cast без USAGE; view dependencies также обходят namespace lookup. Все шесть неизменённых миграций прошли только в отдельной локальной fixture с migration search_path public,travel_extensions. Эквивалентный predicate не доказан, bootstrap SQL/production guards не менять ради PASS. Результат и11 локальных тестов — docs/NEON_BOOTSTRAP_REPORT.md. Рекомендована среда с контролируемыми extension owner/ACL; новый Neon bootstrap только после подтверждённого provider owner-side ACL механизма, его проверки и отдельного разрешения. Не повторять прежний REVOKE в облаке. Env/registry/migrations/cloud/push сохранять; это продолжение TRAVEL-026.

TRAVEL-026 routine evidence: один отдельно разрешённый rollback-only прогон установил778 нарушителей (747 postgis/31 pg_trgm), все owner cloud_admin, ACL PUBLIC EXECUTE/cloud_admin EXECUTE без grant option. Runtime получает доступ только через PUBLIC; bootstrap owner не владеет этими routines. Evidence docs/audit/neon_routine_evidence.json, отчёт docs/NEON_BOOTSTRAP_REPORT.md. Полный rollback подтверждён. Облачных permissions для исправления provider-owned ACL пока нет; не ослаблять41 guard/allowlist и не пытаться входить как cloud_admin. Новый cloud apply/diagnostic без нового разрешения не выполнять; migrations/env/registry/Railway/push запрещены.

TRAVEL-026: по отдельному разрешению выполнена одна rollback-only MCP диагностика; доказан отказ runtime_routine_allowlist:P0001. Полный откат подтверждён чтением/advisory lock (app roles/extensions/marker отсутствуют, owner/database ACL прежние). Signature/owner/источник лишнего EXECUTE пока не получены; provider ownership не считать доказанным.41 guard-предикат не ослаблен. Разрешение диагностики исчерпано: никаких новых write-транзакций или bootstrap с COMMIT без нового разрешения. Итог/минимальное направление исправления — docs/NEON_BOOTSTRAP_REPORT.md.

Продолжение TRAVEL-026 (диагностика20): все41 исходных предикатов сохранены и получили безопасные коды DETAIL. Локальная provider-owned routine/PUBLIC EXECUTE модель даёт runtime_routine_allowlist, но реальная причина Neon НЕ доказана. Диагностические/rollback/repeat тесты локально PASS; cloud tools/SQL не вызывались. До отдельного разрешения не запускать даже rollback-only облачный prepare. План диагностики и доказательства — docs/NEON_BOOTSTRAP_REPORT.md. Не считать bootstrap готовым/завершённым, не ослаблять guards и не выполнять новые cloud writes.

2026-11-20 TRAVEL-026: доказана и минимально исправлена0LP01 (PG17 separate-grantor ADMIN и INHERIT/SET);4 новых+6 выбранных прежних local bootstrap/10 unit/TS/lint PASS. Единственный разрешённый повтор через MCP прошёл10, но20 отказал P0001 verify; полный rollback подтверждён read-only после advisory lock. Новых ролей/extensions/marker нет, DB owner прежний. Дальнейшая cloud запись НЕ разрешена автоматически: лимит повтора исчерпан. Не ослаблять20/identity/ACL guards; отчёт docs/NEON_BOOTSTRAP_REPORT.md. Migrations/seed/registry/env/Railway/push запрещены.

TRAVEL-026: владелец разрешил MCP Нурман как отдельный административный bootstrap-канал без доказательства direct verify-full. Единственная атомарная попытка неизменённых prepare/verify остановилась в prepare, DETAIL extensions:0LP01; COMMIT не произошёл. Read-only recovery после advisory lock подтвердил полный откат: нет новых app roles/extensions/marker, DB owner прежний. Отчёт docs/NEON_BOOTSTRAP_REPORT.md. Не повторять cloud DDL вслепую: сначала локализовать membership ADMIN self-grant на первом non-superuser bootstrap, не ослабляя identity/ACL guards. Migrations/seed/pendingTargets/env/Railway/push не разрешены.

Последующее разрешение TRAVEL-025.3 заменило ограничение только ручного запуска: выполнен самостоятельный read-only inspection через Neon MCP Нурман с exact project/branch/compute/database/role, без получения credentials. Результат — docs/NEON_CLOUD_INSPECTION.md: PG17.12, bootstrap owner, нет app roles/пользовательских объектов, postgis/pg_trgm доступны, но не установлены. Direct psql/TLS verify-full этим MCP не подтверждены (backend pg_stat_ssl.ssl=false). Никаких bootstrap/10/20/DDL/DML/migrations/seed/registry/env/Railway/push без отдельного разрешения. Старый ручной handoff ниже — историческая альтернатива, не обязательный блокер read-only MCP.

TRAVEL-025.3: разрешён только ручной запуск владельцем существующего00 через direct psql -W/verify-full в отдельном защищённом терминале и проверка обезличенного результата. Агент не запускает интерактивный psql, не получает пароль/connection string и не выполняет SQL через MCP. Свежие metadata и офлайн CA сверены; до получения ответа TLS/SQL/готовность bootstrap неизвестны. Инструкция/шаблон — docs/NEON_READ_ONLY_HANDOFF.md. Bootstrap/10/20/DDL/DML/registry/env/Railway/push запрещены. Следующий целый ID — TRAVEL-026.

TRAVEL-025.2: официальный curl/Mozilla CA snapshot подготовлен в ignored `.local/neon-ca/`, SHA256 закреплён, офлайн проверены118 CA/ISRG Root X1 и загрузка в OpenSSL psql17.12. Отчёт docs/NEON_CA_VERIFICATION.md, verifier docs/audit/verify_neon_ca.py; будущая инструкция docs/NEON_DIRECT_CHANNEL.md обновлена. Это не разрешение на cloud connection/SQL или получение credentials: остановиться до отдельного согласования. `.env.local`, guards, migrations и pendingTargets сохранять. Следующий свободный целый ID — TRAVEL-026.

TRAVEL-025.1: подготовлена Windows psql -W/direct verify-full инструкция без получения cloud secrets; docs/NEON_DIRECT_CHANNEL.md. SQL00 расширен и проверен только локально READ ONLY, отдельная команда test:inspection:local не создаёт роли/extensions и не запускает migrations/seed. Запуск инструкции/облачное соединение требуют следующего согласования; CA/fingerprint пока не утверждены. Не исполнять SQL/cloud writes, не активировать pendingTargets/env/Railway/push. Следующий свободный целый ID остаётся TRAVEL-026.

TRAVEL-025: владелец разрешил только read-only cloud inspection exact TERRENO tuple через Нурман при подтверждённом direct PostgreSQL/TLS verify-full и согласованном защищённом credential channel. Metadata проверены; SQL не выполнялся из-за transport/secret-channel gate, см. docs/NEON_CLOUD_INSPECTION.md. Разрешение read-only сохраняется; не повторно спрашивать его, но не обходить требования канала. Любые writes/activation/env changes/push запрещены. Следующий свободный номер — TRAVEL-026.

TRAVEL-024: подготовлены и локально проверены SQL00/10/20 и отдельная ephemeral PG17 rehearsal; docs/NEON_BOOTSTRAP_REPORT.md и docs/NEON_BOOTSTRAP_IMPLEMENTATION_PLAN.md. Это не разрешение выполнять SQL в Neon, получать cloud credentials, менять роли/extensions/ownership или active registry/env/Railway/push. Реестр остаётся pending. Следующий свободный номер — TRAVEL-025. Minor test-harness initdb failure cleanup и реальные Neon capabilities/TLS остаются ограничениями в отчёте.

TRAVEL-023: разрешена локальная регистрация подтверждённых Neon metadata с тестами, без cloud SQL/credentials/bootstrap. Реальная запись — pendingTargets/state=pending-bootstrap; active targets пуст. Результат docs/NEON_TARGET_REGISTRATION.md, выполнение docs/NEON_REGISTRATION_PLAN.md, следующий предложенный scope docs/NEON_BOOTSTRAP_PLAN.md. Не переносить pending в targets без отдельного согласования bootstrap/SQL evidence. Никаких create/provider/env changes или push. Следующий свободный номер — TRAVEL-024.

Исторический TRAVEL-022: создан ровно один Free terreno-test в Нурман/org norman, Frankfurt/PG17; docs/NEON_PROJECT_CREATION.md. Разрешение создания исчерпано: не создавать второй проект. Тогда registry был пуст; последующий TRAVEL-023 разрешил только неактивную регистрацию metadata. Bootstrap/SQL/credentials/env changes/Railway и новый push всё ещё не разрешены.

Исторический TRAVEL-021: владелец разрешил обычную публикацию только `feature/neon-test-profile` в существующий terreno origin и read-only preflight нового Free terreno-test. Выбраны Нурман/org norman, Frankfurt/PG17. Сам TRAVEL-021 не разрешал создание ресурсов, credentials retrieval, cloud SQL, env changes, Railway или paid actions. Результат/точные параметры — docs/NEON_CREATION_PREFLIGHT.md; последующее отдельное создание отражено в TRAVEL-022 выше.

TRAVEL-019 — завершённый read-only аудит, docs/NEON_READINESS.md. Новый явный запрос разрешил TRAVEL-020: локальный fail-closed профиль Neon test, unit/regression, проверку двух account bindings и доступности GitHub metadata; план docs/NEON_TEST_PLAN.md. Авторизация MCP не разрешает create/update/delete, cloud SQL/migrations, получение connection strings/секретов, изменение `.env.local`, подключение других провайдеров, paid actions или push. До будущего cloud write выбрать один аккаунт и получить отдельное разрешение. Шесть исходных миграций и local-only guards сохранять.

1. Проверить текущее состояние файлов и Git; не считать папку репозиторием без проверки. Чужие изменения сохранять.
2. Прочитать относящиеся к задаче [оглавление docs](docs/README.md), [решения](docs/DECISIONS.md), требования и контракт затрагиваемого модуля. Не перечитывать весь каталог для каждой мелкой задачи.
3. Существующие документы сначала анализировать. Обновлять адресно с объяснением причины, сохраняя принятые решения и исторические результаты. Планируемое не выдавать за реализованное.
4. Присвоить задаче свободный TRAVEL-ID. TRAVEL-001…010 — ROADMAP; TRAVEL-011 — скиллы, TRAVEL-012 — границы фундамента, TRAVEL-013 — публикация фундамента GitHub. TRAVEL-014…017 — итальянская реализация в docs/ITALY_IMPLEMENTATION_PLAN.md; TRAVEL-018 — её публикация в docs/GITHUB_PUBLISH.md; TRAVEL-019 — read-only Neon audit в docs/NEON_READINESS.md; TRAVEL-020 — локальный профиль Neon test в docs/NEON_TEST_PLAN.md; TRAVEL-021 — публикация и preflight в docs/NEON_CREATION_PREFLIGHT.md; TRAVEL-022 — создание проекта в docs/NEON_PROJECT_CREATION.md. Следующий свободный номер — TRAVEL-026, если к моменту работы не появились новые задачи.

## Выбирать скиллы самостоятельно и по задаче

Перед действием проверить каталог доступных скиллов текущей сессии. Выбрать минимальный достаточный набор по смыслу задачи; прочитать применимый SKILL.md перед использованием и коротко сообщить пользователю, для чего он выбран. Не активировать все скиллы по умолчанию и не выбирать их по одному совпавшему слову.

Канонические проектные копии — `.agents/skills/<name>/SKILL.md`. При одноимённых записях в каталоге сессии для работы с этим проектом читать эту копию; не смешивать советы разных версий. Пользовательские и plugin-скиллы не считать установленными в проекте. Не изменять установленные пакеты ради локального обхода проблемы; ограничения записывать в docs/.

| Задача | Какие скиллы выбирать |
| --- | --- |
| Анализ требований/архитектуры | Доступные brainstorming/writing-plans при необходимости проектирования; не подключать визуальные скиллы к чистой API/DB задаче |
| React/Next.js, fetch, bundle, серверный cache | `.agents/skills/vercel-react-best-practices/SKILL.md`, только нужные rules и с проверкой установленной версии React/Next |
| Сложная композиция React-компонентов | `.agents/skills/vercel-composition-patterns/SKILL.md`; compound components/context вводить при реальной потребности |
| Аудит существующего UI/accessibility | `.agents/skills/web-design-guidelines/SKILL.md`; получать актуальные guidelines по его инструкции, проверять конкретные файлы |
| Отдельная UX-проблема, формы, focus, мобильная навигация | `.agents/skills/ui-ux-pro-max/SKILL.md`, один нужный domain; не генерировать design system ради backend-задачи |
| Новый визуальный стиль/существенная переработка оформления | `.agents/skills/frontend-design/SKILL.md`; сейчас отложено, кроме явно поставленной визуальной задачи |
| Ошибка/неожиданное поведение | Доступный systematic-debugging до исправления; воспроизведение, причина, минимальная правка, регрессия |
| Новая продуктовая логика/исправление | Доступный test-driven-development для значимых правил; релевантные unit/integration/E2E по TEST_PLAN; тесты не заменять скиллом |
| Auth, SQL, внешние URL, права и секреты | Доступные security-review и при необходимости secret-serialization, по затрагиваемой поверхности |
| Завершение задачи | Доступный verification-before-completion: свежие команды и фактический результат |

Для PostgreSQL/PostGIS и Playwright отдельных проектных скиллов сейчас нет. При необходимости использовать проверенный доступный скилл окружения, если он действительно подходит, либо официальную документацию и обычные инструменты. Neon/Render/AWS не подключать ради общего SQL-вопроса. Отсутствие скилла не блокирует разрешённую инженерную работу и не разрешает установку пакета. Новые сторонние скиллы автоматически не устанавливать.

Вложенные AGENTS.md внутри Vercel-скиллов — справочники этих пакетов. Они не определяют направление всего продукта. Рекомендации скиллов не отменяют ограничения пользователя и проекта; технические советы проверять на совместимость и безопасность.

## Известные ограничения скиллов

- Не переносить пример `server-after-nonblocking` с передачей session cookie в лог. Секреты/cookies/tokens не логировать; для диагностики использовать несекретный requestId.
- Совет composition-скилла о замене useContext не является обязательной миграцией. Проверять API установленной версии; не рефакторить работающий код ради предпочтения скилла.
- В compiled React AGENTS.md есть три неразрешающиеся относительные ссылки; соответствующие файлы доступны в его `rules/`.
- В ui-ux-pro-max использовать фактический путь `.agents/skills/ui-ux-pro-max/scripts/search.py`; не копировать `${CLAUDE_PLUGIN_ROOT}/.claude/...` в PowerShell. Для пробного чтения — `python -B` без `--persist`, `--preview`, `--force`.
- Тесты внутри `.agents/skills` — тесты скиллов, не платформы. Не включать их в продуктовый test discovery и не считать доказательством качества приложения.

## Цикл небольшой задачи

Цель → зависимости → короткий план → безопасная контрольная точка → минимальное изменение → релевантные проверки → регрессия → исправления → обновление документации и статуса. До появления Git использовать проверенную файловую копию. Не создавать remote/push/облако без соответствующей задачи.

У каждой TRAVEL-задачи фиксировать цель, план реализации, зависимости, критерии приёмки, тесты, риски и статус. Следующий крупный этап не начинать до прохождения текущих ворот. При failure сообщить команду/причину и исправить; не скрывать ошибку и не отключать проверку ради PASS. Неприменимые проверки явно обозначать: наличие документации не доказывает готовность приложения.

Не удалять существующие функции без необходимости. Не делать destructive migration, не менять неизвестную существующую БД, production или облачную инфраструктуру. Платные API и системные установки требуют отдельного разрешения. Доступный connector не означает разрешение использовать аккаунт. Секреты не читать без необходимости, не помещать в Git/логи/публичный frontend.

Подробности: [WORKFLOW](docs/WORKFLOW.md), [TEST_PLAN](docs/TEST_PLAN.md), [SKILLS_AUDIT](docs/SKILLS_AUDIT.md).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
