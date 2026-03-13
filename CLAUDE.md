# DND Interactive — CLAUDE.md

## Project Overview

Full-stack web app для проведения D&D сессий. Три роли:

- **Сцена** (`/scene`) — отображается на большом экране за столом. Только показ информации, никакого взаимодействия с игрой.
- **Интерактор** (`/interactor`) — на устройствах игроков (индивидуально для каждого). Через него игроки взаимодействуют с игрой.
- **Дэшборд** (`/dashboard`) — инструмент управления для ГМ.

Все три клиента синхронизируются через сервер в реальном времени.

## Планируемые функции

### Сцена
| Функция | Статус |
|---|---|
| Смена фона | ✅ готово |
| Загрузка ассетов | ✅ готово |
| Саунд (звуковые эффекты) | ✅ готово |
| Музыка (плейлисты) | planned — см. ниже |
| Инициатива | planned |
| Отсчёт времени | planned |
| Редактор и генератор иконок | planned |
| Карта с квестами | planned |
| Создание скриптов | planned |
| Менеджмент состояний | planned |

### Система игроков (костяк)
| Функция | Статус |
|---|---|
| Список персонажей (имя + инициатива) | planned |
| Выбор персонажа в интракторе | planned |
| Токен игрока (localStorage, автовосстановление) | planned |
| Цвет персонажа | planned |
| Онлайн-статус в дэшборде | planned |
| Принудительное освобождение персонажа (ГМ) | planned |

### Интерактор
| Функция | Статус |
|---|---|
| Чат | planned |
| Менеджмент ресурсов | planned |
| Интерактивные проверки | planned |
| Описание заклинаний | planned |
| База знаний | planned |

## Спецификация: Музыка

### Концепция
Музыка — отдельный инструмент от саунда. Воспроизводится только на Сцене, параллельно со звуковыми эффектами.

В массиве `scene.sounds` музыка хранится как обычный звуковой объект с фиксированным `id: "music"`. Поиск по этому `id` при обновлении (не по `src`).

### Структура данных

**Плейлисты** хранятся в проекте (в JSON-файле проекта):
```json
{
  "playlists": [
    { "id": "uuid", "name": "Боевой", "tracks": ["/uploads/music/track1.mp3", "..."] },
    { "id": "uuid", "name": "Спокойный", "tracks": ["..."] }
  ]
}
```

**Объект музыки в `scene.sounds`:**
```json
{
  "id": "music",
  "src": ["...shuffled or original track URLs..."],
  "loop": false,
  "play": 1234567890,
  "volume": 0.8
}
```

### Управление (дэшборд)

**Менеджер плейлистов:**
- Создание / удаление плейлистов с названием
- Загрузка треков в плейлист, задание порядка
- Папка для загрузки: `/uploads/music/`

**Управление воспроизведением:**
- Выбор активного плейлиста → заменяет `src` в объекте `id: "music"`
- Play / Stop
- **Next track** — сдвиг `play` timestamp так, чтобы пропустить текущий трек (на основе длительностей)
- **Shuffle** — перемешивает треки в `src` на сервере и сбрасывает `play` на текущее время; все клиенты получают уже перемешанный порядок через sync
- Громкость

### Что уже готово
- `AudioPlayer` поддерживает `src` как массив и последовательное воспроизведение
- Инфраструктура загрузки файлов (`/upload/:folder`)
- Длительности треков (`GET /upload/audio/:folder`)
- Синхронизация через `scene.sounds`

## Architecture

```
dnd-interactive/
├── src/
│   ├── client/     # React Router v7 + Vite + TailwindCSS (port 5173 in dev)
│   └── server/     # Express.js API + file storage (port 3000)
├── Dockerfile
└── package.json    # Root scripts for dev/build/deploy
```

### Frontend (`src/client/`)
- **Framework:** React Router v7 (file-based routing, SSR disabled / SPA mode)
- **Build:** Vite 7, TypeScript (strict), TailwindCSS v4
- **Path alias:** `@/` → `./app/`
- **Routes:**
  - `/` — home menu
  - `/scene` — сцена на большом экране (только отображение)
  - `/interactor` — интерактор для игроков (взаимодействие с игрой)
  - `/dashboard` — панель ГМ
    - `/dashboard/background` — управление фонами
    - `/dashboard/soundpad` — управление аудио

### Backend (`src/server/`)
- **Framework:** Express.js 4
- **Storage:** file-based (JSON projects in `public/projects/`, uploads in `public/uploads/`)
- **Key API routes:**
  - `GET/PUT /sync/subscribe/:key` — long-polling for real-time state sync
  - `POST /sync/load/:key` — load a project
  - `PUT /sync/set/:key` — update scene state
  - `POST /sync/new` — create project
  - `POST /upload/:folder` — upload file
  - `GET /upload/audio/:folder` — list audio files with durations
  - `DELETE /upload/:folder/:file` — delete file

### Real-time Sync
Custom long-polling via `/sync` endpoint. Hash-based change detection (xxhashjs). Frontend uses `useLPSync` hook. No WebSockets.

## Dev Setup

```bash
# Install deps (first time)
cd src/client && npm install
cd src/server && npm install

# Run both servers concurrently
npm run dev   # from project root
```

Frontend proxies `/sync`, `/api`, `/uploads`, `/upload`, `/src` to backend (configured in `vite.config.ts`).

## Build & Deploy

```bash
# Production build (client)
cd src/client && npm run build

# Start server (serves built client + API)
cd src/server && npm start

# Heroku (auto)
npm run heroku-postbuild
```

Docker: multi-stage build, Node 20 Alpine.

## Key Commands

```bash
npm run dev          # start dev (root)
npm run start        # start production server
npm run typecheck    # React Router typegen + tsc (in src/client)
```

No test suite currently.

## Node Version

`20.19.5` (see `.nvmrc`). Use `nvm use` before running commands.
