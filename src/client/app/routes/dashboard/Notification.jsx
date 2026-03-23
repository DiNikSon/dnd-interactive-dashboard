import { useState, useEffect } from "react";
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
      setNotifications((prev) => {
        const q = Array.isArray(prev?.scene) ? prev.scene : prev?.scene ? [prev.scene] : [];
        return { ...prev, scene: [...q, notif] };
      });
    } else {
      setNotifications((prev) => {
        const current = prev?.players?.[target];
        const arr = Array.isArray(current) ? current : current ? [current] : [];
        return { ...prev, players: { ...(prev.players || {}), [target]: [...arr, notif] } };
      });
    }

    setTitle("");
    setText("");
  };

  const clearScene = () =>
    setNotifications((prev) => ({ ...prev, scene: [] }));

  const clearSceneItem = (id) =>
    setNotifications((prev) => ({
      ...prev,
      scene: (Array.isArray(prev?.scene) ? prev.scene : []).filter(n => n.id !== id),
    }));

  const sceneQueue = Array.isArray(notifications?.scene)
    ? notifications.scene
    : notifications?.scene ? [notifications.scene] : [];

  // Авто-удаление первого элемента очереди когда его таймер истёк
  useEffect(() => {
    const first = sceneQueue[0];
    if (!first?.timer) return;
    const remaining = first.createdAt + first.timer * 1000 - Date.now();
    const delay = Math.max(0, remaining) + 300; // небольшой буфер после конца
    const t = setTimeout(() => {
      setNotifications({ ...notifications, scene: sceneQueue.slice(1) });
    }, delay);
    return () => clearTimeout(t);
  }, [sceneQueue]);

  const clearPlayer = (charId) =>
    setNotifications((prev) => ({
      ...prev,
      players: { ...(prev.players || {}), [charId]: [] },
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

        {sceneQueue.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">🖥 Сцена — очередь ({sceneQueue.length})</span>
              <button onClick={clearScene} className="text-xs text-white/30 hover:text-red-400">очистить всё</button>
            </div>
            {sceneQueue.map((n, i) => (
              <div key={n.id} className="flex items-center justify-between px-3 py-2 bg-white/10 rounded-lg text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  {i === 0 && <span className="text-green-400 text-xs flex-shrink-0">▶</span>}
                  {i > 0 && <span className="text-white/20 text-xs flex-shrink-0">{i + 1}.</span>}
                  <span className="font-medium truncate">{n.title || n.text}</span>
                </span>
                <button onClick={() => clearSceneItem(n.id)} className="text-white/40 hover:text-red-400 ml-3 flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}

        {Object.entries(notifications?.players || {})
          .map(([charId, raw]) => {
            const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
            if (!arr.length) return null;
            const char = characters.find((c) => c.id === charId);
            return (
              <div key={charId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">👤 {char?.name ?? charId} ({arr.length})</span>
                  <button onClick={() => clearPlayer(charId)} className="text-xs text-white/30 hover:text-red-400">очистить</button>
                </div>
                {arr.map(n => (
                  <div key={n.id} className="flex items-center justify-between px-3 py-2 bg-white/10 rounded-lg text-sm">
                    <span className="font-medium truncate">{n.title || n.text}</span>
                  </div>
                ))}
              </div>
            );
          })}

        {sceneQueue.length === 0 &&
          !Object.values(notifications?.players || {}).some(v => (Array.isArray(v) ? v.length : v)) && (
            <p className="text-sm text-white/30">Нет активных уведомлений</p>
          )}
      </div>
    </div>
  );
}
