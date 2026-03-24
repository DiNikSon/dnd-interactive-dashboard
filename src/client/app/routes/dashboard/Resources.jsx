import { useState, useEffect } from "react";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";
import {
  RECOVERY_TYPES, normalizeRecovery, applyRecovery,
  groupResources, GroupBlock, ResourceRow,
} from "@/components/ResourceControls.jsx";

const DEFAULT_RESOURCE = {
  id: null, characterId: null, name: "", group: "",
  type: "numerical", value: 0, max: null,
  denominations: [],
  recovery: [],
  hidden: false,
};

export default function Resources() {
  const [resourcesData, setResourcesData] = useLPSync(
    "/sync/subscribe/resources", "/sync/set/resources"
  );
  const [charsData] = useLPSync(
    "/sync/subscribe/characters", "/sync/set/characters"
  );
  const [notifications, setNotifications] = useLPSync(
    "/sync/subscribe/notifications", "/sync/set/notifications"
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

  const handleRest = (restType) => {
    const label = RECOVERY_TYPES.find(t => t.key === restType)?.label || restType;
    if (!confirm(`${label}?`)) return;
    save(resources.map(r => {
      if (r.characterId !== selectedCharId) return r;
      const newVal = applyRecovery(r, restType);
      return newVal !== null ? { ...r, value: newVal } : r;
    }));
    const charName = selectedChar?.name || "";
    const sceneQueue = Array.isArray(notifications?.scene) ? notifications.scene : notifications?.scene ? [notifications.scene] : [];
    setNotifications({
      ...notifications,
      scene: [...sceneQueue, { id: generateUUID(), title: `${charName}: ${label}`, text: "", timer: 5, createdAt: Date.now() }],
    });
  };

  const handleManualRecover = (id) => {
    const r = resources.find(x => x.id === id);
    if (!r) return;
    const newVal = applyRecovery(r, "manual");
    if (newVal !== null) save(resources.map(x => x.id === id ? { ...x, value: newVal } : x));
  };

  // Авто-удаление первого элемента очереди когда его таймер истёк
  const sceneQueue = Array.isArray(notifications?.scene)
    ? notifications.scene
    : notifications?.scene ? [notifications.scene] : [];

  useEffect(() => {
    const first = sceneQueue[0];
    if (!first?.timer) return;
    const remaining = first.createdAt + first.timer * 1000 - Date.now();
    const delay = Math.max(0, remaining) + 300;
    const t = setTimeout(() => {
      setNotifications({ ...notifications, scene: sceneQueue.slice(1) });
    }, delay);
    return () => clearTimeout(t);
  }, [sceneQueue]);

  const openAdd = () => setEditResource({ ...DEFAULT_RESOURCE, characterId: selectedCharId });
  const openEdit = (r) => setEditResource({ ...r });

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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedChar.color }} />
                <h2 className="font-semibold">{selectedChar.name}</h2>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleRest("short_rest")}
                  className="px-3 py-1.5 bg-amber-600/50 hover:bg-amber-600/80 rounded-lg text-sm transition"
                >Короткий отдых</button>
                <button
                  onClick={() => handleRest("long_rest")}
                  className="px-3 py-1.5 bg-blue-600/50 hover:bg-blue-600/80 rounded-lg text-sm transition"
                >Длинный отдых</button>
                <button
                  onClick={openAdd}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition"
                >+ Добавить</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {charResources.length === 0 && (
                <p className="text-white/30 text-sm">Нет ресурсов</p>
              )}
              {grouped.map((group, gi) =>
                group.isGroup ? (
                  <GroupBlock key={group.name + gi} group={group} onEdit={openEdit} onChange={handleChange} onSetValue={handleSetValue} onRecover={handleManualRecover} />
                ) : (
                  <ResourceRow key={group.item.id} resource={group.item} onEdit={openEdit} onChange={handleChange} onSetValue={handleSetValue} onRecover={handleManualRecover} />
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

// ── Панель редактирования ─────────────────────────────────────────────────────

function ResourceEditPanel({ resource, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({
    ...resource,
    denominations: resource.denominations || [],
    recovery: normalizeRecovery(resource.recovery),
  });
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addRecovery = () => setForm(f => ({ ...f, recovery: [...f.recovery, { type: "long_rest", amount: "" }] }));
  const removeRecovery = (i) => setForm(f => ({ ...f, recovery: f.recovery.filter((_, j) => j !== i) }));
  const updateRecovery = (i, key, val) => setForm(f => ({
    ...f,
    recovery: f.recovery.map((rec, j) => j === i ? { ...rec, [key]: val } : rec),
  }));

  const addDenom = () => setForm(f => ({
    ...f,
    denominations: [...f.denominations, { name: "", abbr: "", base: 1 }],
  }));
  const removeDenom = (i) => setForm(f => ({
    ...f,
    denominations: f.denominations.filter((_, j) => j !== i),
  }));
  const updateDenom = (i, key, val) => setForm(f => ({
    ...f,
    denominations: f.denominations.map((d, j) => j === i ? { ...d, [key]: val } : d),
  }));

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
        <div>
          <label className="block text-xs text-white/50 mb-1">Название</label>
          <input required value={form.name} onChange={e => set("name", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="Ячейки заклинаний 1 ур." />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Группа (необязательно)</label>
          <input value={form.group} onChange={e => set("group", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="Ячейки заклинаний" />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Тип</label>
          <div className="flex gap-2">
            {[
              { key: "numerical", label: "Numerical" },
              { key: "tally",     label: "Tally" },
              { key: "currency",  label: "Currency" },
            ].map(t => (
              <button key={t.key} type="button" onClick={() => set("type", t.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs transition ${
                  form.type === t.key ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {form.type === "currency" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-white/50">Деноминации</label>
              <button type="button" onClick={addDenom}
                className="text-xs px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded transition">
                + Добавить
              </button>
            </div>
            {form.denominations.length === 0 && (
              <p className="text-white/30 text-xs mb-2">Добавь хотя бы одну деноминацию</p>
            )}
            <div className="space-y-1.5">
              {form.denominations.map((d, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input value={d.name} onChange={e => updateDenom(i, "name", e.target.value)}
                    placeholder="Золото"
                    className="flex-1 px-2 py-1 bg-white/10 rounded border border-white/20 text-xs outline-none" />
                  <input value={d.abbr} onChange={e => updateDenom(i, "abbr", e.target.value)}
                    placeholder="зм"
                    className="w-10 px-2 py-1 bg-white/10 rounded border border-white/20 text-xs outline-none text-center" />
                  <input type="number" min={1} value={d.base}
                    onChange={e => updateDenom(i, "base", Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 bg-white/10 rounded border border-white/20 text-xs outline-none text-center" />
                  <button type="button" onClick={() => removeDenom(i)}
                    className="text-white/30 hover:text-red-400 transition px-1 text-sm">✕</button>
                </div>
              ))}
            </div>
            {form.denominations.length > 0 && (
              <p className="text-white/20 text-[10px] mt-1.5">Название · Сокр. · Базовая стоимость (в наименьших ед.)</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {form.type !== "currency" && (
            <div className="flex-1">
              <label className="block text-xs text-white/50 mb-1">Текущее</label>
              <input type="number" min={0} value={form.value}
                onChange={e => set("value", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm" />
            </div>
          )}
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">
              Максимум{form.type === "tally" && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input type="number" min={1} value={form.max ?? ""}
              onChange={e => set("max", e.target.value === "" ? null : Math.max(1, parseInt(e.target.value) || 1))}
              placeholder={form.type === "tally" ? "обязательно" : "∞"}
              required={form.type === "tally"}
              className={`w-full px-3 py-2 bg-white/10 rounded-lg border outline-none text-sm ${form.type === "tally" && !form.max ? "border-red-400/60" : "border-white/20"}`} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-white/50">Восстановление</label>
            <button type="button" onClick={addRecovery}
              className="text-xs px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded transition">
              + Добавить
            </button>
          </div>
          {form.recovery.length === 0 && (
            <p className="text-white/20 text-xs">Нет восстановлений</p>
          )}
          <div className="space-y-2">
            {form.recovery.map((rec, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <div className="flex-1 space-y-1">
                  <select value={rec.type} onChange={e => updateRecovery(i, "type", e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-800 text-white rounded-lg border border-white/20 outline-none text-xs">
                    {RECOVERY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <input value={rec.amount} onChange={e => updateRecovery(i, "amount", e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/10 rounded-lg border border-white/20 outline-none text-xs"
                    placeholder="Кол-во (число или 2d6)" />
                </div>
                <button type="button" onClick={() => removeRecovery(i)}
                  className="text-white/30 hover:text-red-400 transition px-1 pt-1.5 text-sm flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.hidden} onChange={e => set("hidden", e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Скрытый (не показывать игроку)</span>
        </label>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <button type="button" onClick={onDelete}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-sm transition">
              Удалить
            </button>
          )}
          <button type="submit" disabled={form.type === "tally" && !form.max}
            className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg text-sm">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
