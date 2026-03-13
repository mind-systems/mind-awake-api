# Google Authentication

Вход через Google Sign-In использует **server authorization code flow**: мобильный клиент получает от Google `serverAuthCode` и передаёт его бэкенду — Google токены обрабатываются исключительно на сервере.

## Как устроен вход

Клиент отправляет `POST /auth/google` с одним полем — `{ serverAuthCode }`. Сервер через `google-auth-library` обменивает код на токены Google (`OAuth2Client.getToken`), затем верифицирует `id_token` (подпись, `aud`, `iss`, `exp`) и извлекает профиль: `googleId`, `email`, `name`. Google-токены после этого отбрасываются.

Дальше — тот же путь, что при email-входе: поиск пользователя по `email`, автоматическая регистрация если нового нет (имя берётся из Google-профиля), генерация app JWT. Ответ аналогичен email-флоу: токен в заголовке `Authorization: Bearer <token>` и `UserResponseDto` в теле.

Если пользователь ранее зарегистрировался через email OTP с тем же адресом — он войдёт в тот же аккаунт. Идентификация идёт по `email`, не по `googleId`.

## Конфигурация

| Переменная | Описание |
|------------|----------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID из Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret |

Обе переменные обязательны — при старте приложения `ConfigService.getOrThrow` бросит ошибку, если они не заданы.

## Эндпоинт

```
POST /auth/google
Body: { "serverAuthCode": "..." }

200 OK
Authorization: Bearer <jwt>
Body: UserResponseDto

401 Unauthorized — невалидный или просроченный serverAuthCode
```

## Реализация

| Файл | Роль |
|------|------|
| `src/users/service/google-token.service.ts` | Обмен кода и верификация `id_token` |
| `src/users/interfaces/google-profile.interface.ts` | Тип `{ googleId, email, name }` |
| `src/users/dto/google-auth.dto.ts` | DTO запроса |
| `src/users/service/auth.service.ts` | Метод `signInWithGoogle` |
| `src/users/auth.controller.ts` | `POST /auth/google` |
