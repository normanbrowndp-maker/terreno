# Проверка настройки рабочего процесса

Задача: TRAVEL-011, 2026-11-18. **Настройка проверена; код приложения не менялся.** Подробности scope — в [WORKFLOW](../WORKFLOW.md).

## Выполненные проверки

| Проверка / команда | Фактический результат |
| --- | --- |
| Исходный `python docs/audit/verify_stage0.py` до правок | exit0,11 PASS/0 FAIL,15 Markdown-файлов |
| Копия всего проекта до правок |188 файлов, все SHA-256 копий совпали |
| `python -B docs/audit/verify_workflow.py` | exit0,9 PASS/0 FAIL; результат — [workflow_validation.json](workflow_validation.json) |
| `python -B docs/audit/verify_stage0.py --checkpoint 'C:\Users\EsenovE\AppData\Local\Temp\travel-workflow-20261118-120923'` | exit0,12 PASS/0 FAIL,18 Markdown-файлов включая новый корневой AGENTS.md |
| Изменения существовавших файлов | Только docs/README.md, docs/SKILLS_AUDIT.md, docs/CHANGELOG.md, docs/audit/verify_stage0.py; точный список проверен manifest |
| Защищённые файлы |184/184 хеша совпадают:170 исходных файлов пакетов/lock и14 остальных файлов предыдущего этапа |
| Negative scope probe | Создана временная `.travel-workflow-scope-probe.txt`; workflow gate получил ожидаемый exit1, exact_new_scope и вложенный stage0 gate отклонили файл; метка удалена в finally, повторный обычный gate успешен |
| Структура5 скиллов | Все SKILL.md читаются; name/description на месте, имена совпадают с папками/lock; reparse points не найдены |
| Поддерживающий код | ui-ux search smoke exit0, domain ux,1 релевантный результат; __pycache__ в пакетах не появился |
| Scanner |5 запусков exit0;4 пакета0 findings, ui-ux17 предупреждений о test discovery; [сводка](skill_scan.json) |

Негативная проверка подтверждает, что расширение stage0 для ровно AGENTS.md не отключило запрет других внеплановых файлов. Исторические audit/VALIDATION.md, validation.json, baseline.json и все продуктовые требования/контракты сохранены побайтно.

## Что настроено

Новый корневой AGENTS.md задаёт приоритеты, выбор минимального подходящего набора скиллов, чтение docs до правок, TRAVEL-задачи, checkpoints и проверки. Новые скиллы не установлены; текущие пакеты не переписаны. Полноценный дизайн отложен; конкретные accessibility/UX проблемы остаются частью функционального качества.

## Ограничения

- Доступность скиллов подтверждена в текущей сессии и файловой системе, не во всех возможных IDE/клиентах.
- Не проверен алгоритм computedHash установщика/соответствие remote commit; исходные SHA-256 подтверждают сохранность локальных копий.
- Выполнен ограниченный scanner, не полный security audit169 файлов.17 test-discovery flags не являются подтверждённой вредоносностью; сами tests не запускались.
- Два содержательных дефекта примеров и три broken links разобраны в SKILLS_AUDIT; vendor-пакеты оставлены неизменными, обходы/ограничения закреплены в корневых инструкциях.
- Продуктовые build/unit/integration/E2E неприменимы: кода/манифеста приложения всё ещё нет. БД/production/cloud/paid API/global settings не менялись.
- verify_workflow.py фиксирует scope **этой задачи**. После будущих разрешённых изменений понадобится собственный checkpoint/отчёт задачи; этот snapshot gate не следует выдавать за универсальный тест приложения или отключать вместо его продуктовых проверок.
