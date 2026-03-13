import React, { useState } from "react";
import useLPSync from "@/hooks/useLPSync";
import { AudioPlayer } from "@/components/AudioPlayer";
import { NotificationModal } from "@/components/NotificationModal";

export function meta({}) {
  return [
    { title: "Сцена | DNDI" },
    { name: "description", content: "Сцена" },
  ];
}

export default function Scene() {
  const [data, , notifications, setNotifications, initiativeData] = useLPSync(
    "/sync/subscribe/",
    "/sync/set/",
    ["scene", "notifications", "initiative"]
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
        {data.initiativeActive && initiativeData && (
          <InitiativeWidget initiative={initiativeData} />
        )}
      </div>
    </div>
    <NotificationModal notification={notifications?.scene} onClose={closeNotif} closable={false} large />
  </>
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
