# DND Interactive — CLAUDE.md

## Project Overview

Full-stack web app для проведения D&D сессий. Три роли:

- **Сцена** (`/scene`) — отображается на большом экране за столом. Только показ информации, никакого взаимодействия с игрой.
- **Интерактор** (`/interactor`) — на устройствах игроков (индивидуально для каждого). Через него игроки взаимодействуют с игрой.
- **Дэшборд** (`/dashboard`) — инструмент управления для ГМ.

Все три клиента синхронизируются через сервер в реальном времени.

## Статус функций

### Сцена
| Функция | Статус |
|---|---|
| Смена фона | ✅ готово |
| Загрузка ассетов | ✅ готово |
| Саунд (звуковые эффекты) | ✅ готово |
| Музыка (плейлисты) | ✅ готово |
| Инициатива (трекер) | ✅ готово |
| Показ изображения по центру | ✅ готово |
| Виджеты по краям экрана (QR и др.) | ✅ готово |
| Уведомления | ✅ готово |
| Карта с заданиями | ✅ готово |
| Отсчёт времени | planned |
| Редактор и генератор иконок | planned |
| Создание скриптов | planned |
| Менеджмент состояний | planned |
| Стили уведомлений | planned |

### Система игроков
| Функция | Статус |
|---|---|
| Список персонажей (имя, бонус инициативы, цвет, вкл/выкл) | ✅ готово |
| Выбор персонажа в интракторе | ✅ готово |
| Токен игрока (localStorage, автовосстановление) | ✅ готово |
| Цвет персонажа | ✅ готово |
| Принудительное освобождение персонажа (ГМ) | ✅ готово |
| Онлайн-статус в дэшборде | removed (ненадёжно) |
| Ресурсы персонажей (numerical / tally / currency) | ✅ готово |
| Чат | planned |
| Интерактивные проверки | planned |
| Описание заклинаний | planned |
| База знаний | planned |

### Дэшборд — инструменты
| Инструмент | Статус |
|---|---|
| 🎨 Смена фона | ✅ готово |
| 🧰 Саундпад | ✅ готово |
| 🎵 Музыка | ✅ готово |
| 🧙 Персонажи | ✅ готово |
| 🔔 Уведомление | ✅ готово |
| ⚔️ Инициатива | ✅ готово |
| 🖼 Изображение | ✅ готово |
| 🖼️ Виджеты | ✅ готово |
| 🗺 Карта | ✅ готово |
| 📜 Задания | ✅ готово |
| 🎒 Ресурсы | ✅ готово |

## Выбор проекта

При старте, если проект не выбран (`data.project === null`), дэшборд показывает `ProjectPicker` вместо интерфейса. Проекты хранятся как JSON-файлы в `public/projects/`. Кнопка "Сменить проект" в футере сайдбара вызывает `POST /sync/unload`, после чего сервер возвращает `data.project = null` и все подписчики получают обновление.

## Центральный виджет сцены (`scene.active`)

`scene.active` — строка, определяет что показывается в центре сцены:
- `"initiative"` — трекер инициативы
- `"image"` — выбранное изображение (`scene.activeImage`)
- `null` — ничего

Только один инструмент может быть активен одновременно. При включении одного другой автоматически отключается.

Также через `scene.activeQuestId` показывается квест в деталях на сцене (сбрасывается ✕ в сайдбаре дэшборда).

## Виджеты по краям (`widgets`)

8 слотов: `topLeft`, `topCenter`, `topRight`, `middleLeft`, `middleRight`, `bottomLeft`, `bottomCenter`, `bottomRight`.

Каждый слот: `{ type: "qr", visible: true, title: "...", url: "..." }` или `null`.

На сцене рендерятся через `WidgetOverlay` (`z-40`), ниже уведомлений (`z-50`). QR-код генерируется локально через `qrcode.react`.

## Спецификация: Музыка

### Концепция
Музыка — отдельный инструмент от саунда. Воспроизводится только на Сцене, параллельно со звуковыми эффектами.

В массиве `scene.sounds` музыка хранится как обычный звуковой объект с фиксированным `id: "music"`. Поиск по этому `id` при обновлении (не по `src`).

### Структура данных

