import React, { useState, useRef } from "react";
import useLPSync from "@/hooks/useLPSync";
import { AudioPlayer } from "@/components/AudioPlayer";
import { NotificationModal } from "@/components/NotificationModal";
import { WidgetOverlay } from "@/components/WidgetOverlay";
import { MARKER_TYPES, getVisibleQuests } from "@/utils/questMap.js";
import SimpleMarkdown from "@/components/SimpleMarkdown.jsx";

export function meta({}) {
  return [
    { title: "Сцена | DNDI" },
    { name: "description", content: "Сцена" },
  ];
}

export default function Scene() {
  const [data, , notifications, setNotifications, initiativeData, , widgets, , mapsData, , questsData] = useLPSync(
    "/sync/subscribe/",
    "/sync/set/",
    ["scene", "notifications", "initiative", "widgets", "maps", "quests"]
  );
  const [muted, setMuted] = useState(true);

  const closeNotif = () =>
    setNotifications((prev) => ({ ...prev, scene: null }));

  return <>
    <div
      style={{ '--image-url': `${data.background && 'url(' + data.background + ')'}` }}
      className="min-h-screen min-w-screen bg-[image:var(--image-url)] bg-cover bg-no-repeat"
    >
      <div className="min-h-screen min-w-screen backdrop-blur-xs flex items-center justify-center">
        <Audio muted={muted} setMuted={setMuted} sounds={data.sounds} />
        {data.active === "initiative" && initiativeData && (
          <InitiativeWidget initiative={initiativeData} />
        )}
        {data.active === "image" && data.activeImage && (
          <img
            src={data.activeImage}
            alt=""
            className="max-h-[75vh] max-w-[75vw] rounded-xl shadow-2xl object-contain"
          />
        )}
      </div>
    </div>
    {data.active === "map" && data.activeMapId && (
      <MapDisplay
        mapId={data.activeMapId}
        maps={mapsData?.items || []}
        quests={questsData?.items || []}
        showCompleted={!!data.showCompletedOnMap}
      />
    )}
    <WidgetOverlay widgets={widgets} />
    {data.activeQuestId && (() => {
      const q = (questsData?.items || []).find(x => x.id === data.activeQuestId);
      return q ? <QuestPopup quest={q} /> : null;
    })()}
    <NotificationModal notification={notifications?.scene} onClose={closeNotif} closable={false} large />
  </>
}

