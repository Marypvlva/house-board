# House Board — доска объявлений для 5 домов

Лёгкое приложение: **FastAPI** (backend) + **React (Vite)** (frontend).
Каждый дом имеет свою «скрытую» ссылку на доску объявлений.
Админ может войти **только** со страницы своего дома и публиковать объявления.
<img width="1769" height="870" alt="image" src="https://github.com/user-attachments/assets/833ade9b-a8b1-4464-94b1-9c3d0ef95b1e" />
<img width="1649" height="859" alt="image" src="https://github.com/user-attachments/assets/931a110d-2bc2-422e-8ad6-63c279f53092" />


---

## Содержание

* [Функционал](#функционал)
* [Быстрый старт](#быстрый-старт)
* [Демо-аккаунты](#демо-аккаунты)
* [Ссылки домов](#ссылки-домов)
* [Структура проекта](#структура-проекта)
* [Скрипты запуска](#скрипты-запуска)
* [Переменные окружения](#переменные-окружения)
* [API (шпаргалка)](#api-шпаргалка)
* [Дизайн](#дизайн)
* [Траблшутинг](#траблшутинг)
* [Как поменять количество домов](#как-поменять-количество-домов)

---

## Функционал

* 5 домов, для каждого — **своя доска** объявлений.
* «Скрытые» публичные ссылки на доски (`/h/dom1` … `/h/dom5`) — видны всем **как гостям**.
* Кнопка **Log in** на странице дома ведёт на логин, привязанный к **этому** дому.
* Если админ вводит логин/пароль **не от этого дома**, увидит ошибку:
  *«Вы не на ссылке своего дома»*.
* Вошедший админ публикует/редактирует/удаляет **только у себя**.
* Админка по адресу: **`/h/:slug/admin`**, например `/h/dom2/admin`.
* Верхняя панель:

  * «Моя доска» (кнопка) — ведёт на свою доску,
  * «Admin» — ведёт в админку своего дома,
  * «Выйти» — очищает вход и возвращает на публичную доску текущего дома.

---

## Быстрый старт

### 1) Backend

```bash
cd backend

# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS/Linux
# python3 -m venv .venv
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload
```

Проверка:

* `http://localhost:8000/health` → `{"status":"ok"}`
* Документация: `http://localhost:8000/docs`

### 2) Frontend

```bash
cd frontend
copy .env.example .env     # Windows
# cp .env.example .env     # macOS/Linux

npm i
npm run dev
```

Открыть: `http://localhost:5173`

---

## Демо-аккаунты

* Email: `admin1@example.com` … `admin5@example.com`
* Пароль: `admin12345`

**Важно:** входить нужно со страницы своего дома (см. ссылки ниже).
Например, `admin3@example.com` — только через `/login?house=dom3` (кнопка **Log in** на `/h/dom3` уже подставит параметр).

---

## Ссылки домов

Эти URL можно раздать жильцам (на сайте их не отображаем):

* `http://localhost:5173/h/dom1`
* `http://localhost:5173/h/dom2`
* `http://localhost:5173/h/dom3`
* `http://localhost:5173/h/dom4`
* `http://localhost:5173/h/dom5`

Админка конкретного дома (после входа):
`http://localhost:5173/h/<slug>/admin` — например, `/h/dom2/admin`.

---

## Структура проекта

```
house-board/
  backend/
    app.py
    requirements.txt
    app.db          # база SQLite (создаётся автоматически)
  frontend/
    src/
      App.jsx
      App.css
      main.jsx
      api.js
      pages/
        Board.jsx
        Login.jsx
        Admin.jsx
    index.html
    package.json
    .env.example
  README.md
  .gitignore
```

---

## Скрипты запуска

**Windows (по желанию):**

`run-backend.bat`

```bat
@echo off
cd /d %~dp0\backend
python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

`run-frontend.bat`

```bat
@echo off
cd /d %~dp0\frontend
if not exist node_modules npm i
npm run dev
```

---

## Переменные окружения

`frontend/.env.example`:

```env
VITE_API_URL=http://localhost:8000
```

Скопируйте в `.env`.
Если задеплоите бэкенд, укажите его URL.

---

## API (шпаргалка)

* `POST /auth/login` — обычный логин (без привязки к дому).
* `POST /auth/login/{slug}` — **домо-зависимый логин** (используется на `/login?house=slug`).
* `GET /me` — текущий пользователь по токену.
* `GET /houses` — анониму: все дома; администратору: только его.
* `GET /houses/{slug}/announcements` — список объявлений;
  если админ залогинен и лезет в чужой дом → `403`.
* `POST /houses/{slug}/announcements` — создать (только админ своего дома).
* `PATCH /announcements/{id}` — обновить (только админ своего дома).
* `DELETE /announcements/{id}` — удалить (только админ своего дома).

Токен хранится в `localStorage` и отправляется как `Authorization: Bearer <token>`.

---

## Дизайн

Минимальный аккуратный UI без внешних библиотек.
Основные стили — в `frontend/src/App.css`:

* токены темы (цвета/радиусы/тени) в `:root`;
* карточки `.card`, бейдж `.badge`;
* кнопки `.btn` (акцент) и `.btn-ghost` (нейтральная);
* формы: авто-фокус с кольцом, чекбокс с `accent-color`;
* шапка: «Моя доска», «Admin», «Выйти» — кнопки одинаковой высоты.

Быстрая смена акцентного цвета — правьте вверху `App.css`:

```css
--brand: #16a34a;        /* зелёный */
--brand-hover: #15803d;
```

---



## Траблшутинг

**1) Ошибка bcrypt / passlib при старте бэкенда**
Убедитесь, что версии зафиксированы в `backend/requirements.txt`:

```
bcrypt==3.2.2
passlib==1.7.4
```

Затем переустановите зависимости в виртуальной среде.

**2) Порт занят**

* Бэкенд: `uvicorn app:app --reload --port 8010` и поменять `VITE_API_URL` во фронте.
* Фронт: `npm run dev -- --port 5174` (или любой свободный).

**3) CORS**
Если фронт и бэкенд на разных доменах/портах, убедитесь, что в `app.py` в `add_middleware(CORSMiddleware, allow_origins=[...])` добавлен домен фронта или стоит `["*"]` для разработки.

**4) «Вы не на ссылке своего дома» при входе**
Значит, пытаетесь войти не со своей страницы. Для `admin3@example.com` используйте `/h/dom3` → **Log in** (или `/login?house=dom3`).

**5) `403` при просмотре чужой доски, будучи залогиненным**
Это ожидаемо: залогиненному админу запрещено читать чужие дома. Выйдите (**Выйти**) — и посмотрите как гость.

**6) Пустая страница / белый экран**
Откройте DevTools → Console. Чаще всего не поднят бэкенд (`net::ERR_CONNECTION_REFUSED`) или не совпадает `VITE_API_URL`.

---

## Как поменять количество домов

В `backend/app.py` в хэндлере `@app.on_event("startup")` есть сидирование:

```python
for i in range(1, 6):
    slug = f"dom{i}"
    ...
```

* Поменяйте `6` на нужное число (верхняя граница не включается).
* Удалите файл базы `backend/app.db` (или напишите миграцию) и перезапустите бэкенд — дома и админы создадутся заново.
* Логины будут вида `adminN@example.com`, пароль — `admin12345`.

---

Удачной сборки!
