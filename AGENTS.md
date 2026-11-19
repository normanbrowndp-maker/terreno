# Правила работы над туристической платформой

## Приоритет и текущая граница

Текущий продукт — TERRENO, туристический путеводитель исключительно по Италии. Функциональность, достоверность, стабильность, архитектура, безопасность и тестирование обязательны. Владелец разрешил точное воспроизведение desktop/mobile дизайна terreno-1.pdf; прежняя география Казахстана отменена. Геймификация запрещена: не добавлять XP, уровни, достижения, награды, игровые задания, рейтинги активности и соревнования. История, избранное, посещения и личная статистика разрешены.

Этап1 завершён; отчёт — docs/STAGE1_REPORT.md. Владелец разрешил итальянский интерфейс по PDF: главную/географическую карту,48 подтверждённых городов, страницы городов/мест, поиск/фильтры и сохранение на устройстве; безопасное расширение API/PostGIS, demo-контент отдельно от production. План — docs/ITALY_IMPLEMENTATION_PLAN.md. Backend не переписывать, старые миграции/тесты сохранять. Auth и дорожные маршруты не имитировать. Последующим явным запросом владелец разрешил TRAVEL-018: обычную публикацию текущей ветки `feature/terreno-italia` в существующий `origin` https://github.com/normanbrowndp-maker/terreno.git, без force, merge и изменения чужих веток. Отчёт — docs/GITHUB_PUBLISH.md. Railway/Neon/AWS SES/Cloudflare, платные сервисы и deploy не разрешены. Новый явный запрос владельца определяет дальнейший объём; уже данное разрешение повторно не запрашивать.

## Сначала контекст

TRAVEL-023: разрешена локальная регистрация подтверждённых Neon metadata с тестами, без cloud SQL/credentials/bootstrap. Реальная запись — pendingTargets/state=pending-bootstrap; active targets пуст. Результат docs/NEON_TARGET_REGISTRATION.md, выполнение docs/NEON_REGISTRATION_PLAN.md, следующий предложенный scope docs/NEON_BOOTSTRAP_PLAN.md. Не переносить pending в targets без отдельного согласования bootstrap/SQL evidence. Никаких create/provider/env changes или push. Следующий свободный номер — TRAVEL-024.

Исторический TRAVEL-022: создан ровно один Free terreno-test в Нурман/org norman, Frankfurt/PG17; docs/NEON_PROJECT_CREATION.md. Разрешение создания исчерпано: не создавать второй проект. Тогда registry был пуст; последующий TRAVEL-023 разрешил только неактивную регистрацию metadata. Bootstrap/SQL/credentials/env changes/Railway и новый push всё ещё не разрешены.

Исторический TRAVEL-021: владелец разрешил обычную публикацию только `feature/neon-test-profile` в существующий terreno origin и read-only preflight нового Free terreno-test. Выбраны Нурман/org norman, Frankfurt/PG17. Сам TRAVEL-021 не разрешал создание ресурсов, credentials retrieval, cloud SQL, env changes, Railway или paid actions. Результат/точные параметры — docs/NEON_CREATION_PREFLIGHT.md; последующее отдельное создание отражено в TRAVEL-022 выше.

TRAVEL-019 — завершённый read-only аудит, docs/NEON_READINESS.md. Новый явный запрос разрешил TRAVEL-020: локальный fail-closed профиль Neon test, unit/regression, проверку двух account bindings и доступности GitHub metadata; план docs/NEON_TEST_PLAN.md. Авторизация MCP не разрешает create/update/delete, cloud SQL/migrations, получение connection strings/секретов, изменение `.env.local`, подключение других провайдеров, paid actions или push. До будущего cloud write выбрать один аккаунт и получить отдельное разрешение. Шесть исходных миграций и local-only guards сохранять.

1. Проверить текущее состояние файлов и Git; не считать папку репозиторием без проверки. Чужие изменения сохранять.
2. Прочитать относящиеся к задаче [оглавление docs](docs/README.md), [решения](docs/DECISIONS.md), требования и контракт затрагиваемого модуля. Не перечитывать весь каталог для каждой мелкой задачи.
3. Существующие документы сначала анализировать. Обновлять адресно с объяснением причины, сохраняя принятые решения и исторические результаты. Планируемое не выдавать за реализованное.
4. Присвоить задаче свободный TRAVEL-ID. TRAVEL-001…010 — ROADMAP; TRAVEL-011 — скиллы, TRAVEL-012 — границы фундамента, TRAVEL-013 — публикация фундамента GitHub. TRAVEL-014…017 — итальянская реализация в docs/ITALY_IMPLEMENTATION_PLAN.md; TRAVEL-018 — её публикация в docs/GITHUB_PUBLISH.md; TRAVEL-019 — read-only Neon audit в docs/NEON_READINESS.md; TRAVEL-020 — локальный профиль Neon test в docs/NEON_TEST_PLAN.md; TRAVEL-021 — публикация и preflight в docs/NEON_CREATION_PREFLIGHT.md; TRAVEL-022 — создание проекта в docs/NEON_PROJECT_CREATION.md. Следующий свободный номер — TRAVEL-024, если к моменту работы не появились новые задачи.

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
