# TRAVEL-025.2 — доверенный CA для Windows psql

2026-11-19. Checkpoint `4d4b5d2`, ветка `feature/neon-test-profile`, дерево/index перед задачей чистые. Цель — подготовить проверяемый trust bundle без подключения к Neon. План: официальные источники → HTTPS download публичных сертификатов/checksum → офлайн parse/validity/native OpenSSL load → уточнение инструкции → docs/secrets/diff. Зависимости: Python stdlib, имеющиеся portable psql/libpq17.12/OpenSSL. Критерии: достоверный источник, совпадающий опубликованный SHA256, пригодный PEM и точный direct host; никаких cloud sockets/SQL/credentials. Риски: изменение CA у провайдера, срок действия roots, подмена локального файла, небезопасный терминал. Статус: CA подготовлен и офлайн проверки пройдены; cloud handshake/SQL не выполнялись и сейчас запрещены.

## Источник и доверие

[Neon: Connect securely](https://neon.com/docs/connect/connect-securely) рекомендует verify-full и указывает ISRG Root X1 от Let's Encrypt. Для Windows-клиентов с явным CA path документ прямо рекомендует Mozilla CA bundle, публикуемый проектом curl. [Официальная страница curl CA Extract](https://curl.se/docs/caextract.html) указывает snapshot 2026-11-05,118 сертификатов, PEM и опубликованный SHA256. Поэтому использован этот конкретный snapshot, а не экспорт всех корпоративных/пользовательских roots из Windows и не сертификат, полученный от целевого endpoint.

- Bundle: [curl/Mozilla 2026-11-05](https://curl.se/ca/cacert-2026-11-05.pem).
- Контрольная сумма издателя: [SHA256 snapshot](https://curl.se/ca/cacert-2026-11-05.pem.sha256).
- Независимый CA-источник для сравнения DER: [официальный ISRG Root X1 PEM](https://letsencrypt.org/certs/isrgrootx1.pem), ссылка подтверждена Neon и [Let's Encrypt Chains of Trust](https://letsencrypt.org/certificates/).
- SHA256 **файла bundle**: `427c064216761a1e72a8b30f0d954d08cb6e4435a82091fb865afd20c8497285`.
- Размер: **200116 bytes**, **118 уникальных CA**.
- SHA256 **DER сертификата ISRG Root X1**, присутствующего в bundle: `96bcec06264976f37460779acf28c5a7cfe8a3c0aae11a8ffcee05c0bddf08c6`. Это другой объект хеширования, не fingerprint PEM-файла bundle.

Публичные файлы скачаны по HTTPS с проверкой сертификата/hostname стандартным Python TLS client, минимум TLS1.2, без разрешения redirect и без отключения проверки. Совпадение checksum проверено до сохранения. Checksum с того же сайта — проверка целостности, не независимая подпись издателя; подлинность источника опирается на HTTPS и документированную ссылку Neon. Не выполнялись запросы к Neon endpoint или certificate-discovery через него. CA bundle не является секретом. Сертификаты из него лицензированы MPL2.0, как указано на странице curl; их байты не публикуются в Git.

Файлы только в ignored `.local/neon-ca/`: `approved-ca.pem`, `published.sha256`, `isrgrootx1.pem`. Windows Certificate Store не изменён. В Git предназначены отчёт, публичный fingerprint, исправленная инструкция и офлайн verifier; не PEM, приватные ключи или конфигурация credentials. Полный Mozilla bundle содержит118 доверенных roots, а не только ISRG; ограничения Mozilla Root Program на уровне браузера не все переносятся в PEM (ограничение curl CA Extract). Это стандартный документированный вариант Neon для Windows.

## Реально выполненные локальные проверки

`python -B docs/audit/verify_neon_ca.py` — PASS:

1. Файл совпадает с закреплённым SHA256 и опубликованной checksum; нет PRIVATE KEY,118 уникальных DER сертификатов.
2. Bundle загружен в пустой Python SSLContext:118 X509/118 CA/0 CRL. Все118 находятся внутри notBefore/notAfter на момент проверки. Это проверка дат roots, не статуса отзыва.
3. ISRG Root X1 из официального Let's Encrypt PEM побайтно совпадает в DER с сертификатом в bundle.
4. Соседняя с psql библиотека libpq сообщает170012; **её соседняя `libssl-3-x64.dll`** успешно загружает тот же файл через `SSL_CTX_load_verify_locations`. Контекст освобождён. PQconnect/SSL_connect/сокеты не вызываются; проверена пригодность формата для установленного OpenSSL клиента, не соединение с сервером.
5. Изменённая в памяти копия bundle отклоняется по fingerprint. Исходный файл не меняется.

Дополнительно: `npm run check:docs` — PASS (170 исторических hashes,43 Markdown files); `npm run check:secrets` — PASS для index/working/untracked, значения скрыты; `git diff --check` — PASS. PowerShell блок разобран штатным Parser без исполнения: синтаксис, точный host, verify-full и отсутствие password=/hostaddr/-pooler/старого placeholder подтверждены. SHA256 `.env.local` совпадает с прежней контрольной точкой; diff относительно4d4b5d2 для src/db/scripts/package.json/package-lock отсутствует. Полные TypeScript/lint/unit/integration/build не повторялись: приложение/SQL/guards/dependencies не менялись, добавлен только офлайн Python verifier и документация.

Verifier фиксирует fingerprint snapshot и не скачивает файлы/не подключается к БД. По истечении срока CA он откажет, обновление требует нового анализа. SHA256 не защищает от злоумышленника, способного одновременно изменить скрипт, инструкцию и bundle. Ни этот офлайн PASS, ни загрузка CA не подтверждают текущую серверную цепочку, SAN, endpoint ownership, сеть, SCRAM или SQL identity. В libpq verify-full проверяет цепочку/hostname; автоматическую полную OCSP/CRL проверку не заявляем: CRL требует отдельной конфигурации согласно [libpq17 SSL](https://www.postgresql.org/docs/17/libpq-ssl.html).

## Инструкция владельцу — выполнить только после следующего разрешения

1. Сейчас ничего к облаку не подключать. Перед будущим запуском сверить свежие management metadata через Нурман: org norman, project `broad-wind-62771105`, branch `br-mute-river-bavdwjwl`, endpoint `ep-curly-moon-ba3f3csy`, база `travel_test_foundation`, роль `terreno_bootstrap_owner`. Пользовательские receipt GUCs в SQL не заменяют эту проверку.
2. Открыть собственный Windows Terminal/PowerShell без транскрипции/записи экрана и без терминала Codex. Запустить `powershell.exe -NoProfile`, перейти командой `Set-Location -LiteralPath 'C:\Users\EsenovE\Desktop\Ds'`. Не вводить и не вставлять пароль в PowerShell-команду.
3. Выполнить только офлайн `python -B docs/audit/verify_neon_ca.py`; при FAIL остановиться. В `.local/neon-ca/approved-ca.pem` должен быть указанный snapshot. Файлы `.local` в Git отсутствуют, поэтому на другом компьютере требуется отдельная подготовка CA, а не автоматический fallback.
4. Использовать уже имеющийся пароль именно `terreno_bootstrap_owner` из согласованного защищённого доступа владельца. Не сбрасывать пароль и не создавать роль ради этой проверки. Если такого доступа нет — остановиться; не присылать пароль/URI в чат и не запрашивать их MCP-инструментом. Агент пароль не получает.
5. После отдельного разрешения скопировать **только публичный PowerShell блок** из [NEON_DIRECT_CHANNEL](NEON_DIRECT_CHANNEL.md). Он проверит SHA256 до запуска psql и использует точный `host=ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech`, `sslmode=verify-full`, явный CA path и `channel_binding=require`. Нет -pooler, wildcard-host, hostaddr или выбора произвольного endpoint. Проверка имени серверного сертификата выполняется libpq по этому полному hostname.
6. Когда psql покажет `Password for user terreno_bootstrap_owner:`, вручную набрать пароль и нажать Enter. Символы не отображаются — это штатно. Не вводить пароль раньше prompt и не помещать его в URL, аргументы, environment/PGPASSWORD, pgpass, `.env`, скрипт, перенаправление stdin или history. `-W` получает пароль прямо в памяти psql; `-X` исключает psqlrc, `-f` исключает интерактивный SQL history, passfile=NUL запрещает pgpass.
7. При неверном CA/hostname/пароле/channel binding/metadata или ошибке доступа — остановка. Не менять verify-full на require и не запускать10/20, migrations или seed. При успехе `\conninfo` покажет host/TLS без пароля,00 проверит session identity и выполнит только разрешённый READ ONLY inventory. Передавать агенту лишь безопасный итог, не пароль/URI или необработанный dump терминала.

Пароль не станет частью команд/history/проектных файлов/stdout этой инструкции, однако скрытый prompt не защищает от keylogger/компрометированного терминала. Такой терминал не использовать. Новая процедура не меняет `.env.local`, guards, migrations или pendingTargets; не предполагает Railway или push.

## Следующие разрешения и оставшиеся блокеры

Блокер доверенного CA закрыт локально. Остаются согласованный доступ владельца к существующему паролю и защищённый ручной ввод, свежая проверка tuple перед будущим соединением и **отдельное разрешение первого direct подключения/read-only00**. Фактические TLS handshake/SAN/цепочка endpoint и SQL identity пока неизвестны. После read-only результата bootstrap/DDL/roles/extensions/ownership, migrations/seed и активация registry требуют отдельного разрешения; сейчас они запрещены. Cloud resources и GitHub не изменялись.
