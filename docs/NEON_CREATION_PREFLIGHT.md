# TRAVEL-021 — публикация TRAVEL-020 и проверка перед созданием terreno-test

Дата: 2026-11-19. Этот шаг разрешает обычный push только `feature/neon-test-profile` и чтение Neon metadata. Создание ресурсов, получение credentials/connection strings, SQL/migrations, изменение `.env.local`, Railway и платные действия не выполнялись. Код приложения, пустой target registry и зависимости не изменены.

## Карточка задачи

- **Цель:** сохранить проверенный TRAVEL-020 на GitHub и подготовить точную заявку на новый изолированный Free-проект.
- **План:** проверить Git/index/worktree/history → обычный push одной ветки и remote SHA → metadata выбранной организации/регионов → официальные Free/API условия → записать параметры и остановиться до создания.
- **Зависимости:** завершённый TRAVEL-020, Git origin terreno, действующая Git-авторизация и Neon binding Нурман.
- **Критерии приёмки:** секреты/запрещённые файлы не найдены; remote SHA равен local SHA; прежние ветки не изменены; org Free и Frankfurt/PG17 подтверждены; никакого cloud write.
- **Проверки:** index/worktree secret gate; расширенный scan достижимой истории и путей всех коммитов; git fsck; remote refs до/после; docs gate; read-only list_organizations/list_projects/count_projects/list_regions и официальные docs. Продуктовые unit/integration/E2E повторно не запускались: приложение не менялось; результаты TRAVEL-020 сохранены в его отчёте.
- **Риски:** изменение тарифов/доступности между preflight и созданием; account-wide storage и anti-abuse ограничения не полностью раскрыты MCP; новый проект автоматически создаёт базовую ветку/БД/роль/compute, а не только контейнер. При billing/upgrade prompt или API-отказе остановиться, не менять тариф и не подменять регион/PG/account.
- **Статус:** публикация исходного TRAVEL-020 подтверждена; параметры подготовлены, облачный проект НЕ создан. Документ фиксируется обычным последующим коммитом той же ветки; финальный SHA сверяется после его push и сообщается владельцу.

## Git: проверенный состав и история

