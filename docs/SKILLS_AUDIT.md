# Проверка скиллов

Дата: 2026-11-18. Задачи: TRAVEL-001/002. Никакие скиллы, npm-пакеты и плагины не устанавливались/обновлялись. Прочитаны SKILL.md пяти локальных пакетов; полный security scan их вспомогательных файлов не выполнялся.

## Локально в проекте

| Скилл | Путь | Источник из skills-lock.json | Применимость сейчас |
| --- | --- | --- | --- |
| frontend-design | ../.agents/skills/frontend-design/SKILL.md | anthropics/skills | Найден и прочитан; визуальное оформление отложено |
| web-design-guidelines | ../.agents/skills/web-design-guidelines/SKILL.md | vercel-labs/agent-skills | Найден и прочитан; UI-кода нет, полноценный review неприменим |
| vercel-react-best-practices | ../.agents/skills/vercel-react-best-practices/SKILL.md | vercel-labs/agent-skills | Найден и прочитан; полезен для будущих fetch/bundle/cache решений, React-код пока не ревьюировался |
| vercel-composition-patterns | ../.agents/skills/vercel-composition-patterns/SKILL.md | vercel-labs/agent-skills | Найден и прочитан; применять по мере появления составных компонентов, не создавать библиотеку заранее |
| **ui-ux-pro-max** | ../.agents/skills/ui-ux-pro-max/SKILL.md | nextlevelbuilder/ui-ux-pro-max-skill | **Подтверждён локально**; наличие scripts/data/tests не означает готовность UI; в SKILL явно допускается пропуск для backend/API/DB |

Lock version2 содержит commit и computedHash для всех пяти пакетов. Это metadata происхождения, а не проверенная подпись и не доказательство соответствия remote. В baseline сохранены независимые SHA-256 каждого170 исходного файла; после документации они сравниваются. Алгоритм computedHash установщика не воспроизводился, remote commits локальных скиллов не перепроверялись.

## Уже доступны в пользовательском окружении

В `C:\Users\EsenovE\.agents\skills` проверено наличие SKILL.md: **systematic-debugging**, **security-review**, **secret-serialization**, **skill-scanner**, **find-skills**. Это пользовательские скиллы, не новые зависимости приложения. Можно использовать отладку до исправления бага, security-review при появлении исходников, secret-serialization при работе с моделями/логами секретов и skill-scanner перед добавлением пакета. Обнаружение файла не является аудитом всей цепочки поставки.

Также в каталоге доступных скиллов окружения представлены Neon Postgres и Render Postgres. Они полезны при явном выборе этих платформ; для текущего local-only проекта не требуют подключения облака.

## Найденные внешние кандидаты

Это рекомендации для последующей проверки, не гарантия безопасности. Проверены публичные страницы и содержание доступного SKILL.md; установок не было. Показатели skills.sh — наблюдение на дату аудита, могут меняться и не заменяют review. Для PostgreSQL/Playwright/security доступны данные о популярности; для геоскилла счётчик установки получить не удалось, уверенность ниже.

