# Backup/restore фундамента

TRAVEL-008, 2026-11-18. Реально выполнено на новом локальном PostgreSQL17.12/PostGIS3.7.0.

```powershell
npm run db:restore-check
```

Источник — TEST_DATABASE_URL, цель — RESTORE_DATABASE_URL. Обе проходят guard; цель обязана иметь имя travel_test_restore*, отличаться от источника и не содержать пользовательских таблиц. Скрипт не выполняет DROP/CLEAN/TRUNCATE и не перезаписывает непустую БД. Учётная запись — отдельный migrator, не runtime.

Процедура: создать известный synthetic marker ZZ в тестовой countries → pg_dump custom → pg_restore в отдельную заранее созданную пустую БД → сверить marker, migration rows, checksums, constraints и PostGIS version → убрать только созданный marker из источника. Пользовательские данные не используются.

Проверенный результат: marker1, migrations2, checksums2, constraints65; PostGIS3.7; dump сохранён в ignored `.local/backups/foundation-1794984834938.dump`. Все restore SQL выполняются одной транзакцией; неуспех не оставляет частично восстановленную схему. Ранние попытки выявили права на extension-owned spatial_ref_sys; причина исправлена до успешного результата.

PostGIS/pg_trgm provisioned admin в целевой новой БД заранее. В dump исключены данные штатной public.spatial_ref_sys: пользовательские SRID сейчас не поддерживаются, WGS84 уже есть в одинаковой версии расширения. Таблицы платформы и их данные не исключаются. Если появятся custom SRID, расширить процедуру и тесты **до** их использования. Owner/ACL не переносятся из дампа: runtime grants после реального disaster recovery нужно восстановить provisioning-процедурой и проверить отдельно; текущий тест доказывает восстановление схемы/данных, не production DR.

После первого успеха target содержит восстановленный snapshot. Повторный запуск безопасно откажется; для нового опыта нужна новая пустая выделенная restore БД и соответствующий URL, не очистка существующей. В текущем экземпляре остаются только project-owned dev/test/restore базы. Production RPO/RTO, шифрование и внешнее хранение backup ещё не настроены; облако не подключалось.
