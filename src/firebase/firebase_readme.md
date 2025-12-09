# Firebase Configuration Setup

## 📋 Требования

Для работы приложения необходим файл конфигурации Firebase Admin SDK.

## 🔧 Настройка

### 1. Получение файла конфигурации

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в **Project Settings** (⚙️ иконка) → **Service accounts**
4. Нажмите **Generate new private key**
5. Подтвердите действие и скачайте JSON файл

## 🚀 Переменные окружения

Для продакшена рекомендуется использовать переменные окружения вместо файла:

### Добавьте в `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

## ✅ Проверка

После добавления файла конфигурации запустите приложение:

```bash
npm run start:dev
```

Если всё настроено правильно, вы увидите в консоли:
```
🚀 Application is running on: http://localhost:3000
```

## 🆘 Troubleshooting

### Ошибка: "Service account object must contain a string 'project_id' property", либо любая другая ошибка

**Решение:** Убедитесь, что:
- Что вы добавили переменные окружения
- А также что переменные окружения содержат корректные данные

## 📚 Дополнительная информация

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Service Account Guide](https://firebase.google.com/docs/admin/setup#initialize-sdk)
