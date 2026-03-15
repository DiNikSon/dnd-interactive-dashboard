import { useState, useRef } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";
import { MARKER_TYPES } from "@/utils/questMap.js";

export default function Maps() {
  const { scene, setScene } = useOutletContext();
  const [mapsData, setMapsData, questsData] = useLPSync("/sync/subscribe/", "/sync/set/", ["maps", "quests"]);

  const maps = mapsData?.items || [];
  const quests = questsData?.items || [];

  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: "add"|"edit", map?: {} }
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const showCompleted = !!scene?.showCompletedOnMap;

  const selectedMap = maps.find((m) => m.id === selectedId) || null;

  const mapQuests = quests.filter(
    (q) => q.mapId === selectedId && q.visibility === "map" && (showCompleted || !q.completed)
  );

  const isOnScene = scene?.active === "map" && scene?.activeMapId === selectedId;

  const toggleScene = () => {
    if (isOnScene) {
      setScene((prev) => ({ ...prev, active: null, activeMapId: null }));
    } else {
      setScene((prev) => ({ ...prev, active: "map", activeMapId: selectedId }));
    }
  };

  const handleSaveMap = async (formData) => {
    const existing = formData.id ? maps.find((m) => m.id === formData.id) : null;
    let imageUrl = existing?.imageUrl || null;

    if (formData.imageFile) {
      const fd = new FormData();
      fd.append("file", formData.imageFile);
      const res = await fetch("/upload/maps", { method: "POST", body: fd });
      if (res.ok) {
        const json = await res.json();
        imageUrl = json.url || json.path || imageUrl;
      }
    }

    const mapObj = {
      id: formData.id || generateUUID(),
      name: formData.name,
      parentId: formData.parentId || null,
      imageUrl,
      visibleToPlayers: formData.visibleToPlayers,
    };

    const newItems = formData.id
      ? maps.map((m) => (m.id === formData.id ? mapObj : m))
      : [...maps, mapObj];

    setMapsData({ items: newItems });
    setModal(null);
  };

  const handleDelete = () => {
    const newItems = maps.filter((m) => m.id !== selectedId);
    setMapsData({ items: newItems });
    setSelectedId(null);
    setDeleteConfirm(false);
  };

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Left sidebar: map tree */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Карты</h2>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
          >
            + Добавить
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {maps.filter((m) => !m.parentId).length === 0 && (
            <p className="text-white/40 text-sm">Нет карт</p>
          )}
          <MapTree
            maps={maps}
            parentId={null}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selectedMap ? (
          <div className="flex-1 flex items-center justify-center text-white/30">
            Выбери карту слева
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{selectedMap.name}</h2>
              {!selectedMap.visibleToPlayers && (
                <span className="px-2 py-0.5 bg-gray-500/20 text-gray-300 rounded text-xs">
                  скрыта от игроков
                </span>
              )}
              <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer ml-auto mr-2">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setScene((prev) => ({ ...prev, showCompletedOnMap: e.target.checked }))}
                  className="w-4 h-4"
                />
                Завершённые
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setModal({ mode: "edit", map: selectedMap })}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-sm transition"
                >
                  Удалить
                </button>
                {selectedMap.imageUrl && (
                  <button
                    onClick={toggleScene}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      isOnScene
                        ? "bg-green-500/40 text-green-200 hover:bg-green-500/60"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {isOnScene ? "✓ На сцене" : "На сцене"}
                  </button>
                )}
              </div>
            </div>

            {/* Map image with markers */}
            {selectedMap.imageUrl ? (
              <div className="flex-1 min-h-0 overflow-x-auto rounded-xl bg-black/30 flex items-center justify-center">
                <div className="relative h-full flex-shrink-0" style={{ display: "inline-block" }}>
                  <img
                    src={selectedMap.imageUrl}
                    alt={selectedMap.name}
                    className="h-full w-auto max-w-none block rounded-xl"
                  />
                  {mapQuests.map((q) => {
                    const mtype = MARKER_TYPES[q.markerType] || MARKER_TYPES.point;
                    return (
                      <QuestMarker
                        key={q.id}
                        quest={q}
                        mtype={mtype}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30 bg-black/20 rounded-xl">
                Нет изображения. Загрузи при редактировании.
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <MapModal
          mode={modal.mode}
          map={modal.map}
          maps={maps}
          onSave={handleSaveMap}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm space-y-4 text-white">
            <h3 className="text-lg font-semibold">Удалить карту?</h3>
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

function QuestMarker({ quest, mtype }) {
  const [hover, setHover] = useState(false);
  const x = (quest.mapX || 0) * 100;
  const y = (quest.mapY || 0) * 100;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        opacity: quest.completed ? 0.4 : 1,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-pointer"
        style={{ backgroundColor: mtype.color, border: "2px solid rgba(255,255,255,0.4)" }}
      >
        {mtype.symbol}
      </div>
      {hover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg z-10">
          {quest.title}
        </div>
      )}
    </div>
  );
}

function MapTree({ maps, parentId, selectedId, onSelect, depth = 0 }) {
  const children = maps.filter((m) => m.parentId === parentId);
  if (children.length === 0) return null;

  return (
    <>
      {children.map((m) => (
        <div key={m.id}>
          <button
            onClick={() => onSelect(m.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              selectedId === m.id
                ? "bg-white/25 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {depth > 0 && <span className="text-white/30 mr-1">└</span>}
            {m.name}
            {!m.visibleToPlayers && (
              <span className="ml-1 text-white/30 text-xs">🔒</span>
            )}
          </button>
          <MapTree
            maps={maps}
            parentId={m.id}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </div>
      ))}
    </>
  );
}

function MapModal({ mode, map, maps, onSave, onClose }) {
  const [name, setName] = useState(map?.name || "");
  const [parentId, setParentId] = useState(map?.parentId || "");
  const [visibleToPlayers, setVisibleToPlayers] = useState(
    map?.visibleToPlayers !== false
  );
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const availableParents = maps.filter((m) => m.id !== map?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      id: map?.id,
      name: name.trim(),
      parentId: parentId || null,
      visibleToPlayers,
      imageFile,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 text-white">
        <h3 className="text-lg font-semibold">
          {mode === "add" ? "Добавить карту" : "Редактировать карту"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">
              Родительская карта
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            >
              <option value="">— нет —</option>
              {availableParents.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">
              Изображение карты
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-white/70 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-sm hover:file:bg-white/20"
            />
            {map?.imageUrl && !imageFile && (
              <p className="text-xs text-white/40 mt-1">
                Текущее: {map.imageUrl.split("/").pop()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="visibleToPlayers"
              checked={visibleToPlayers}
              onChange={(e) => setVisibleToPlayers(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="visibleToPlayers" className="text-sm">
              Видна игрокам
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