**Плейлисты** хранятся в проекте:
```json
{
  "playlists": {
    "items": [
      { "id": "uuid", "name": "Боевой", "tracks": ["/uploads/music/track1.mp3"] }
    ]
  }
}
```

**Объект музыки в `scene.sounds`:**
```json
{ "id": "music", "src": ["..."], "loop": true, "play": 1234567890, "volume": 0.8 }
```

### Управление
- Play / Stop / Pause / Resume / Next track / Shuffle
- Shuffle перемешивает на сервере, все клиенты получают уже перемешанный порядок
- Next track — сдвиг `play` timestamp на основе длительностей треков

## Architecture

```
dnd-interactive/
├── src/
│   ├── client/     # React Router v7 + Vite + TailwindCSS (port 5173 in dev)
│   └── server/     # Express.js API + file storage (port 3000+)
├── _redist/        # Node.js installer для Windows
├── setup.bat       # Первичная настройка (deps, build, firewall)
├── start.bat       # Запуск сервера
└── package.json
```

### Frontend (`src/client/`)
- **Framework:** React Router v7 (file-based routing, SSR disabled / SPA mode)
- **Build:** Vite 7, TypeScript (strict), TailwindCSS v4
- **Node.js:** v22+ обязателен (Vite 7 требует `crypto.hash`)
- **Path alias:** `@/` → `./app/`
- **Routes:**
  - `/` — home menu
  - `/scene` — сцена
  - `/interactor` — интерактор игроков
  - `/dashboard` — панель ГМ
    - `background` / `soundpad` / `music` / `characters` / `notification` / `initiative` / `image` / `widgets`

### Backend (`src/server/`)
- **Framework:** Express.js 4
- **Storage:** file-based (JSON projects in `public/projects/`, uploads in `public/uploads/`)
- **Key API routes:**
  - `GET /sync/subscribe/:key` — long-polling (multi-key через `+`, напр. `scene+notifications`)
  - `PUT /sync/set/:key` — обновить ключ
  - `POST /sync/load/:key` — загрузить проект
  - `POST /sync/unload` — выгрузить проект (вернуть к выбору)
  - `POST /sync/new` — создать проект
  - `GET /sync/projects` — список проектов
  - `POST /upload/:folder` — загрузить файл
  - `GET /upload/audio/:folder` — список аудио с длительностями
  - `DELETE /upload/:folder/:file` — удалить файл

### Real-time Sync
Custom long-polling. Hash-based change detection (xxhashjs XXH64). Frontend — `useLPSync` hook (single и multi-key). No WebSockets.

Multi-key пример: `useLPSync("/sync/subscribe/", "/sync/set/", ["scene", "notifications"])` — 1 соединение вместо 2. Важно из-за лимита браузера 6 connections/host.

### Лимит соединений
- Сцена: подписывается на `["scene", "notifications", "initiative", "widgets"]` — 1 соединение
- Дашборд: подписывается на `["scene", "project"]` + каждый инструмент может добавлять свои — обычно 2-3 итого
- Интерактор: подписывается на `["scene", "characters", "notifications", "maps", "quests", "resources"]` — 1 соединение

## Система уведомлений

### Очередь уведомлений на сцене
`notifications.scene` — массив объектов `{ id, title, text, timer }`. Сцена **никогда не пишет на сервер** — управляет отображением локально через `shownIds` (Set). Показывается первое уведомление из очереди, у которого id нет в `shownIds`. Закрытие добавляет id в `shownIds`.

Дашборд (`Notification.jsx`) отвечает за очистку очереди: `useEffect` + `setTimeout` удаляет первый элемент когда его таймер истекает.

`notifications.players` — массив `{ id, characterId, title, text, timer }`. У игроков все уведомления показываются одновременно стопкой (не очередь). Закрытие фильтрует по id на сервере.

### Сайдбар дэшборда
- Кнопка ✕ рядом с «Уведомление» → `PUT /sync/set/notifications` с `{ scene: [] }` (очищает очередь)
- Кнопка ✕ рядом с «Задания» → `setScene({ activeQuestId: null })` (убирает детали квеста со сцены)

## Система ресурсов

