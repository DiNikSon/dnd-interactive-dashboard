import { useState } from "react";
import useLPSync from "@/hooks/useLPSync";

const SLOTS = [
  { key: "topLeft",      label: "↖", row: 0, col: 0 },
  { key: "topCenter",    label: "↑", row: 0, col: 1 },
  { key: "topRight",     label: "↗", row: 0, col: 2 },
  { key: "middleLeft",   label: "←", row: 1, col: 0 },
  { key: "middleRight",  label: "→", row: 1, col: 2 },
  { key: "bottomLeft",   label: "↙", row: 2, col: 0 },
  { key: "bottomCenter", label: "↓", row: 2, col: 1 },
  { key: "bottomRight",  label: "↘", row: 2, col: 2 },
];

const SLOT_NAMES = {
  topLeft: "Лев. верх",
  topCenter: "Центр верх",
  topRight: "Прав. верх",
  middleLeft: "Лев. середина",
  middleRight: "Прав. середина",
  bottomLeft: "Лев. низ",
  bottomCenter: "Центр низ",
  bottomRight: "Прав. низ",
};

const WIDGET_TYPES = [
  { value: "", label: "— Пусто —" },
  { value: "qr", label: "QR-код" },
  { value: "nowplaying", label: "Текущий трек" },
];

export default function Widgets() {
  const [widgets, setWidgets] = useLPSync("/sync/subscribe/widgets", "/sync/set/widgets");
  const [selected, setSelected] = useState(null);

  const setSlot = (key, value) => {
    setWidgets((prev) => ({ ...prev, [key]: value }));
  };

  const hideAll = () => {
    setWidgets((prev) => {
      const next = {};
      for (const k of Object.keys(prev)) {
        next[k] = prev[k] ? { ...prev[k], visible: false } : null;
      }
      return next;
    });
  };

  const selectedWidget = selected ? widgets[selected] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Виджеты</h2>
        <button
          onClick={hideAll}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
        >
          Скрыть все
        </button>
      </div>

      {/* Превью сетки */}
      <div className="grid grid-cols-3 gap-2" style={{ aspectRatio: "16/7" }}>
        {Array.from({ length: 9 }, (_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          // Center cell
          if (row === 1 && col === 1) {
            return (
              <div key="center" className="rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs">
                Сцена
              </div>
            );
          }
          const slot = SLOTS.find((s) => s.row === row && s.col === col);
          if (!slot) return null;
          const w = widgets[slot.key];
          const isActive = w && w.type;
          const isSelected = selected === slot.key;
          return (
            <button
              key={slot.key}
              onClick={() => setSelected(isSelected ? null : slot.key)}
              className={`rounded-lg border transition flex flex-col items-center justify-center gap-1 p-2 text-sm
                ${isSelected
                  ? "border-white/60 bg-white/20"
                  : isActive
                  ? "border-white/30 bg-white/10 hover:bg-white/15"
                  : "border-dashed border-white/20 bg-white/5 hover:bg-white/10"
                }`}
            >
              <span className="text-lg">{slot.label}</span>
              {isActive ? (
                <>
                  <span className="text-xs text-white/70">{WIDGET_TYPES.find(t => t.value === w.type)?.label}</span>
                  <span className={`text-xs ${w.visible === false ? "text-red-400" : "text-green-400"}`}>
                    {w.visible === false ? "скрыт" : "виден"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-white/30">{SLOT_NAMES[slot.key]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Конфигурация выбранного слота */}
      {selected && (
        <div className="bg-white/5 rounded-xl p-5 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{SLOT_NAMES[selected]}</h3>
            {selectedWidget?.type && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedWidget.visible !== false}
                  onChange={(e) => setSlot(selected, { ...selectedWidget, visible: e.target.checked })}
                  className="w-4 h-4"
                />
                Показывать
              </label>
            )}
          </div>

          {/* Тип виджета */}
          <div className="space-y-1">
            <label className="text-xs text-white/50">Тип виджета</label>
            <select
              value={selectedWidget?.type || ""}
              onChange={(e) => {
                if (!e.target.value) {
                  setSlot(selected, null);
                } else {
                  setSlot(selected, { type: e.target.value, visible: true });
                }
              }}
              className="w-full px-3 py-2 bg-gray-800 text-white border border-white/20 rounded-lg text-sm [&>option]:bg-gray-800"
            >
              {WIDGET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Поля QR-виджета */}
          {selectedWidget?.type === "qr" && (
            <QrConfig widget={selectedWidget} onChange={(upd) => setSlot(selected, { ...selectedWidget, ...upd })} />
          )}
        </div>
      )}
    </div>
  );
}

function QrConfig({ widget, onChange }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-white/50">Заголовок</label>
        <input
          type="text"
          value={widget.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Например: Наш Discord"
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-white/50">Ссылка</label>
        <input
          type="url"
          value={widget.url || ""}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm outline-none"
        />
      </div>
    </div>
  );
}