function QuestPopup({ quest }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[45] pointer-events-none">
      <div
        className="pointer-events-none text-white"
        style={{
          width: "44vw",
          minHeight: "28vh",
          maxHeight: "65vh",
          padding: "3vw 3.5vw",
          background: "linear-gradient(160deg, #1a120a 0%, #0e0a06 100%)",
          border: "1px solid rgba(180,130,60,0.45)",
          borderRadius: "1.2vw",
          boxShadow: "0 0 60px rgba(180,100,20,0.25), 0 4px 40px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        <div style={{ borderBottom: "1px solid rgba(180,130,60,0.25)", paddingBottom: "1vw", marginBottom: "1.2vw" }}>
          <h2 style={{ fontSize: "2.2vw", fontWeight: 700, letterSpacing: "0.03em", color: "#e8c97a" }}>
            {quest.title}
          </h2>
        </div>
        {quest.description && (
          <SimpleMarkdown text={quest.description} className="text-white/75" style={{ fontSize: "1.35vw", lineHeight: 1.6 }} />
        )}
      </div>
    </div>
  );
}

function MapDisplay({ mapId, maps, quests, showCompleted }) {
  const map = maps.find((m) => m.id === mapId);
  const [size, setSize] = useState(null);

  if (!map?.imageUrl) return null;

  const visibleQuests = getVisibleQuests(quests);
  const mapQuests = visibleQuests.filter((q) => q.mapId === mapId && q.visibility === "map" && (showCompleted || !q.completed));

  const onLoad = (e) => {
    const img = e.target;
    const scale = Math.min(window.innerWidth / img.naturalWidth, window.innerHeight / img.naturalHeight);
    setSize({ width: img.naturalWidth * scale, height: img.naturalHeight * scale });
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center">
      <div className="relative" style={size ? { width: size.width, height: size.height } : {}}>
        <img
          src={map.imageUrl}
          alt={map.name}
          onLoad={onLoad}
          style={{ display: "block", width: size?.width, height: size?.height }}
        />
        {size && mapQuests.map((q) => {
          const mtype = MARKER_TYPES[q.markerType] || MARKER_TYPES.point;
          return (
            <div
              key={q.id}
              style={{
                position: "absolute",
                left: `${(q.mapX || 0) * 100}%`,
                top: `${(q.mapY || 0) * 100}%`,
                transform: "translate(-50%, -50%)",
                opacity: q.completed ? 0.4 : 1,
              }}
            >
              <div
                className="rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                style={{
                  backgroundColor: mtype.color,
                  border: "2px solid rgba(255,255,255,0.4)",
                  width: "2.5vw",
                  height: "2.5vw",
                  fontSize: "1.2vw",
                }}
              >
                {mtype.symbol}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function InitiativeWidget({ initiative }) {
  const { participants = [], currentTurnId, round } = initiative;
  const sorted = [...participants].sort((a, b) => b.initiative - a.initiative);

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-2xl p-[2vw] w-[50vw] text-white space-y-2" style={{ fontSize: "1.6vw" }}>
      <div className="flex items-center justify-between gap-4 text-sm text-white/50 mb-1">
        <span className="font-semibold text-white">Инициатива</span>
        <span>Раунд {round}</span>
      </div>
      {sorted.map((p) => {
        const isCurrent = p.id === currentTurnId;
        const bg =
          p.type === "enemy"
            ? "#ef4444"
            : p.type === "ally"
            ? "#22c55e"
            : p.color || "#6366f1";
        const label =
          p.type === "enemy" ? String(p.enemyNumber || "") : getInitials(p.name);
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition ${
              p.able === false
                ? "opacity-35"
                : isCurrent
                ? "bg-yellow-500/30 ring-1 ring-yellow-400/50"
                : ""
            }`}
            style={{ fontSize: "1.4vw" }}
          >
            {isCurrent && <span className="text-yellow-400 text-xs">▶</span>}
            <div
              className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
              style={{ backgroundColor: bg, width: "2vw", height: "2vw", fontSize: "0.8vw" }}
            >
              {label}
            </div>
            <span className={`flex-1 ${isCurrent ? "text-yellow-200 font-semibold" : "text-white/80"}`}>
              {p.type === "enemy" ? `${p.name} №${p.enemyNumber}` : p.name}
            </span>
            <span className="text-white/40" style={{ fontSize: "1.2vw" }}>{p.initiative}</span>
          </div>
        );
      })}
    </div>
  );
}

function Audio({muted, setMuted, sounds}){
  const soundsArray = sounds?(Array.isArray(sounds)?sounds:[sounds]):null
  return <>
    <div className="absolute top-3 right-3 size-16" onClick={()=>setMuted(m=>!m)}>
      {
        muted?
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-volume-mute-fill size-16" viewBox="0 0 16 16">
          <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0"/>
        </svg>:
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-volume-up-fill size-16" viewBox="0 0 16 16">
          <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
          <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
          <path d="M8.707 11.182A4.5 4.5 0 0 0 10.025 8a4.5 4.5 0 0 0-1.318-3.182L8 5.525A3.5 3.5 0 0 1 9.025 8 3.5 3.5 0 0 1 8 10.475zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06"/>
        </svg>
      }
    </div>
    {soundsArray && !muted && soundsArray.map(sound=>(
      <AudioPlayer
        key={Array.isArray(sound.src)?sound.src.join('|'):sound.src}
        {...sound}
      />)
    )}
  </>
}
