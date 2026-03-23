import { useState } from "react";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";

const RECOVERY_TYPES = [
  { key: "long_rest",  label: "Длинный отдых" },
  { key: "short_rest", label: "Короткий отдых" },
  { key: "dawn",       label: "На рассвете" },
  { key: "manual",     label: "Вручную" },
];

const DEFAULT_RESOURCE = {
  id: null, characterId: null, name: "", group: "",
  type: "numerical", value: 0, max: null,
  recovery: { type: "long_rest", amount: "" },
  hidden: false,
};

export default function Resources() {
  const [resourcesData, setResourcesData] = useLPSync(
    "/sync/subscribe/resources", "/sync/set/resources"
  );
  const [charsData] = useLPSync(
    "/sync/subscribe/characters", "/sync/set/characters"
  );

  const resources = resourcesData?.items || [];
  const characters = charsData?.list || [];

  const [selectedCharId, setSelectedCharId] = useState(null);
  const [editResource, setEditResource] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const selectedChar = characters.find(c => c.id === selectedCharId) || null;
  const charResources = resources.filter(r => r.characterId === selectedCharId);

  const save = (items) => setResourcesData({ items });

  const handleSave = (form) => {
    const obj = { ...form, id: form.id || generateUUID() };
    const newItems = form.id
      ? resources.map(r => r.id === form.id ? obj : r)
      : [...resources, obj];
    save(newItems);
    setEditResource(null);
  };

  const handleDelete = () => {
    save(resources.filter(r => r.id !== editResource.id));
    setDeleteConfirm(false);
    setEditResource(null);
  };

  const handleChange = (id, delta) => {
    const r = resources.find(x => x.id === id);
    if (!r) return;
    const newVal = r.max != null
      ? Math.max(0, Math.min(r.max, r.value + delta))
      : Math.max(0, r.value + delta);
    save(resources.map(x => x.id === id ? { ...x, value: newVal } : x));
  };

  const handleSetValue = (id, val) => {
    const r = resources.find(x => x.id === id);
    if (!r) return;
    const newVal = r.max != null
      ? Math.max(0, Math.min(r.max, Number(val) || 0))
      : Math.max(0, Number(val) || 0);
    save(resources.map(x => x.id === id ? { ...x, value: newVal } : x));
  };

  const openAdd = () => setEditResource({ ...DEFAULT_RESOURCE, characterId: selectedCharId });
  const openEdit = (r) => setEditResource({ ...r });

  // Группировка ресурсов
  const grouped = groupResources(charResources);

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Левая колонка — выбор персонажа */}
      <div className="w-48 flex-shrink-0 flex flex-col gap-2">
        <p className="text-xs text-white/40 uppercase tracking-wide px-1">Персонаж</p>
        {characters.length === 0 && (
          <p className="text-white/30 text-xs px-1">Нет персонажей</p>
        )}
        {characters.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCharId(c.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition text-left ${
              selectedCharId === c.id
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>

      {/* Правая колонка — ресурсы */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {!selectedChar ? (
          <p className="text-white/30 text-sm">Выбери персонажа слева</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedChar.color }} />
                <h2 className="font-semibold">{selectedChar.name}</h2>
              </div>
              <button
                onClick={openAdd}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition"
              >
                + Добавить
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {charResources.length === 0 && (
                <p className="text-white/30 text-sm">Нет ресурсов</p>
              )}
              {grouped.map((group, gi) =>
                group.isGroup ? (
                  <GroupBlock key={group.name + gi} group={group} onEdit={openEdit} onChange={handleChange} onSetValue={handleSetValue} />
                ) : (
                  <ResourceRow key={group.item.id} resource={group.item} onEdit={openEdit} onChange={handleChange} onSetValue={handleSetValue} />
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* Панель редактирования */}
      {editResource && (
        <ResourceEditPanel
          resource={editResource}
          onSave={handleSave}
          onClose={() => setEditResource(null)}
          onDelete={editResource.id ? () => setDeleteConfirm(true) : null}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm space-y-4 text-white">
            <h3 className="text-lg font-semibold">Удалить ресурс?</h3>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">Отмена</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Группировка ──────────────────────────────────────────────────────────────

function groupResources(resources) {
  const result = [];
  const groups = {};
  for (const r of resources) {
    if (!r.group) {
      result.push({ isGroup: false, item: r });
    } else {
      if (!groups[r.group]) {
        groups[r.group] = { isGroup: true, name: r.group, items: [] };
        result.push(groups[r.group]);
      }
      groups[r.group].items.push(r);
    }
  }
  return result;
}

// ── Групповой блок ────────────────────────────────────────────────────────────

function GroupBlock({ group, onEdit, onChange, onSetValue }) {
  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10">
        <span className="text-xs text-white/40 uppercase tracking-wide font-semibold">{group.name}</span>
      </div>
      <div className="divide-y divide-white/5">
        {group.items.map(r => (
          <ResourceRow key={r.id} resource={r} compact onEdit={onEdit} onChange={onChange} onSetValue={onSetValue} />
        ))}
      </div>
    </div>
  );
}

// ── Строка ресурса ────────────────────────────────────────────────────────────

function ResourceRow({ resource: r, compact, onEdit, onChange, onSetValue }) {
  const recoveryLabel = RECOVERY_TYPES.find(x => x.key === r.recovery?.type)?.label || "";
  const recoveryText = [recoveryLabel, r.recovery?.amount].filter(Boolean).join(" ");

  return (
    <div className={`flex items-center gap-3 ${compact ? "px-4 py-2" : "bg-white/5 rounded-xl px-4 py-3"}`}>
      {/* Название */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${compact ? "text-xs" : "text-sm"} ${r.hidden ? "text-white/40" : ""}`}>
          {r.name || "Без названия"}
          {r.hidden && <span className="ml-1 text-white/30 text-xs">👁</span>}
        </div>
        {recoveryText && !compact && (
          <div className="text-white/30 text-xs">{recoveryText}</div>
        )}
      </div>

      {/* Контрол */}
      {r.type === "tally"
        ? <TallyControl resource={r} onChange={onChange} compact={compact} />
        : <NumericalControl resource={r} onChange={onChange} onSetValue={onSetValue} compact={compact} />
      }

      {/* Кнопка редактирования */}
      <button
        onClick={() => onEdit(r)}
        className="text-white/30 hover:text-white/70 transition text-xs px-1.5 py-1 rounded hover:bg-white/10 flex-shrink-0"
      >
        ✏
      </button>
    </div>
  );
}

// ── Numerical ─────────────────────────────────────────────────────────────────

function NumericalControl({ resource: r, onChange, onSetValue, compact }) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => onChange(r.id, -1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center"
      >−</button>
      <input
        type="number"
        value={r.value}
        onChange={e => onSetValue(r.id, e.target.value)}
        className={`text-center bg-white/10 rounded border border-white/20 outline-none ${compact ? "w-10 text-xs py-0.5" : "w-12 text-sm py-1"}`}
      />
      {r.max != null && <span className="text-white/30 text-xs">/{r.max}</span>}
      <button
        onClick={() => onChange(r.id, 1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center"
      >+</button>
    </div>
  );
}

// ── Tally ─────────────────────────────────────────────────────────────────────

function TallyControl({ resource: r, onChange, compact }) {
  const size = compact ? "w-4 h-4 text-[10px]" : "w-5 h-5 text-xs";
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap max-w-[16rem]">
      <button
        onClick={() => onChange(r.id, -1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center flex-shrink-0"
      >−</button>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: r.max }, (_, i) => (
          <div
            key={i}
            className={`${size} rounded-full flex items-center justify-center flex-shrink-0 ${
              i < r.value
                ? "bg-indigo-500 border border-indigo-400"
                : "bg-white/10 border border-white/20"
            }`}
          />
        ))}
      </div>
      <button
        onClick={() => onChange(r.id, 1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center flex-shrink-0"
      >+</button>
    </div>
  );
}

// ── Панель редактирования ─────────────────────────────────────────────────────

function ResourceEditPanel({ resource, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({ ...resource });
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setRecovery = (key, val) => setForm(f => ({ ...f, recovery: { ...f.recovery, [key]: val } }));

  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h3 className="font-semibold text-sm">{resource.id ? "Редактировать" : "Новый ресурс"}</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white transition text-lg leading-none">×</button>
      </div>

      <form
        onSubmit={e => { e.preventDefault(); onSave(form); }}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Название */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Название</label>
          <input required value={form.name} onChange={e => set("name", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="Ячейки заклинаний 1 ур." />
        </div>

        {/* Группа */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Группа (необязательно)</label>
          <input value={form.group} onChange={e => set("group", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="Ячейки заклинаний" />
        </div>

        {/* Тип */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Тип</label>
          <div className="flex gap-2">
            {[
              { key: "numerical", label: "Numerical" },
              { key: "tally", label: "Tally" },
            ].map(t => (
              <button key={t.key} type="button" onClick={() => set("type", t.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs transition ${
                  form.type === t.key ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Значение / Максимум */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">Текущее</label>
            <input type="number" min={0} value={form.value} onChange={e => set("value", Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">Максимум</label>
            <input
              type="number" min={1}
              value={form.max ?? ""}
              onChange={e => set("max", e.target.value === "" ? null : Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="∞"
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            />
          </div>
        </div>

        {/* Восстановление */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Восстановление</label>
          <select value={form.recovery.type} onChange={e => setRecovery("type", e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-white/20 outline-none text-sm mb-2">
            {RECOVERY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input value={form.recovery.amount} onChange={e => setRecovery("amount", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="Кол-во (число или 2d6)" />
        </div>

        {/* Скрытый */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.hidden} onChange={e => set("hidden", e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Скрытый (не показывать игроку)</span>
        </label>

        {/* Кнопки */}
        <div className="flex gap-2 pt-2">
          {onDelete && (
            <button type="button" onClick={onDelete}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-sm transition">
              Удалить
            </button>
          )}
          <button type="submit" className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
