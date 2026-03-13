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
| Музыка и саунд | planned |
| Инициатива | planned |
| Отсчёт времени | planned |
| Редактор и генератор иконок | planned |
| Карта с квестами | planned |
| Создание скриптов | planned |
| Менеджмент состояний | planned |

### Интерактор
| Функция | Статус |
|---|---|
| Чат | planned |
| Менеджмент ресурсов | planned |
| Интерактивные проверки | planned |
| Описание заклинаний | planned |
| База знаний | planned |

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
