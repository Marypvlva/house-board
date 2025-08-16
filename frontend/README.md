House Board — 5 домов, у каждого своя доска объявлений

Простой сайт «доска объявлений по дому»: 5 домов, у каждого свой администратор и отдельная лента.
Стек: FastAPI + SQLite + JWT (backend) и React + Vite (frontend).

Возможности

Публичные доски: /h/dom1 … /h/dom5

5 админов, у каждого — свой дом и права публиковать только в «свою» доску

Авторизация по JWT (в браузере токен хранится в LocalStorage)

Создание, редактирование, удаление объявлений, закрепление «вверх»

Готовая OpenAPI-документация по адресу /docs

Быстрый старт (TL;DR)
1) Backend
cd backend
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt  # или см. список пакетов ниже
uvicorn app:app --reload

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload


Проверка: http://localhost:8000/health → {"status":"ok"}

2) Frontend
cd frontend
npm i
echo VITE_API_URL=http://localhost:8000 > .env
npm run dev


Открыть: http://localhost:5173 → перейти на /login
Логин: admin1@example.com … admin5@example.com
Пароль: admin12345

Требования

Python 3.10+ (Windows: при установке поставить галочку Add Python to PATH)

Node.js (LTS) и npm

Редактор: рекомендуем VS Code (но можно любой)

Структура проекта
house-board/
  backend/
    app.py
    app.db                # появится после первого запуска
    requirements.txt      # см. ниже
    .venv/                # виртуальное окружение (локально)
  frontend/
    src/
      api.js
      App.jsx
      App.css
      main.jsx
      pages/
        Login.jsx
        Board.jsx
        Admin.jsx
    index.html
    package.json
    .env                  # VITE_API_URL=http://localhost:8000
  README.md

Backend (FastAPI)
Установка пакетов

Если файла requirements.txt нет, можно установить по списку:

pip install fastapi "uvicorn[standard]" SQLAlchemy passlib[bcrypt] python-jose[cryptography] pydantic python-multipart bcrypt==3.2.2 passlib==1.7.4


Почему фиксируем версии bcrypt и passlib: у некоторых связок бывает ошибка
AttributeError: module 'bcrypt' has no attribute '__about__'.
Пара bcrypt==3.2.2 + passlib==1.7.4 — надёжная.

Пример backend/requirements.txt:

fastapi
uvicorn[standard]
SQLAlchemy
passlib[bcrypt]
python-jose[cryptography]
pydantic
python-multipart
bcrypt==3.2.2
passlib==1.7.4

Запуск
uvicorn app:app --reload


API: http://localhost:8000

Healthcheck: GET /health

Документация: http://localhost:8000/docs

Сидирование данных

При старте автоматически создаются:

Дома: dom1 … dom5 (названия: «Дом 1» … «Дом 5»)

Админы:

admin1@example.com → dom1

admin2@example.com → dom2

admin3@example.com → dom3

admin4@example.com → dom4

admin5@example.com → dom5

Пароль у всех: admin12345

Основные эндпоинты

POST /auth/login — вход (формовые поля username, password), ответ {access_token, token_type}

GET /me — информация о текущем пользователе (нужен Bearer-токен)

GET /houses — список домов

GET /houses/{slug}/announcements — список объявлений дома

POST /houses/{slug}/announcements — создать объявление (только админ соответствующего дома)

PATCH /announcements/{ann_id} — обновить объявление (только админ своего дома)

DELETE /announcements/{ann_id} — удалить объявление (только админ своего дома)

Frontend (React + Vite)
Конфигурация

Файл frontend/.env:

VITE_API_URL=http://localhost:8000

Скрипты package.json

npm run dev — дев-сервер (обычно на http://localhost:5173)

npm run build — сборка на прод в dist/

npm run preview — локальный просмотр сборки

Страницы

/login — вход администратора

/admin — админка текущего дома (после логина)

/h/:slug — публичная доска дома (например, /h/dom1)

Как пользоваться

Запусти backend (uvicorn app:app --reload).

Запусти frontend (npm run dev) и открой /login.

Авторизуйся admin1@example.com / admin12345.

На странице Админка создай объявление (можно «прикрепить»).

Открой /h/dom1 — объявление видно публично.

Для других домов войди admin2…admin5@example.com и используй /h/dom2…dom5.

Полезные команды (Windows PowerShell / macOS bash)
Создание и активация venv
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate

Если PowerShell запрещает скрипты

Открой PowerShell от админа и выполни:

Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

Типичные проблемы (и решения)

AttributeError: module 'bcrypt' has no attribute '__about__'
Решение:

pip uninstall -y bcrypt
pip install bcrypt==3.2.2 passlib==1.7.4


python / uvicorn не находится

Убедись, что активирован venv (в начале строки терминала есть (.venv)).

Проверь установку Python и PATH (Windows: переустановка с галочкой Add Python to PATH).

npm run dev ругается на react-router-dom
Установи зависимость:

cd frontend
npm i react-router-dom


Порт занят

Backend: попробуй uvicorn app:app --reload --port 8001 и поменяй VITE_API_URL=http://localhost:8001.

Frontend: Vite предложит другой порт — согласись.

CORS ошибка в браузере
В app.py уже включён CORSMiddleware(allow_origins=["*"]). Перезапусти backend.

Кастомизация/доработки

Добавить дома / админов
Измени сидирование в @app.on_event("startup") или создай endpoints для CRUD по домам/пользователям.

Роли пользователей
Добавь роль user и эндпоинт регистрации; фильтруй доступ к публикации.

Файлы/картинки в объявлениях
Добавь POST /upload с UploadFile, сохраняй в /static/uploads и прикладывай ссылку к объявлению.

Поиск/фильтры/пагинация
В GET /houses/{slug}/announcements добавь query-параметры q, page, limit, pinned.

Продакшен

DB: PostgreSQL

Секреты: SECRET_KEY и DATABASE_URL — в переменные окружения

CORS: ограничить доменами фронта

Сборка фронта: npm run build, отдавать dist/ за nginx / любой статикой, backend разворачивать отдельно.