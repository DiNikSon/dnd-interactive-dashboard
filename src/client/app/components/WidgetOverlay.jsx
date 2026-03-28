import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const POSITIONS = {
  topLeft:      "top-[2vw] left-[2vw]",
  topCenter:    "top-[2vw] left-1/2 -translate-x-1/2",
  topRight:     "top-[2vw] right-[2vw]",
  middleLeft:   "top-1/2 left-[2vw] -translate-y-1/2",
  middleRight:  "top-1/2 right-[2vw] -translate-y-1/2",
  bottomLeft:   "bottom-[2vw] left-[2vw]",
  bottomCenter: "bottom-[2vw] left-1/2 -translate-x-1/2",
  bottomRight:  "bottom-[2vw] right-[2vw]",
};

export function WidgetOverlay({ widgets, scene }) {
  if (!widgets) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {Object.entries(widgets).map(([slot, widget]) => {
        if (!widget || !widget.type || widget.visible === false) return null;
        return (
          <div key={slot} className={`absolute ${POSITIONS[slot]}`}>
            <WidgetRenderer widget={widget} scene={scene} />
          </div>
        );
      })}
    </div>
  );
}

function WidgetRenderer({ widget, scene }) {
  if (widget.type === "qr") return <QrWidget widget={widget} />;
  if (widget.type === "nowplaying") return <NowPlayingWidget scene={scene} />;
  return null;
}

function QrWidget({ widget }) {
  const { title, url } = widget;
  if (!url) return null;

  const size = Math.round(window.innerWidth * 0.1);

  return (
    <div
      className="bg-black/70 backdrop-blur-sm rounded-xl p-[1vw] flex flex-col items-center gap-[0.6vw]"
      style={{ fontSize: "1.2vw" }}
    >
      {title && (
        <span className="text-white font-semibold text-center">{title}</span>
      )}
      <div className="rounded-lg overflow-hidden bg-white p-[0.4vw]">
        <QRCodeSVG value={url} size={size} />
      </div>
    </div>
  );
}

function NowPlayingWidget({ scene }) {
  const [durations, setDurations] = useState({});
  const [now, setNow] = useState(Date.now());

  const music = scene?.sounds?.find((s) => s.id === "music");

  useEffect(() => {
    fetch("/upload/audio/music/")
      .then((r) => r.json())
      .then(setDurations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(id);
  }, []);

  if (!music?.src) return null;

  const srcs = Array.isArray(music.src) ? music.src : [music.src];
  const durs = srcs.map((url) => durations[url] || 0);
  const totalDuration = durs.reduce((a, b) => a + b, 0);
  const isPlaying = !!music.play;

  let trackIndex = 0;
  if (totalDuration > 0) {
    const elapsedMs = music.play ? now - music.play : (music.pausedAt ?? 0);
    let offset = (elapsedMs / 1000) % totalDuration;
    while (offset >= durs[trackIndex] && trackIndex < durs.length - 1) {
      offset -= durs[trackIndex];
      trackIndex++;
    }
  }

  const trackName = srcs[trackIndex].split("/").pop().split(".")[0];

  return (
    <div
      className="bg-black/70 backdrop-blur-sm rounded-xl flex flex-col gap-[0.4vw]"
      style={{ fontSize: "1vw", padding: "1vw 1.4vw", minWidth: "14vw", maxWidth: "24vw" }}
    >
      <div className="flex items-center gap-[0.5vw] text-white/50" style={{ fontSize: "0.85vw" }}>
        <span>{isPlaying ? "♪ Сейчас играет" : "⏸ На паузе"}</span>
        {srcs.length > 1 && (
          <span className="ml-auto opacity-60">
            {trackIndex + 1} / {srcs.length}
          </span>
        )}
      </div>
      <div
        className="text-white font-semibold leading-snug"
        style={{ fontSize: "1.3vw" }}
      >
        {trackName}
      </div>
    </div>
  );
}