Начальная вершина `73e08811422738b8b727a74dca971c78ba905d19` опубликована в [feature/neon-test-profile](https://github.com/normanbrowndp-maker/terreno/tree/feature/neon-test-profile); `git ls-remote` подтвердил точное совпадение SHA. Origin — `https://github.com/normanbrowndp-maker/terreno.git`; force, merge, rebase, tags и PR не использовались. До работы дерево/index чистые.

До первого push проверены все14 достижимых коммитов,476 уникальных blob,18508818 байт blob content и commit messages. Запрещённых исторических путей и реальных credential patterns не обнаружено. Два первичных token-pattern совпадения оказались частями URL Microsoft Learn (`task-based-...`), ещё одно — намеренно некорректным URL-escape в негативном unit-тесте. После проверки контекста уточнена граница token pattern и точное исключение тестового blob/строки; повторный scan PASS. Штатный `npm run check:secrets` также PASS. Это pattern-based проверка, не гарантия обнаружения любого неизвестного формата секрета.

Проверены исходники/docs/tests/6 migrations/CI/AGENTS/project skills; исключены `.env.local`, зависимости, `.next`, `.local`, `.superpowers`, backups/dumps/user data. `.env.example` содержит демонстрационные значения. `git fsck --full` exit0: есть обычные dangling blobs, не достижимые из публикуемой ветки; они не входят в push, garbage collection не выполнялась.

Прежние remote refs до и после первого push неизменны:

| Ветка | SHA |
| --- | --- |
| feature/terreno-italia | eb28132d7a99d78d2fbd9b7b64e1da9cdbda15e9 |
| foundation/stage-1 | 9e8c8fa593d3943853cdcd73d0a75ffc145aaa8a |

Remote `main` отсутствовал; он не создавался. Последующий отчёт добавляет только документацию/правила текущего объёма, проходит повторный scan истории/index и тот же обычный push одной ветки. История TRAVEL-020 сохраняется без изменения SHA.

## Выбранный Neon-контекст

Владелец выбрал **Нурман → norman**, org ID `org-lucky-base-56347525`. Свежий `list_organizations` подтвердил `plan=free`, `list_projects` и `count_projects` — один проект: `gloomi` (`misty-resonance-03471928`). Проекта с именем `terreno-test` в этом org нет. `sidequest-dev` находится в другом, ранее проверенном Primary-контексте; этот binding в TRAVEL-021 не вызывался. Ни один существующий проект не выбирается target для TERRENO.

`list_regions` для Нурман содержит **AWS Europe Central 1 (Frankfurt)**, `aws-eu-central-1`. PostgreSQL17 входит в поддерживаемые версии [Create project API](https://neon.com/docs/reference/api/projects/create-project.md). Фактическая версия нового сервера/доступность provisioning проверяются только после отдельного разрешения создания; dry-run/guaranteed-capacity API у доступного MCP нет.

## Free и оплата

Публичный [pricing](https://neon.com/pricing) подтверждает $0 и отсутствие требования карты. [Актуальные планы](https://neon.com/docs/introduction/plans) указывают100 проектов,10 веток/проект,100 CU-hours/проект/месяц,1 GB PostgreSQL storage/проект и20 GB суммарно по аккаунту,5 GB public transfer/проект/месяц. Scale-to-zero обязателен после5 минут простоя. Данные старого аудита сохраняются исторически; более ранние публикации с0.5 GB не являются текущим лимитом.

[Free FAQ](https://neon.com/faqs/free-plan-limits-and-quotas) подтверждает: CU-hours/egress при исчерпании останавливают compute до нового периода или добровольного upgrade; storage ограничивает растущие записи; Free overages не оплачиваются. Автоматический переход на платный тариф не запрашивается и не разрешён.1 видимый проект не исчерпывает опубликованный project limit; полный account-wide storage, банковские реквизиты и внутренние антиабузные ограничения MCP не раскрывает, поэтому preflight не равен гарантированному принятию будущего POST.

## Подготовленные параметры — НЕ выполненный запрос

Контекст вызова MCP — только выбранное подключение **Нурман**, org явно задан. В методе `create_project` нет параметра `plan`: Free определяется организацией. Перед будущим вызовом повторно проверить `plan=free`, отсутствие существующего `terreno-test` и актуальность параметров. Никаких повторных create при неоднозначном timeout: сначала перечитать проекты.

```json
{
  "name": "terreno-test",
  "org_id": "org-lucky-base-56347525",
  "region_id": "aws-eu-central-1",
  "pg_version": 17,
  "branch": {
    "name": "test",
    "database_name": "travel_test_foundation",
    "role_name": "terreno_bootstrap_owner"
  },
  "default_endpoint_settings": {
    "autoscaling_limit_min_cu": 0.25,
    "autoscaling_limit_max_cu": 0.25,
    "suspend_timeout_seconds": 0
  },
  "history_retention_seconds": 21600
}
```

Это project configuration для MCP, не REST envelope (у REST параметры вложены в `project`). Служебный `link_id` выбирается по реальной привязке Нурман, а не по Primary. Новые project/branch/endpoint IDs не назначены. Имена ветки/БД/bootstrap-role — предлагаемые параметры нового ресурса, не утверждение об уже существующих ролях. Мин/макс0.25 CU ограничивают размер; это не круглосуточная бесплатная работа:100 CU-hours соответствуют примерно400 активным часам такого compute в месяц. `suspend_timeout_seconds=0` означает default плана, то есть5 минут на Free, а не отключение сна. [Семантика параметров](https://neon.com/docs/reference/api/projects/create-project.md).

Создание нового project — новая root branch, не `create_branch` чужого проекта, clone/import/restore/transfer. Оно автоматически создаст одну обычную базовую БД/роль/read-write compute в новом проекте; данные gloomi/sidequest не копируются. [Default resources](https://neon.com/docs/manage/projects). Runtime/migrator роли не создаются этим параметром `role_name`; bootstrap-owner не предназначен для runtime. PostGIS, ACL/identity marker и старые6 миграций не устанавливаются автоматически.

Не задаются Realtime/Auth/Functions/Storage/AI Gateway, IP Allow/Private Networking/HIPAA и другие дополнительные сервисы. Secret-storage настройки не меняются. Предпочтителен Neon MCP `create_project`, чей опубликованный output contract возвращает только project metadata без connection strings; сырой REST create-response может содержать credentials и не должен выводиться. Сейчас ни один create-инструмент не вызывался.

## Где остановиться и что разрешать отдельно

1. Следующее отдельное разрешение: **создать один новый Free `terreno-test` в norman с указанными параметрами**. Это включает автоматические default branch/DB/bootstrap role/compute; не включает ручной bootstrap, получение строк подключения или миграции. При любом требовании оплаты — остановка.
2. После создания разрешённое чтение реальных metadata и отдельный review/enrollment точного target в пустой сейчас registry. Идентификаторы не выдумывать и не брать от gloomi/sidequest.
3. Отдельно согласовать bootstrap/PostGIS/least-privilege роли, безопасное получение/размещение credentials, TLS/identity smoke и cloud migrations/seed. До этого runtime profile продолжает отказывать.
4. Railway, GitHub integration Neon и любые другие провайдеры — отдельные задачи/разрешения. Этот push не создаёт Neon–GitHub связь. Состояние такой связи по-прежнему неизвестно через доступный MCP.

Применены Neon/neon-postgres и verification-before-completion; дизайн/React скиллы, установки и cloud write инструменты не использовались.
