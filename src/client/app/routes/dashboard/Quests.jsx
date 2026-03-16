import { useState, useRef } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";
import { MARKER_TYPES, VISIBILITY_LABELS } from "@/utils/questMap.js";
import SimpleMarkdown from "@/components/SimpleMarkdown.jsx";

const TABS = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "done", label: "Завершённые" },
];

export default function Quests() {
  const { scene, setScene } = useOutletContext();
  const [questsData, setQuestsData, mapsData, , notifData, setNotifications] = useLPSync(
    "/sync/subscribe/", "/sync/set/", ["quests", "maps", "notifications"]
  );

  const quests = questsData?.items || [];
  const maps = mapsData?.items || [];

  const [tab, setTab] = useState("all");
  const [editQuest, setEditQuest] = useState(null); // null | quest object (new has no id)
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const filtered = quests.filter((q) => {
    if (tab === "active") return !q.completed;
    if (tab === "done") return q.completed;
    return true;
  }).sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));

  const openAdd = () =>
    setEditQuest({
      id: null,
      title: "",
      description: "",
      visibility: "list",
      mapId: null,
      markerType: "quest",
      mapX: 0.5,
      mapY: 0.5,
      requiresQuestIds: [],
      completed: false,
    });

  const openEdit = (q) => setEditQuest({ ...q });

  const handleToggleCompleted = (q) => {
    const newItems = quests.map((item) =>
      item.id === q.id ? { ...item, completed: !item.completed } : item
    );
    setQuestsData({ items: newItems });
  };

  const CONGRATULATIONS = [
    "Ваш подвиг войдёт в легенды!",
    "Слава героям! Мир стал немного лучше.",
    "Отличная работа. Судьба благоволит смелым.",
    "История запомнит этот день.",
  ];

  const handleComplete = (q) => {
    if (q.completed) return;
    const newItems = quests.map((item) =>
      item.id === q.id ? { ...item, completed: true } : item
    );
    setQuestsData({ items: newItems });
    const congrats = CONGRATULATIONS[Math.floor(Math.random() * CONGRATULATIONS.length)];
    setNotifications((prev) => ({
      ...prev,
      scene: { id: generateUUID(), title: `✅ Задание «${q.title}» выполнено!`, text: congrats, timer: 5, createdAt: Date.now() },
    }));
  };

  const handleSave = (formData) => {
    const obj = { ...formData, id: formData.id || generateUUID() };
    const newItems = formData.id
      ? quests.map((q) => (q.id === formData.id ? obj : q))
      : [...quests, obj];
    setQuestsData({ items: newItems });
    setEditQuest(null);
  };

  const handleDelete = () => {
    const newItems = quests.filter((q) => q.id !== editQuest.id);
    setQuestsData({ items: newItems });
    setDeleteConfirm(false);
    setEditQuest(null);
  };

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Main list */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1 rounded text-sm transition ${
                  tab === t.key
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={openAdd}
            className="ml-auto px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition"
          >
            + Добавить задание
          </button>
        </div>

        {/* Quest list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 && (
            <p className="text-white/40 text-sm">Нет заданий</p>
          )}
          {filtered.map((q) => {
            const vis = VISIBILITY_LABELS[q.visibility] || VISIBILITY_LABELS.hidden;
            const isExpanded = expandedId === q.id;
            return (
              <div
                key={q.id}
                className="bg-white/5 hover:bg-white/10 rounded-xl transition overflow-hidden"
              >
                {/* Строка */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <input
                    type="checkbox"
                    checked={!!q.completed}
                    onChange={(e) => { e.stopPropagation(); handleToggleCompleted(q); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <span
                    className={`flex-1 text-sm font-medium ${
                      q.completed ? "line-through text-white/40" : ""
                    }`}
                  >
                    {q.title || "Без названия"}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${vis.color}`}>
                    {vis.label}
                  </span>
                  {!q.completed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleComplete(q); }}
                      className="px-2 py-1 bg-green-600/30 hover:bg-green-600/60 text-green-300 rounded text-xs transition flex-shrink-0"
                    >
                      Завершить
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); const isActive = scene?.activeQuestId === q.id; setScene((prev) => ({ ...prev, activeQuestId: isActive ? null : q.id })); }}
                    className={`px-2 py-1 rounded text-xs transition flex-shrink-0 ${scene?.activeQuestId === q.id ? "bg-green-600/60 text-green-200" : "bg-white/10 hover:bg-white/20"}`}
                  >
                    {scene?.activeQuestId === q.id ? "✓ Сцена" : "На сцене"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(q); }}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition flex-shrink-0"
                  >
                    Изменить
                  </button>
                  <span className={`text-white/30 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                </div>
                {/* Раскрытое описание */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                    {q.requiresQuestIds?.length > 0 && (
                      <div>
                        <p className="text-xs text-white/30 mb-1">Предпосылки:</p>
                        <div className="flex flex-wrap gap-1">
                          {q.requiresQuestIds.map((rid) => {
                            const req = quests.find((x) => x.id === rid);
                            return (
                              <span
                                key={rid}
                                className={`text-xs px-2 py-0.5 rounded ${req?.completed ? "bg-green-700/30 text-green-300" : "bg-white/10 text-white/50"}`}
                              >
                                {req?.completed ? "✓ " : ""}{req?.title || rid}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {q.description ? (
                      <SimpleMarkdown text={q.description} className="text-white/60 text-sm" />
                    ) : (
                      <p className="text-white/30 text-sm italic">Нет описания</p>
                    )}
                    {q.note && (
                      <div className="mt-2 px-3 py-2 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-yellow-200/70 text-xs whitespace-pre-wrap">
                        <span className="text-yellow-600/60 font-medium uppercase tracking-wide text-[10px]">Заметка · </span>
                        {q.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit panel */}
      {editQuest && (
        <QuestEditPanel
          quest={editQuest}
          quests={quests}
          maps={maps}
          onSave={handleSave}
          onClose={() => setEditQuest(null)}
          onDelete={() => setDeleteConfirm(true)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm space-y-4 text-white">
            <h3 className="text-lg font-semibold">Удалить задание?</h3>
            <p className="text-white/60 text-sm">Это действие нельзя отменить.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestEditPanel({ quest, quests, maps, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({ ...quest });
  const [preview, setPreview] = useState(false);
  const [showMdHint, setShowMdHint] = useState(false);
  const imgRef = useRef(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const selectedMap = maps.find((m) => m.id === form.mapId) || null;

  const handleImgClick = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    set("mapX", Math.max(0, Math.min(1, x)));
    set("mapY", Math.max(0, Math.min(1, y)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const otherQuests = quests.filter((q) => q.id !== form.id);

  return (
    <div className="w-96 flex-shrink-0 flex flex-col bg-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold text-sm">
          {quest.id ? "Редактировать задание" : "Новое задание"}
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white transition text-lg leading-none">
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Название</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="Название задания"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-white/50">Описание (Markdown)</label>
              <button
                type="button"
                onClick={() => setShowMdHint((p) => !p)}
                className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/70 text-[10px] leading-none flex items-center justify-center transition"
                title="Синтаксис Markdown"
              >
                ?
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-xs text-white/40 hover:text-white/70 transition"
            >
              {preview ? "Редактор" : "Предпросмотр"}
            </button>
          </div>
          {showMdHint && (
            <div className="mb-2 px-3 py-2 bg-black/40 rounded-lg border border-white/10 text-xs text-white/60 space-y-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span className="font-mono text-white/40"># Заголовок 1</span><span>Большой заголовок</span>
                <span className="font-mono text-white/40">## Заголовок 2</span><span>Средний заголовок</span>
                <span className="font-mono text-white/40">**жирный**</span><span><strong>жирный</strong></span>
                <span className="font-mono text-white/40">*курсив*</span><span><em>курсив</em></span>
                <span className="font-mono text-white/40">- пункт</span><span>Список</span>
                <span className="font-mono text-white/40">---</span><span>Разделитель</span>
              </div>
            </div>
          )}
          {preview ? (
            <div className="min-h-[80px] px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white/80">
              <SimpleMarkdown text={form.description} />
            </div>
          ) : (
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm resize-none"
              placeholder="Описание задания..."
            />
          )}
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Видимость</label>
          <div className="flex gap-2">
            {Object.entries(VISIBILITY_LABELS).map(([key, val]) => (
              <button
                key={key}
                type="button"
                onClick={() => set("visibility", key)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition ${
                  form.visibility === key
                    ? val.color + " ring-1 ring-current"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map position (only if visibility === "map") */}
        {form.visibility === "map" && (
          <>
            <div>
              <label className="block text-xs text-white/50 mb-1">Карта</label>
              <select
                value={form.mapId || ""}
                onChange={(e) => set("mapId", e.target.value || null)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-white/20 outline-none text-sm"
              >
                <option value="">— выбери карту —</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Тип маркера</label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(MARKER_TYPES).map(([key, mt]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("markerType", key)}
                    className={`px-2 py-1 rounded text-xs transition flex items-center gap-1 ${
                      form.markerType === key
                        ? "ring-1 ring-white/50"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                    style={
                      form.markerType === key
                        ? { backgroundColor: mt.color + "33", color: mt.color }
                        : {}
                    }
                  >
                    <span>{mt.symbol}</span>
                    <span>{mt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedMap?.imageUrl && (
              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Позиция на карте (клик)
                </label>
                <div className="relative rounded-lg overflow-hidden cursor-crosshair bg-black/30">
                  <img
                    ref={imgRef}
                    src={selectedMap.imageUrl}
                    alt={selectedMap.name}
                    onClick={handleImgClick}
                    className="w-full object-contain"
                    draggable={false}
                  />
                  {form.mapX != null && form.mapY != null && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${(form.mapX || 0) * 100}%`,
                        top: `${(form.mapY || 0) * 100}%`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                        style={{
                          backgroundColor:
                            MARKER_TYPES[form.markerType]?.color || "#8b5cf6",
                          border: "2px solid white",
                        }}
                      >
                        {MARKER_TYPES[form.markerType]?.symbol || "●"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Requirements */}
        {otherQuests.length > 0 && (
          <div>
            <label className="block text-xs text-white/50 mb-1">
              Требует выполнения
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {otherQuests.map((q) => (
                <label
                  key={q.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 px-2 py-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={(form.requiresQuestIds || []).includes(q.id)}
                    onChange={(e) => {
                      const curr = form.requiresQuestIds || [];
                      if (e.target.checked) {
                        set("requiresQuestIds", [...curr, q.id]);
                      } else {
                        set("requiresQuestIds", curr.filter((id) => id !== q.id));
                      }
                    }}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-white/70">{q.title || "Без названия"}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Заметка ГМ (только в дэшборде)</label>
          <textarea
            value={form.note || ""}
            onChange={(e) => set("note", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-yellow-900/20 rounded-lg border border-yellow-600/30 outline-none text-sm resize-none text-yellow-200/80 placeholder-yellow-600/40"
            placeholder="Приватные заметки..."
          />
        </div>

        {/* Completed */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.completed}
            onChange={(e) => set("completed", e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Выполнено</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {quest.id && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-sm transition"
            >
              Удалить
            </button>
          )}
          <button
            type="submit"
            className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm"
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
