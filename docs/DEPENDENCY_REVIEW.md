# Состояние зависимостей

TRAVEL-005/008, проверка 2026-11-18. Версии exact, integrity в package-lock.json. `npm audit fix --force` не запускался; предупреждения не выдаются за отсутствие проблем.

## Реальные результаты

- Первый install:19 findings (16 high/3 moderate), включая glob/minimatch в инструменте миграций.
- После адресного override node-pg-migrate → glob14.0.6: полный audit **16 high**, связанные с одним upstream [GHSA-fc5q-39xc-vjpf / picomatch](https://github.com/advisories/GHSA-fc5q-39xc-vjpf). Публичная карточка на дату проверки указывает affected≤4.0.7, patched versions=None; npm latest4.0.7. Даунгрейды, предлагаемые npm force-fix, не принимаются автоматически.
- `npm audit --omit=dev`: **0 vulnerabilities**. Это проверка установленного production dependency graph, не сертификат безопасности приложения.
- ESLint10 прошёл lint, но npm ls выявил неподдерживаемые peers трёх React-плагинов. Выбран9.39.5, совместимый с их объявленными диапазонами. Ветка9 помечена upstream EOL: это **известный долг toolchain**, не скрытый warning. ESLint правила сохранены, legacy-peer-deps/force не использовались. После изменения требуется frozen npm ci и npm ls.

## Достижимость и решение

Picomatch находится в dev toolchain (Vitest/Vite/ESLint), использует контролируемые проектом glob patterns. Текущие публичные endpoints не принимают glob/regex и не импортируют эти инструменты. Подтверждённый сетевой exploit приложения не найден; риск сохраняется для обработки недоверенных шаблонов/проектов инструментами разработки. Считать16 зависимых findings16 независимыми runtime-уязвимостями неверно, но скрывать full audit тоже нельзя.

До исправления upstream: не принимать пользовательские glob в API/CI commands; не запускать dev server публично; не переносить dev toolchain в production runtime. В будущем deployment image должен содержать production install; отдельная build-стадия нужна до интеграции Railway.

CI и `npm run check:dependencies` сохраняют full audit JSON и его ненулевой exit в логах/artifacts. Блокируются **все** новые advisory, production-находки и истёкшее исключение. Временно допускается только GHSA-fc5q-39xc-vjpf и её зависимые findings, если каждый затронутый node отмечен dev=true в lock и дата не позже2026-12-18. Классификатор покрыт RED→GREEN unit tests; общего continue-on-error/force нет. Full audit сейчас не объявлен чистым. До этапа2 пересмотреть upstream picomatch и совместимость ESLint10-плагинов; повторная дата контроля не позже2026-12-18.

Автоматический npm11 отказался выполнять непредодобренный postinstall esbuild. Нативный optional binary поставлен пакетом, build/Vitest/tsx проверяются фактическим запуском. Массовое разрешение lifecycle scripts не настраивалось.
