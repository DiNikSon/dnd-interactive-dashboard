import React, { useState, useRef } from "react";
import useLPSync from "@/hooks/useLPSync";
import { AudioPlayer } from "@/components/AudioPlayer";
import { NotificationModal } from "@/components/NotificationModal";
import { WidgetOverlay } from "@/components/WidgetOverlay";
import { MARKER_TYPES, getVisibleQuests, getQuestStatus } from "@/utils/questMap.js";
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
      <div className={`min-h-screen min-w-screen flex items-center justify-center ${data.noBlur ? "" : "backdrop-blur-xs"}`}>
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
    {data.active === "map" && (() => {
      const count = getVisibleQuests(questsData?.items || []).filter(
        (q) => q.visibility === "list" && getQuestStatus(q) !== "completed"
      ).length;
      return count > 0 ? <QuestListBadge count={count} /> : null;
    })()}
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
        {(() => {
          const text = getQuestStatus(quest) === "available" ? quest.availableDescription : quest.description;
          return text ? <SimpleMarkdown text={text} className="text-white/75" style={{ fontSize: "1.35vw", lineHeight: 1.6 }} /> : null;
        })()}
      </div>
    </div>
  );
}

function QuestListBadge({ count }) {
  return (
    <div className="fixed bottom-[3vw] right-[3vw] z-[15] pointer-events-none flex items-end">
      <div className="relative" style={{ width: "6vw", height: "6vw" }}>
        {/* Иконка дневника */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"
          style={{ width: "100%", height: "100%", filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.8))" }}
        >
          <path d="M103.432 17.844a86.782 86.782 0 0 0-3.348.08c-2.547.11-5.083.334-7.604.678-20.167 2.747-39.158 13.667-52.324 33.67-24.613 37.4 2.194 98.025 56.625 98.025.536 0 1.058-.012 1.583-.022v.704h60.565c-10.758 31.994-30.298 66.596-52.448 101.43a283.192 283.192 0 0 0-6.29 10.406l34.878 35.733-56.263 9.423c-32.728 85.966-27.42 182.074 48.277 182.074v-.002l9.31.066c23.83-.57 46.732-4.298 61.325-12.887 4.174-2.458 7.63-5.237 10.467-8.42h-32.446c-20.33 5.95-40.8-6.94-47.396-25.922-8.956-25.77 7.52-52.36 31.867-60.452a55.552 55.552 0 0 1 17.565-2.834v-.406h178.33c-.57-44.403 16.35-90.125 49.184-126 23.955-26.176 42.03-60.624 51.3-94.846l-41.225-24.932 38.272-6.906-43.37-25.807h-.005l.002-.002.002.002 52.127-8.85c-5.232-39.134-28.84-68.113-77.37-68.113C341.14 32.26 222.11 35.29 149.34 28.496c-14.888-6.763-30.547-10.723-45.908-10.652zm.464 18.703c13.137.043 27.407 3.804 41.247 10.63l.033-.07c4.667 4.735 8.542 9.737 11.68 14.985H82.92l10.574 14.78c10.608 14.83 19.803 31.99 21.09 42.024.643 5.017-.11 7.167-1.814 8.836-1.705 1.67-6.228 3.875-15.99 3.875-40.587 0-56.878-44.952-41.012-69.06C66.238 46.64 79.582 39.22 95.002 37.12a64.146 64.146 0 0 1 8.894-.573zM118.5 80.78h46.28c4.275 15.734 3.656 33.07-.544 51.51H131.52c1.9-5.027 2.268-10.574 1.6-15.77-1.527-11.913-7.405-24.065-14.62-35.74zm101.553 317.095c6.44 6.84 11.192 15.31 13.37 24.914 3.797 16.736 3.092 31.208-1.767 43.204-4.526 11.175-12.576 19.79-22.29 26h237.19c14.448 0 24.887-5.678 32.2-14.318 7.312-8.64 11.2-20.514 10.705-32.352a47.733 47.733 0 0 0-2.407-13.18l-69.91-8.205 42.017-20.528c-8.32-3.442-18.64-5.537-31.375-5.537H220.053zm-42.668.506a36.999 36.999 0 0 0-3.457.153 34.825 34.825 0 0 0-7.824 1.63c-15.11 5.02-25.338 21.54-20.11 36.583 3.673 10.57 15.347 17.71 25.654 13.938l1.555-.57h43.354c.946-6.36.754-13.882-1.358-23.192-3.71-16.358-20.543-28.483-37.815-28.54z"
            fill="rgba(232,201,122,0.9)"
          />
        </svg>
        {/* Badge */}
        <div
          className="absolute flex items-center justify-center font-bold"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: "2vw",
            height: "2vw",
            padding: "0 0.4vw",
            borderRadius: "999px",
            background: "rgba(60,55,50,0.85)",
            border: "1px solid rgba(232,201,122,0.4)",
            color: "rgba(232,201,122,0.9)",
            fontSize: "0.9vw",
            lineHeight: 1,
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

function MapDisplay({ mapId, maps, quests, showCompleted }) {
  const map = maps.find((m) => m.id === mapId);
  const [size, setSize] = useState(null);

  if (!map?.imageUrl) return null;

  const visibleQuests = getVisibleQuests(quests);
  const mapQuests = visibleQuests.filter((q) => q.mapId === mapId && q.visibility === "map" && (showCompleted || getQuestStatus(q) !== "completed"));

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
                opacity: getQuestStatus(q) === "completed" ? 0.4 : 1,
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
