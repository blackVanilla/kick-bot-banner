# Kick.com Auto-Banner Bot

Автоматический бот для модерации чата на Kick.com. Банит пользователей, если их никнейм содержит определенные ключевые слова.

## Возможности

- Мониторинг сообщений в чате в реальном времени
- Автоматический перманентный бан по ключевым словам в никнейме
- OAuth 2.1 авторизация с PKCE
- Настройка через конфигурационный файл

## Требования

- Node.js 18.x или выше
- Учетная запись на Kick.com
- Аккаунт бота должен быть модератором на целевом канале

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте приложение на Kick Developer Portal:
   - Перейдите на https://kick.com/settings/developer
   - Создайте новое приложение
   - Укажите Redirect URI: `http://localhost:3000/auth/kick/callback`
   - **ВАЖНО:** В настройках приложения включите следующие scopes:
     - `user:read`
     - `channel:read`
     - `chat:write`
     - `moderation:ban`
     - `moderation:chat_message:manage`
   - Скопируйте Client ID и Client Secret

3. Настройте `config.json`:
```json
{
  "channel": "channel_name",
  "channelId": 802879,
  "chatroomId": 777098,
  "words": ["spam", "bot", "scam"],
  "oauth": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "http://localhost:3000/auth/kick/callback",
    "scopes": [
      "user:read",
      "channel:read",
      "chat:write",
      "moderation:ban",
      "moderation:chat_message:manage"
    ]
  },
  "server": {
    "port": 3000
  }
}
```

### Как получить channelId и chatroomId

1. Откройте канал в браузере: `https://kick.com/your_channel`
2. Откройте DevTools (F12) → Console
3. Выполните:
```javascript
__NUXT__.state.$sio.channel.id          // channelId
__NUXT__.state.$sio.channel.chatroom.id // chatroomId
```
4. Скопируйте значения в `config.json`

## Настройка прав модератора

**КРИТИЧЕСКИ ВАЖНО:** Аккаунт, от имени которого работает бот, должен быть модератором канала.

1. Запустите бота и авторизуйтесь
2. Владелец канала должен выполнить команду в чате:
```
/mod username_бота
```

## Запуск

```bash
npm start
```

При первом запуске:
1. Откройте в браузере: `http://localhost:3000/auth`
2. Авторизуйтесь на Kick.com и одобрите **все** запрашиваемые разрешения
3. Токены будут сохранены в `tokens.json`
4. Бот начнет мониторить чат

## Примеры работы

```
============================================================
Kick.com Auto-Banner Bot
============================================================
Channel: murrito
Ban keywords: spam, bot, scam

[AUTH] OAuth сервер запущен на http://localhost:3000
[AUTH] Откройте браузер и перейдите по адресу: http://localhost:3000/auth

============================================================
Bot started and monitoring chat
============================================================

[BAN] spam_user123 | Keyword: "spam"
[BAN] bot_account | Keyword: "bot"
```

## Структура проекта

```
kick-sh-bannder/
├── src/
│   ├── index.js        # Основная логика бота
│   ├── auth.js         # OAuth 2.1 авторизация
│   ├── kickApi.js      # Kick API client
│   └── chatClient.js   # Pusher WebSocket client
├── config.json         # Конфигурация
├── tokens.json         # Сохраненные токены (создается автоматически)
├── package.json
└── README.md
```

## Безопасность

- **НЕ коммитьте** `config.json` и `tokens.json` с реальными данными
- Храните Client Secret в секрете
- `tokens.json`, `config.json` и `.env` добавлены в `.gitignore`

## Устранение неполадок

### Ошибка 401 Unauthorized при бане

**Причина:** Аккаунт бота не является модератором канала.

**Решение:** Владелец канала должен выполнить `/mod username_бота` в чате.

### Не все scopes получены после авторизации

**Причина:** Приложение в Kick Developer Portal не имеет разрешения на нужные scopes.

**Решение:**
1. Перейдите в https://kick.com/settings/developer
2. Откройте настройки вашего приложения
3. Убедитесь, что **все** необходимые scopes включены:
   - `user:read`
   - `channel:read`
   - `chat:write`
   - `moderation:ban`
   - `moderation:chat_message:manage`
4. Удалите `tokens.json` и авторизуйтесь заново

### Не подключается к чату

- Проверьте правильность `channelId` и `chatroomId` в конфиге
- Удалите `tokens.json` и авторизуйтесь заново

### OAuth авторизация не работает

- Убедитесь, что порт 3000 свободен
- **Redirect URI** в настройках приложения должен **точно** совпадать: `http://localhost:3000/auth/kick/callback`
- Проверьте правильность Client ID и Client Secret

## Разработка

Запуск в режиме разработки с автоматической перезагрузкой:

```bash
npm run dev
```

## Ограничения

- Работает только с одним каналом
- Перманентный бан не отменяется автоматически
- Требует прав модератора

## Лицензия

MIT

## Предупреждение

Используйте этот бот ответственно и в соответствии с правилами Kick.com. Автор не несет ответственности за последствия использования.
