import { useState } from "react";
import useLPSync from "@/hooks/useLPSync";
import { NotificationModal } from "@/components/NotificationModal";
import { generateUUID } from "@/utils/uuid.js";
import { MARKER_TYPES, VISIBILITY_LABELS, getVisibleQuests, getQuestStatus } from "@/utils/questMap.js";
import SimpleMarkdown from "@/components/SimpleMarkdown.jsx";

export function meta() {
  return [
    { title: "Интерактор | DNDI" },
    { name: "description", content: "Интерактор игрока" },
  ];
}

function getOrCreateToken() {
  let token = localStorage.getItem("dndi_player_token");
  if (!token) {
    token = generateUUID();
    localStorage.setItem("dndi_player_token", token);
  }
  return token;
}

export default function Interactor() {
  const [
    data, setScene,
    charsData,,
    notifications, setNotifications,
    mapsData,,
    questsData,
  ] = useLPSync(
    "/sync/subscribe/",
    "/sync/set/",
    ["scene", "characters", "notifications", "maps", "quests"]
  );

  const characters = charsData?.list || [];
  const maps = mapsData?.items || [];
  const quests = questsData?.items || [];

  const [token] = useState(() => getOrCreateToken());
  const [claiming, setClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState("map");

  const myChar = characters.find((c) => c.playerId === token);
  const freeChars = characters.filter((c) => !c.playerId && c.enabled !== false);

  const myNotif = myChar ? notifications?.players?.[myChar.id] : null;
  const closeNotif = () => {
    if (!myChar) return;
    setNotifications((prev) => ({
      ...prev,
      players: { ...(prev.players || {}), [myChar.id]: null },
    }));
  };

  const claim = async (characterId) => {
    setClaiming(true);
    try {
      await fetch("/players/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, characterId }),
      });
    } catch (err) {
      console.error("Ошибка при выборе персонажа:", err);
    } finally {
      setClaiming(false);
    }
  };

  const release = async () => {
    await fetch("/players/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  };

  return (
    <>
      <div
        style={{ "--image-url": data?.background ? `url(${data.background})` : "none" }}
        className="min-h-screen min-w-screen bg-[image:var(--image-url)] bg-cover bg-no-repeat"
      >
        <div className="min-h-screen min-w-screen backdrop-blur-xs flex flex-col">
          {myChar ? (
            <div className="flex-1 flex flex-col min-h-0 h-screen">
              {/* Content area */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === "map" && (
                  <MapTab maps={maps} quests={quests} setScene={setScene} showCompleted={!!data?.showCompletedOnMap} sceneActive={data?.active} sceneMapId={data?.activeMapId} />
                )}
                {activeTab === "quests" && (
                  <QuestsTab quests={quests} setScene={setScene} />
                )}
                {activeTab === "character" && (
                  <div className="flex items-center justify-center h-full min-h-[60vh]">
                    <PlayerView char={myChar} onRelease={release} />
                  </div>
                )}
              </div>

              {/* Bottom nav */}
              <div className="flex-shrink-0 flex border-t border-white/10 bg-black/40 backdrop-blur-md">
                {[
                  { key: "map", label: "🗺 Карта" },
                  { key: "quests", label: "📜 Задания" },
                  { key: "character", label: "👤 Персонаж" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 text-sm font-medium transition ${
                      activeTab === tab.key
                        ? "text-white bg-white/15"
                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <CharacterSelect
                characters={freeChars}
                onClaim={claim}
                claiming={claiming}
              />
            </div>
          )}
        </div>
      </div>
      <NotificationModal notification={myNotif} onClose={closeNotif} />
    </>
  );
}

function getDescendantMapIds(mapId, maps) {
  const ids = [mapId];
  const children = maps.filter((m) => m.parentId === mapId);
  for (const child of children) {
    ids.push(...getDescendantMapIds(child.id, maps));
  }
  return ids;
}

function countActiveMapQuests(mapId, maps, quests) {
  const ids = new Set(getDescendantMapIds(mapId, maps));
  return getVisibleQuests(quests).filter(
    (q) => q.visibility === "map" && getQuestStatus(q) !== "completed" && ids.has(q.mapId)
  ).length;
}

/* ── Map Tab ── */
function MapTab({ maps, quests, setScene, showCompleted, sceneActive, sceneMapId }) {
  const [mapStack, setMapStack] = useState([]); // breadcrumb stack of map ids
  const [selectedQuest, setSelectedQuest] = useState(null);

  const currentMapId = mapStack.length > 0 ? mapStack[mapStack.length - 1] : null;
  const currentMap = maps.find((m) => m.id === currentMapId) || null;

  const visibleMaps = maps.filter((m) => m.visibleToPlayers !== false);
  const rootMaps = visibleMaps.filter((m) => !m.parentId);
  const childMaps = currentMapId
    ? visibleMaps.filter((m) => m.parentId === currentMapId)
    : [];

  const visibleQuests = getVisibleQuests(quests);
  const mapQuests = visibleQuests.filter(
    (q) => q.mapId === currentMapId && q.visibility === "map" && (showCompleted || getQuestStatus(q) !== "completed")
  );

  const goInto = (mapId) => setMapStack((s) => [...s, mapId]);
  const goBack = () => setMapStack((s) => s.slice(0, -1));

  if (!currentMapId) {
    return (
      <div className="p-4 space-y-3">
        <h2 className="text-white font-semibold text-lg">Карта</h2>
        {rootMaps.length === 0 ? (
          <p className="text-white/40 text-sm">Нет доступных карт</p>
        ) : (
          <div className="space-y-2">
            {rootMaps.map((m) => {
              const count = countActiveMapQuests(m.id, visibleMaps, quests);
              return (
                <button
                  key={m.id}
                  onClick={() => goInto(m.id)}
                  className="w-full text-left px-4 py-3 bg-black/30 hover:bg-black/50 rounded-xl text-white transition flex items-center justify-between"
                >
                  <span>{m.name}</span>
                  {count > 0 && (
                    <span className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-amber-950 text-xs rounded-full flex-shrink-0">
                      <span>📜</span><span>{count}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-black/30">
        <button
          onClick={goBack}
          className="text-white/60 hover:text-white transition text-sm px-2 py-1 rounded hover:bg-white/10"
        >
          ← Назад
        </button>
        <div className="flex items-center gap-1 text-sm text-white/60 flex-1">
          {mapStack.map((id, i) => {
            const m = maps.find((mp) => mp.id === id);
            return (
              <span key={id} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <button
                  onClick={() => setMapStack((s) => s.slice(0, i + 1))}
                  className={`hover:text-white transition ${
                    i === mapStack.length - 1 ? "text-white font-medium" : ""
                  }`}
                >
                  {m?.name || id}
                </button>
              </span>
            );
          })}
        </div>
        {sceneActive === "map" && sceneMapId !== currentMapId && (
          <button
            onClick={() => setScene((prev) => ({ ...prev, activeMapId: currentMapId }))}
            className="flex-shrink-0 px-3 py-1 rounded-lg text-sm transition"
            style={{ background: "rgba(180,130,60,0.2)", border: "1px solid rgba(180,130,60,0.4)", color: "#e8c97a" }}
          >
            Перейти →
          </button>
        )}
      </div>

      {/* Map image */}
      {currentMap?.imageUrl ? (
        <div className="mx-4 mt-3 rounded-xl overflow-x-auto bg-black/20 flex items-center justify-center" style={{ height: "55vh" }}>
          <div className="relative h-full flex-shrink-0" style={{ display: "inline-block" }}>
          <img
            src={currentMap.imageUrl}
            alt={currentMap.name}
            className="h-full w-auto max-w-none block"
          />
          {mapQuests.map((q) => {
            const mtype = MARKER_TYPES[q.markerType] || MARKER_TYPES.point;
            return (
              <button
                key={q.id}
                style={{
                  position: "absolute",
                  left: `${(q.mapX || 0) * 100}%`,
                  top: `${(q.mapY || 0) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: getQuestStatus(q) === "completed" ? 0.4 : 1,
                }}
                onClick={() => setSelectedQuest(q)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                  style={{
                    backgroundColor: mtype.color,
                    border: "2px solid rgba(255,255,255,0.4)",
                  }}
                >
                  {mtype.symbol}
                </div>
              </button>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-3 h-32 flex items-center justify-center bg-black/20 rounded-xl text-white/30 text-sm">
          Нет изображения
        </div>
      )}

      {/* Sub-maps */}
      {childMaps.length > 0 && (
        <div className="px-4 mt-3 space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wide">Переходы</p>
          {childMaps.map((m) => {
            const count = countActiveMapQuests(m.id, visibleMaps, quests);
            return (
              <button
                key={m.id}
                onClick={() => goInto(m.id)}
                className="w-full text-left px-4 py-2.5 bg-black/30 hover:bg-black/50 rounded-xl text-white text-sm transition flex items-center justify-between"
              >
                <span>{m.name}</span>
                {count > 0 && (
                  <span className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-amber-950 text-xs rounded-full flex-shrink-0">
                    <span>📜</span><span>{count}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Quest popup */}
      {selectedQuest && (
        <QuestDetail quest={selectedQuest} onClose={() => setSelectedQuest(null)} setScene={setScene} />
      )}
    </div>
  );
}

/* ── Quests Tab ── */
function QuestsTab({ quests, setScene }) {
  const [filter, setFilter] = useState("active");
  const [selectedQuest, setSelectedQuest] = useState(null);

  const visible = getVisibleQuests(quests);
  const filtered = visible.filter((q) => {
    if (filter === "active") return getQuestStatus(q) !== "completed";
    if (filter === "done") return getQuestStatus(q) === "completed";
    return true;
  });

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        {[
          { key: "active", label: "Активные" },
          { key: "done", label: "Завершённые" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              filter === f.key
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/40 text-sm">Нет заданий</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => {
            const vis = VISIBILITY_LABELS[q.visibility] || VISIBILITY_LABELS.hidden;
            return (
              <button
                key={q.id}
                onClick={() => setSelectedQuest(q)}
                className="w-full text-left px-4 py-3 bg-black/30 hover:bg-black/50 rounded-xl text-white transition space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium text-sm ${
                      getQuestStatus(q) === "completed" ? "line-through text-white/40" : ""
                    }`}
                  >
                    {q.title || "Без названия"}
                  </span>
                  {getQuestStatus(q) === "completed" && (
                    <span className="text-green-400 text-xs ml-auto">✓</span>
                  )}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${vis.color}`}>
                  {vis.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedQuest && (
        <QuestDetail quest={selectedQuest} onClose={() => setSelectedQuest(null)} setScene={setScene} />
      )}
    </div>
  );
}

/* ── Quest Detail Popup ── */
function QuestDetail({ quest, onClose, setScene }) {
  const share = () => setScene((prev) => ({ ...prev, activeQuestId: quest.id }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5">
      <div
        className="w-full max-w-md text-white flex flex-col"
        style={{
          minHeight: "40vh",
          maxHeight: "75vh",
          background: "linear-gradient(160deg, #1a1208 0%, #0e0a06 100%)",
          border: "1px solid rgba(180,130,60,0.4)",
          borderRadius: "1rem",
          boxShadow: "0 0 40px rgba(150,80,10,0.2), 0 4px 30px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(180,130,60,0.2)" }}>
          <h3 className="font-bold text-xl leading-tight" style={{ color: "#e8c97a" }}>
            {quest.title}
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-2xl leading-none flex-shrink-0 mt-0.5">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {(() => {
            const text = getQuestStatus(quest) === "available" ? quest.availableDescription : quest.description;
            return text
              ? <SimpleMarkdown text={text} className="text-white/75 text-sm leading-relaxed" />
              : <p className="text-white/30 text-sm">Нет описания</p>;
          })()}
          {quest.completed && (
            <p className="mt-3 text-green-400 text-sm font-medium">✓ Выполнено</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 flex justify-end" style={{ borderTop: "1px solid rgba(180,130,60,0.15)" }}>
          <button
            onClick={share}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: "rgba(180,130,60,0.2)", border: "1px solid rgba(180,130,60,0.4)", color: "#e8c97a" }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(180,130,60,0.35)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(180,130,60,0.2)"}
          >
            📢 Поделиться
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Character Select ── */
function CharacterSelect({ characters, onClaim, claiming }) {
  return (
    <div className="bg-black/50 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 text-white text-center space-y-6">
      <h1 className="text-2xl font-semibold">Выбери персонажа</h1>
      {characters.length === 0 ? (
        <p className="text-white/50">
          Нет свободных персонажей. Подожди, пока ГМ добавит их.
        </p>
      ) : (
        <div className="space-y-2">
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => !claiming && onClaim(char.id)}
              disabled={claiming}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition disabled:opacity-50"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: char.color }}
              />
              <span className="font-medium">{char.name}</span>
              <span className="ml-auto text-white/50 text-sm">
                инициатива {char.initiative}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Player View ── */
function PlayerView({ char, onRelease }) {
  return (
    <div className="bg-black/50 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 text-white text-center space-y-4">
      <div
        className="w-10 h-10 rounded-full mx-auto"
        style={{ backgroundColor: char.color }}
      />
      <h1 className="text-2xl font-semibold">{char.name}</h1>
      <p className="text-white/50 text-sm">инициатива: {char.initiative}</p>
      <button
        onClick={onRelease}
        className="mt-4 text-xs text-white/30 hover:text-white/60 transition"
      >
        Сменить персонажа
      </button>
    </div>
  );
}