### Структура данных (`resources.items`)
```json
{
  "id": "uuid",
  "characterId": "<id>",
  "name": "Ячейки заклинаний",
  "group": "Магия",
  "type": "tally",
  "value": 3,
  "max": 4,
  "hidden": false,
  "recovery": [
    { "type": "long_rest", "amount": "1000" },
    { "type": "manual" }
  ]
}
```

**Типы (`type`):** `numerical` | `tally` | `currency`

**Типы восстановления (`recovery[].type`):** `long_rest` | `short_rest` | `manual`
- `amount` — сколько восстанавливается (строка, `"1000"` = полное восстановление)
- Массив (может быть несколько записей)
- `normalizeRecovery(r)` конвертирует старый формат (объект) в массив

### Currency
Хранится в базовых единицах (`value`). `denominations` — массив `{ name, rate }` (rate = стоимость в базовых единицах). `decompose(value, denominations)` разбивает для отображения. Ввод только через +/- по номиналу или модальное окно +/−.

### Shared компонент
`src/client/app/components/ResourceControls.jsx` — экспортирует чистые функции и UI-компоненты, переиспользуемые в дэшборде и интракторе:
- Функции: `RECOVERY_TYPES`, `normalizeRecovery`, `calcRecoveryDelta`, `applyRecovery`, `decompose`, `groupResources`
- Компоненты: `GroupBlock`, `ResourceRow` (prop `editable`, default `true`), `NumericalControl`, `TallyControl`, `CurrencyControl`, `CurrencyModal`

### Отдых
Кнопки «Короткий отдых» / «Длинный отдых» есть в дэшборде (Resources.jsx) и интракторе. При нажатии:
1. Применяются все recovery нужного типа для персонажа
2. На сцену отправляется уведомление `"[ИмяПерсонажа]: Короткий/Длинный отдых"`

### Интерактор
Таб «🎒 Ресурсы» в нижней навигации. Показывает только `!r.hidden` ресурсы выбранного персонажа. Нельзя добавлять ресурсы. Фон контента `bg-black/50 backdrop-blur-sm` только для этого таба.

## Карта и задания

### Структура данных

**Карты** (`maps.items`):
```json
{ "id": "uuid", "name": "Мир", "image": "/uploads/maps/world.jpg", "parentId": null, "visibleToPlayers": true }
```
Иерархия через `parentId`. Загружаются в `/uploads/maps/`.

**Задания** (`quests.items`):
```json
{
  "id": "uuid", "title": "Найти артефакт", "description": "**Markdown** текст",
  "visibility": "map",
  "mapId": "<id>", "mapX": 0.42, "mapY": 0.67,
  "markerType": "quest",
  "completed": false,
  "requiresQuestIds": ["<id1>"]
}
```

**Типы видимости:**
- `"map"` — маркер на карте + в списке у игроков
- `"list"` — только в списке у игроков (без маркера)
- `"hidden"` — только ГМ

**Типы маркеров:** `quest` `dungeon` `shop` `npc` `danger` `point`

**Условия:** квест скрыт пока все квесты из `requiresQuestIds` не завершены.

**Карта на сцене:** `scene.active = "map"` + `scene.activeMapId = "<id>"`

**Интерактор:** нижняя панель навигации (Карта / Задания / Персонаж / Ресурсы), дефолт — Карта.

## Dev Setup

```bash
cd src/client && npm install
cd src/server && npm install
npm run dev   # from project root (concurrently)
```

Frontend proxies `/sync`, `/api`, `/uploads`, `/upload`, `/src`, `/players` to backend.

## Windows Deploy

```
setup.bat   # Первый запуск: проверяет Node v22+, ставит из _redist если нужно,
            # npm install, build, открывает порты 3000-3009 в файрволе
start.bat   # Запуск: ищет свободный порт с 3000, устанавливает PORT=, стартует сервер
```

## Key Commands

```bash
npm run dev          # start dev (root)
npm run start        # start production server
npm run typecheck    # React Router typegen + tsc (in src/client)
```

No test suite currently.

## Node Version

v22+ (see `.nvmrc`). `crypto.randomUUID()` не работает по HTTP (только HTTPS/localhost) — используй `generateUUID()` из `@/utils/uuid.js`.
