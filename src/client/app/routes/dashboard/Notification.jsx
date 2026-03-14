import { useState } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";

export default function Notification() {
  useOutletContext();

  const [charsData] = useLPSync("/sync/subscribe/characters", "/sync/set/characters");
  const [notifications, setNotifications] = useLPSync(
    "/sync/subscribe/notifications",
    "/sync/set/notifications"
  );
  const characters = charsData?.list || [];

  const [target, setTarget] = useState("scene"); // "scene" | characterId
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timer, setTimer] = useState(10);

  const isScene = target === "scene";

  const send = () => {
    if (!title.trim() && !text.trim()) return;

    const notif = {
      id: generateUUID(),
      title: title.trim(),
      text: text.trim(),
      timer: (isScene || timerEnabled) ? Number(timer) : null,
      createdAt: Date.now(),
    };

    if (isScene) {
      setNotifications((prev) => ({ ...prev, scene: notif }));
    } else {
      setNotifications((prev) => ({
        ...prev,
        players: { ...(prev.players || {}), [target]: notif },
      }));
    }

    setTitle("");
    setText("");
  };

  const clearScene = () =>
    setNotifications((prev) => ({ ...prev, scene: null }));

  const clearPlayer = (charId) =>
    setNotifications((prev) => ({
      ...prev,
      players: { ...(prev.players || {}), [charId]: null },
    }));

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-2xl font-semibold">Уведомление</h2>

      {/* Форма отправки */}
      <div className="p-5 bg-white/10 rounded-xl border border-white/20 space-y-4">

        {/* Цель */}
        <div className="space-y-1">
          <label className="text-sm text-white/70">Получатель</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-white/20 outline-none text-sm [&>option]:bg-gray-800 [&>option]:text-white"
          >
            <option value="scene">🖥 Сцена</option>
            {characters.filter((c) => c.enabled !== false).map((c) => (
              <option key={c.id} value={c.id}>
                👤 {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Заголовок */}
        <div className="space-y-1">
          <label className="text-sm text-white/70">Заголовок</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок..."
            className="w-full px-3 py-2 bg-white/10 rounded border border-white/20 outline-none text-sm"
          />
        </div>

        {/* Текст */}
        <div className="space-y-1">
          <label className="text-sm text-white/70">Текст</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст уведомления..."
            rows={3}
            className="w-full px-3 py-2 bg-white/10 rounded border border-white/20 outline-none text-sm resize-none"
          />
        </div>

        {/* Таймер */}
        <div className="flex items-center gap-3">
          {!isScene && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(e) => setTimerEnabled(e.target.checked)}
                className="accent-white"
              />
              Автозакрытие
            </label>
          )}
          {isScene && (
            <span className="text-sm text-white/50">Таймер обязателен для Сцены</span>
          )}
          {(isScene || timerEnabled) && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="number"
                min={1}
                value={timer}
                onChange={(e) => setTimer(e.target.value)}
                className="w-20 px-3 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
              />
              <span className="text-sm text-white/60">сек.</span>
            </div>
          )}
        </div>

        <button
          onClick={send}
          disabled={!title.trim() && !text.trim()}
          className="w-full py-2 bg-blue-600/70 hover:bg-blue-600 rounded-lg text-sm font-medium disabled:opacity-40 transition"
        >
          Отправить
        </button>
      </div>

      {/* Активные уведомления */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white/70">Активные уведомления</h3>

        {notifications?.scene && (
          <div className="flex items-center justify-between px-3 py-2 bg-white/10 rounded-lg text-sm">
            <span>
              <span className="text-white/50 mr-2">🖥 Сцена</span>
              <span className="font-medium">{notifications.scene.title || notifications.scene.text}</span>
            </span>
            <button
              onClick={clearScene}
              className="text-white/40 hover:text-red-400 ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {Object.entries(notifications?.players || {})
          .filter(([, n]) => n !== null)
          .map(([charId, n]) => {
            const char = characters.find((c) => c.id === charId);
            return (
              <div
                key={charId}
                className="flex items-center justify-between px-3 py-2 bg-white/10 rounded-lg text-sm"
              >
                <span>
                  <span className="text-white/50 mr-2">👤 {char?.name ?? charId}</span>
                  <span className="font-medium">{n.title || n.text}</span>
                </span>
                <button
                  onClick={() => clearPlayer(charId)}
                  className="text-white/40 hover:text-red-400 ml-3"
                >
                  ✕
                </button>
              </div>
            );
          })}

        {!notifications?.scene &&
          !Object.values(notifications?.players || {}).some(Boolean) && (
            <p className="text-sm text-white/30">Нет активных уведомлений</p>
          )}
      </div>
    </div>
  );
}
