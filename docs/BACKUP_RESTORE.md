# Backup/restore фундамента

TRAVEL-008, 2026-11-18. Реально выполнено на новом локальном PostgreSQL17.12/PostGIS3.7.0.

```powershell
npm run db:restore-check
```

Источник — TEST_DATABASE_URL, цель — RESTORE_DATABASE_URL. Раздельные purpose guards + project/cluster markers проверяются readonly до записи; restore имеет travel_test_restore* и purpose=restore, источник — только travel_test_foundation/purpose=test. Цель должна быть пустой кроме provisioned control/extension tables. Все наследуемые PG* удаляются из env дочерних libpq tools; адрес/порт/имя/пользователь передаются явно, пароль не в argv. DROP/CLEAN/TRUNCATE и перезапись непустой цели запрещены.

Процедура: создать известный synthetic marker ZZ в тестовой countries → pg_dump custom → pg_restore в отдельную заранее созданную пустую БД → сверить marker, migration rows, checksums, constraints и PostGIS version → убрать только созданный marker из источника. Пользовательские данные не используются.

Первый проверенный snapshot: marker1/migrations2/checksums2/constraints65, сохранён в первой restore DB. После review исправлений создана **новая** travel_test_restore_review без перезаписи первой; результат marker1/migrations4/checksums4/constraints68/PostGIS3.7, dump `.local/backups/foundation-1794986658764.dump`. Restore выполняется одной транзакцией. Ранние ошибки ACL spatial_ref_sys исправлены; неуспешные транзакции не оставили частичной схемы.

PostGIS/pg_trgm и marker provisioned admin заранее. Из dump исключены штатные данные spatial_ref_sys (WGS84 установлен, custom SRID пока нет) и control-plane travel_database_identity (цель сохраняет собственный purpose/принадлежность). Каталожные данные не исключаются. При custom SRID расширить процедуру до их использования. Owner/ACL не переносятся: runtime grants после реального DR нужно восстановить и проверить отдельно; текущий тест доказывает схему/данные, не production DR.

После первого успеха target содержит восстановленный snapshot. Повторный запуск безопасно откажется; для нового опыта нужна новая пустая выделенная restore БД и соответствующий URL, не очистка существующей. В текущем экземпляре остаются только project-owned dev/test/restore базы. Production RPO/RTO, шифрование и внешнее хранение backup ещё не настроены; облако не подключалось.