| Область | Кандидат и первичный источник | Свидетельства/ограничения | Рекомендация |
| --- | --- | --- | --- |
| PostgreSQL | [supabase-postgres-best-practices](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices) | Репозиторий Supabase; SKILL включает queries, pooling, schema, RLS. [skills.sh](https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices): около489.8K установок /3.1K stars. Общие PG-рекомендации применимы без выбора Supabase cloud | Наиболее подходящий кандидат перед SQL/миграциями; проверить весь пакет и pinned commit |
| Playwright | [openai/skills — playwright](https://github.com/openai/skills/tree/main/skills/.curated/playwright) | Официальный каталог OpenAI; [карточка](https://skills.sh/openai/skills/playwright): около9.7K установок /28.8K stars репозитория. Это CLI-first browser automation, **не замена** CI suite Playwright Test; wrapper ориентирован на shell. В карточке есть Snyk Warn: причину не исследовали | Полезен для ручного browser debugging; перед установкой review warning, Windows prerequisites и scripts |
| Безопасность | [security-best-practices](https://github.com/openai/skills/tree/main/skills/.curated/security-best-practices) | OpenAI; [карточка](https://skills.sh/openai/skills/security-best-practices): около12.8K установок, тот же репозиторий28.8K stars; framework-specific references, не универсальный пентест | Полезен для будущего TS/frontend/backend review; не требуется дублировать уже доступный security-review без причины |
| Геоданные/карта | [maplibre-tile-sources](https://github.com/maplibre/maplibre-agent-skills/blob/main/skills/maplibre-tile-sources/SKILL.md) | Community-maintained репозиторий в организации MapLibre, около154 stars на просмотренной странице. В frontmatter status=verified — **заявление сопровождающих**, не независимая сертификация. Карточка skills.sh не открылась; installs неизвестны | Хороший предметный кандидат для выбора GeoJSON/tiles; confidence ниже официальных массовых пакетов; сначала полный review |
| Геооперации, альтернатива | [mapbox-geospatial-operations](https://github.com/mapbox/mapbox-agent-skills/blob/main/skills/mapbox-geospatial-operations/SKILL.md) | Репозиторий Mapbox, разделение геометрии и routing; provider-specific guidance может вести к Mapbox API | Справочный кандидат, не основание выбрать платный Mapbox или подключить MCP/ключи; не рекомендован как обязательный пакет |
| Отладка | Локальный systematic-debugging | Файл доступен в пользовательских скиллах; новый сторонний пакет не нужен | Использовать при воспроизводимом дефекте; сейчас runtime-кода нет |

Прямо проверенного универсального PostGIS-скилла без vendor-специфики в этом поиске не установлено. Пространственные типы/метры/индексы сверяются с [официальным руководством PostGIS](https://postgis.net/docs/ST_DWithin.html), а не с обещаниями непроверенного пакета.

## Как рассматривать установку позже

1. Проверить владельца/лицензию, свежесть, конкретный commit, весь SKILL и вызываемые скрипты; installer тоже исполняет код.
2. Проверить prompts, внешние endpoints, чтение credentials, shell-команды и объём запрашиваемых разрешений; использовать имеющийся skill-scanner.
3. При необходимости предложить конкретный пакет/commit и изменения; установить только после отдельного согласования, особенно неизвестный community-пакет.
4. Зафиксировать изменённый lock и baseline; проверить diff. Не запускать массовый `skills update`.

Примеры **не исполненных** команд из проверенных карточек, только для ориентира после review:

```text
npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices
npx skills add https://github.com/openai/skills --skill playwright
npx skills add https://github.com/openai/skills --skill security-best-practices
```

Эти команды без pinned commit сами по себе не дают воспроизводимого доверенного обновления; перед выполнением выбрать фиксированный источник. Сетевой поиск произведён read-only через публичные страницы; `npx skills find/add/update` не запускался.

## Дополнение TRAVEL-011 — подключение и практическая доступность

Повторная проверка 2026-11-18 выполнена по отдельному запросу владельца. Предыдущие выводы/кандидаты выше сохранены как история; новые установки/обновления не выполнялись.

| Проверка | Фактический результат |
| --- | --- |
| Корневой AGENTS.md до настройки | Отсутствовал; родительские инструкции в проверенной цепочке до C:\ тоже не найдены |
| Вложенные AGENTS.md | Найдены в двух Vercel-скиллах; это compiled guides, не общие правила проекта |
| Локальные SKILL.md | Все пять читаются в UTF-8; YAML name соответствует имени папки и ключу lock; обязательные name/description присутствуют |
| Каталог текущей сессии | Все пять проектных скиллов представлены; доступны для чтения и выбора сейчас |
| Канонические пути | `.agents/skills/<name>/SKILL.md`; при одноимённых entries окружения выбирать проектную копию |
| Символические переходы | Reparse points в пяти пакетах не обнаружены |
| Поддерживающие файлы | frontend2, web-guidelines1, React75, composition13, ui-ux78; всего169 файлов пакетов + lock =170 |
| UI smoke | `python -B .agents/skills/ui-ux-pro-max/scripts/search.py 'keyboard focus modal' --domain ux -n 1`: exit0, domain ux, source ux-guidelines.csv,1 релевантный результат о видимом focus |
| Проверка исходников скиллов | SHA-256 по исходному baseline совпадают, пакеты и lock не правились |

Наличие в каталоге именно этой сессии подтверждено наблюдаемым контекстом. Для нового IDE/агента нужно проверять его каталог заново; автоматическое обнаружение во всех клиентах не тестировалось. SKILL.md — инструкции, не исполняемый тест, plugin installation или подключение к облаку.

### Обнаруженные ограничения и меры

| ID | Проблема / свидетельство | Почему важно / исправление процесса | Сложность / когда |
| --- | --- | --- | --- |
| WF-01 | Не было корневых правил; найденные AGENTS относятся к Vercel | Создан [корневой AGENTS.md](../AGENTS.md) с приоритетами и матрицей выбора, без изменения vendor-пакетов | Низкая; выполнено сейчас |
| WF-02 | ui-ux SKILL использует `${CLAUDE_PLUGIN_ROOT}/.claude/...`, а локальная копия в `.agents/skills` | Не копировать shell-specific примеры; фактический Windows/Python путь проверен smoke. `see README` не является гарантией наличия отдельного README в пакете | Низкая; обход закреплён сейчас |
| WF-03 | В React compiled AGENTS три broken local links: ./async-defer-await.md, ./async-cheap-condition-before-await.md, ./server-hoist-static-io.md | Все три файла существуют в rules/; читать оттуда. Не переписывать установленный пакет и lock ради косметического исправления ссылок | Низкая; обход сейчас |
| WF-04 | [server-after-nonblocking.md](../.agents/skills/vercel-react-best-practices/rules/server-after-nonblocking.md), строки46/48: значение sessionCookie передаётся logUserAction | Если повторить пример, возможна утечка credential в журнал. Правило проекта запрещает логировать cookies/tokens; использовать requestId. Это дефект справочного примера, а не найденная утечка приложения | Низкая; ограничение сейчас, применять при разработке |
| WF-05 | [react19-no-forwardref.md](../.agents/skills/vercel-composition-patterns/rules/react19-no-forwardref.md), строки12/30: useContext описан как заменяемый/неправильный | [Официальный React useContext](https://react.dev/reference/react/useContext) продолжает документировать этот Hook; [use(context)](https://react.dev/reference/react/use) — другой способ с особыми правилами. Не делать массовую миграцию по предпочтению скилла | Низкая; ограничение сейчас |
| WF-06 | В проекте нет специализированных PostgreSQL/PostGIS/Playwright/security скиллов | Не путать внешних кандидатов с установленными пакетами. Использовать подходящие пользовательские skills/официальные docs по задаче; не добавлять зависимости самостоятельно | Низкая; учтено |
| WF-07 | Старый stage0 checker разрешал новые файлы только внутри docs | Новый запрос требует корневых инструкций. Проверка адресно расширена ровно на AGENTS.md; другие внеплановые файлы всё ещё FAIL, отдельный gate сверяет точный diff | Низкая; выполнено сейчас |

Приоритет визуального frontend-design может не соответствовать текущему функциональному этапу; это не поломка подключения. Его использование отложено. UI-UX и web-guidelines нужны только для конкретных интерфейсных задач, доступность обязательна с первого UI. React/composition не заменяют общую backend-архитектуру и тестирование.

### Статический scanner и границы безопасности

Использован уже доступный skill-scanner из пользовательского каталога. uv не найден; PyYAML уже установлен, поэтому тот же bundled `scan_skill.py` запущен через `python -B` без скачивания зависимостей. Проверены пять пакетов. Машинная сводка: [skill_scan.json](audit/skill_scan.json).

Четыре пакета дали0 scanner findings. Для ui-ux-pro-max scanner выдал17 HIGH, **все одной категории Test File Auto-Discovery**: наличие `scripts/tests/test_*.py`. Это общий structural warning, не подтверждённая RCE/вредоносность. Полное чтение/исполнение каждого теста не проводилось; тесты скилла не запускались. Их нельзя включать в продуктовый discovery или считать тестами платформы. Скрытый каталог обычно исключается discovery-конфигурацией, поэтому предупреждение не доказывает фактический запуск из корня.

Scanner не выполняет глубокий анализ всех rules/data/рекурсивных fixtures и не заметил небезопасный logging-пример выше. Нулевой отчёт не равен доказанной безопасности. Полного security audit всего169-файлового содержимого не заявляем. Выполнена проверка подключения, структуры, инструкций, ссылок и ограниченный статический анализ; remote computedHash/commit не перепроверялись.

Один промежуточный вывод Python с Unicode-стрелкой завершился UnicodeEncodeError из-за cp1251 терминала. Повтор с UTF-8 stdout успешно прочитал текст; файлы не менялись. Это ограничение вывода, не поломка скилла. Использование `-B` не создало __pycache__ в пакетах.

### Принятая настройка рабочего процесса

Матрица применения и цикл задачи находятся в [WORKFLOW](WORKFLOW.md) и корневом AGENTS. В окружении дополнительно подтверждены читаемые SKILL.md: brainstorming, writing-plans, systematic-debugging, test-driven-development, verification-before-completion, security-review, secret-serialization, skill-scanner. Они остаются пользовательскими, не новыми установленными пакетами проекта. Код приложения, глобальные настройки и инфраструктура не менялись.
