import { useState } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";

const COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
  "#1abc9c", "#3498db", "#9b59b6", "#e91e63",
];

export default function Characters() {
  useOutletContext(); // scene context доступен, но здесь не нужен

  const [charsData, setCharsData] = useLPSync(
    "/sync/subscribe/characters",
    "/sync/set/characters"
  );
  const [resourcesData, setResourcesData] = useLPSync(
    "/sync/subscribe/resources",
    "/sync/set/resources"
  );
  const characters = charsData?.list || [];

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", initiative: 0, color: COLORS[0], maxHp: "" });

  const saveChars = (newList) => setCharsData({ list: newList });

  // ===========================
  // Создание / редактирование
  // ===========================
  const startCreate = () => {
    setEditingId("new");
    setForm({ name: "", initiative: 0, color: COLORS[characters.length % COLORS.length], maxHp: "" });
  };

  const startEdit = (char) => {
    setEditingId(char.id);
    const hpRes = (resourcesData?.items || []).find(r => r.characterId === char.id && r.name === "Здоровье");
    setForm({ name: char.name, initiative: char.initiative, color: char.color, maxHp: hpRes?.max ?? "" });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = () => {
    if (!form.name.trim()) return;
    if (editingId === "new") {
      const charId = generateUUID();
      saveChars([
        ...characters,
        {
          id: charId,
          name: form.name.trim(),
          initiative: Number(form.initiative),
          color: form.color,
          playerId: null,
          enabled: true,
        },
      ]);
      const existingResources = resourcesData?.items || [];
      const maxHp = form.maxHp !== "" ? (parseInt(form.maxHp) || null) : null;
      setResourcesData({
        items: [
          ...existingResources,
          {
            id: generateUUID(),
            characterId: charId,
            name: "Здоровье",
            group: "",
            type: "numerical",
            value: maxHp ?? 0,
            max: maxHp,
            recovery: [{ type: "long_rest", amount: "1000" }],
            hidden: false,
          },
        ],
      });
    } else {
      saveChars(
        characters.map((c) =>
          c.id === editingId
            ? { ...c, name: form.name.trim(), initiative: Number(form.initiative), color: form.color }
            : c
        )
      );
      const maxHp = form.maxHp !== "" ? (parseInt(form.maxHp) || null) : null;
      const existingResources = resourcesData?.items || [];
      const hpRes = existingResources.find(r => r.characterId === editingId && r.name === "Здоровье");
      if (hpRes) {
        setResourcesData({ items: existingResources.map(r => r.id === hpRes.id ? { ...r, max: maxHp } : r) });
      } else {
        setResourcesData({ items: [...existingResources, { id: generateUUID(), characterId: editingId, name: "Здоровье", group: "", type: "numerical", value: maxHp ?? 0, max: maxHp, recovery: [{ type: "long_rest", amount: "1000" }], hidden: false }] });
      }
    }
    setEditingId(null);
  };

  const toggleEnabled = (id) => {
    saveChars(
      characters.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  const deleteChar = (id) => {
    if (!confirm("Удалить персонажа?")) return;
    saveChars(characters.filter((c) => c.id !== id));
  };

  const forceRelease = async (characterId) => {
    await fetch("/players/release-force", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId }),
    });
  };

  // ===========================
  // Render
  // ===========================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Персонажи</h2>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-green-600/70 hover:bg-green-600 rounded-lg text-sm"
        >
          + Добавить
        </button>
      </div>

      {/* Форма создания/редактирования */}
      {editingId && (
        <div className="p-4 bg-white/15 rounded-xl border border-white/30 space-y-3 max-w-md">
          <h3 className="font-medium">
            {editingId === "new" ? "Новый персонаж" : "Редактировать"}
          </h3>
          <div className="space-y-2">
            <input
              placeholder="Имя персонажа"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              className="w-full px-3 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/70">Инициатива</label>
              <input
                type="number"
                value={form.initiative}
                onChange={(e) => setForm((f) => ({ ...f, initiative: e.target.value }))}
                className="w-20 px-3 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/70">Макс Здоровье</label>
              <input
                type="number"
                placeholder="∞"
                value={form.maxHp}
                onChange={(e) => setForm((f) => ({ ...f, maxHp: e.target.value }))}
                className="w-24 px-3 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm text-white/70">Цвет</label>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition ${
                    form.color === c ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              className="px-4 py-1.5 bg-blue-600/70 hover:bg-blue-600 rounded text-sm"
            >
              Сохранить
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список персонажей */}
      {characters.length === 0 && !editingId && (
        <p className="text-white/40 text-sm">Нет персонажей — создай первого</p>
      )}

      <div className="space-y-2">
        {characters.map((char) => {
          const claimed = !!char.playerId;
          return (
            <div
              key={char.id}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl border border-white/15"
            >
              {/* Цвет */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: char.color }}
              />

              {/* Имя + инициатива */}
              <div className="flex-1 min-w-0">
                <span className="font-medium">{char.name}</span>
                <span className="text-white/50 text-sm ml-2">
                  инициатива: {char.initiative}
                </span>
              </div>

              {/* Статус */}
              <div className="flex items-center gap-1.5 text-sm">
                {claimed ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-white/60">занят</span>
                    <button
                      onClick={() => forceRelease(char.id)}
                      className="ml-1 text-xs px-2 py-0.5 bg-red-600/50 hover:bg-red-600 rounded"
                      title="Освободить принудительно"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white/20" />
                    <span className="text-white/40">свободен</span>
                  </>
                )}
              </div>

              {/* Действия */}
              <div className="flex gap-1.5 ml-2">
                <button
                  onClick={() => toggleEnabled(char.id)}
                  title={char.enabled ? "Отключить" : "Включить"}
                  className={`text-xs px-2 py-1 rounded transition ${
                    char.enabled
                      ? "bg-green-600/50 hover:bg-green-600/80"
                      : "bg-white/10 hover:bg-white/20 text-white/40"
                  }`}
                >
                  {char.enabled ? "вкл" : "выкл"}
                </button>
                <button
                  onClick={() => startEdit(char)}
                  className="text-xs px-2 py-1 bg-white/15 hover:bg-white/25 rounded"
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteChar(char.id)}
                  className="text-xs px-2 py-1 bg-white/10 hover:text-red-400 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
