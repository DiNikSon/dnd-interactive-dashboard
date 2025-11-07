import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router";

export default function ChangeSounds() {
  const { scene, setScene } = useOutletContext();
  const [sounds, setSounds] = useState([]); // [{url, duration}]
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef(null);
  const timeoutsRef = useRef({});

  // ===========================
  // Fetch sounds
  // ===========================
  useEffect(() => {
    const fetchSounds = async () => {
      try {
        const res = await fetch("/upload/audio/sounds/");
        const data = await res.json();
        const entries = Object.entries(data).map(([url, duration]) => ({
          url,
          duration,
        }));
        setSounds(entries);
      } catch (err) {
        console.error("Ошибка при загрузке звуков:", err);
      }
    };
    fetchSounds();

    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  // ===========================
  // Helpers
  // ===========================
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  const getNameFromUrl = (url) =>
    capitalize(url.split("/").pop().split(".")[0].replaceAll("-", " ").toLowerCase());
  const findSoundInScene = (src) => scene.sounds?.find((s) => s.src === src);

  const updateSceneSound = (src, newData) => {
    setScene((prev) => {
      const updated = (prev.sounds || []).map((s) =>
        s.src === src ? { ...s, ...newData } : s
      );
      return { ...prev, sounds: updated };
    });
  };

  // ===========================
  // Sound control
  // ===========================
  const addSoundToScene = (src, loop = false) => {
    const now = Date.now();
    const duration = sounds.find((s) => s.url === src)?.duration || 0;

    setScene((prev) => {
      const existing = prev.sounds || [];
      const already = existing.find((s) => s.src === src);

      // очистить прошлый таймер
      if (timeoutsRef.current[src]) {
        clearTimeout(timeoutsRef.current[src]);
        delete timeoutsRef.current[src];
      }

      let remaining = duration * 1000; // по умолчанию вся длина

      if (already?.pausedAt) {
        // вычисляем остаток, если был в паузе
        const elapsed = already.pausedAt;
        remaining = Math.max(0, duration * 1000 - elapsed);
      }

      // только если не loop и есть длительность
      if (!loop && remaining > 0) {
        console.log(remaining)
        timeoutsRef.current[src] = setTimeout(() => {
          stopSound(src);
        }, remaining);
      }

      if (already) {
        return {
          ...prev,
          sounds: existing.map((s) =>
            s.src === src
              ? {
                  ...s,
                  play: now - (s.pausedAt || 0),
                  loop,
                  pausedAt: undefined,
                }
              : s
          ),
        };
      }

      return {
        ...prev,
        sounds: [
          ...existing,
          {
            src,
            loop,
            play: now,
            volume: 1,
          },
        ],
      };
    });
  };

  const stopSound = (src) => {
    setScene((prev) => ({
      ...prev,
      sounds: (prev.sounds || []).filter((s) => s.src !== src),
    }));
    if (timeoutsRef.current[src]) {
      clearTimeout(timeoutsRef.current[src]);
      delete timeoutsRef.current[src];
    }
  };

  const pauseSound = (src) => {
    setScene((prev) => {
      const updated = (prev.sounds || []).map((s) => {
        if (s.src !== src) return s;
        const elapsed = Date.now() - s.play;
        return { ...s, pausedAt: elapsed, play: false };
      });
      return { ...prev, sounds: updated };
    });

    if (timeoutsRef.current[src]) {
      clearTimeout(timeoutsRef.current[src]);
      delete timeoutsRef.current[src];
    }
  };

  const changeVolume = (src, volume) => {
    updateSceneSound(src, { volume });
  };

  // ===========================
  // Upload
  // ===========================
  const uploadFile = async (file) => {
    const name = prompt("Введите имя файла (без расширения):");
    if (!name) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const res = await fetch(
        `/upload/sounds?name=${encodeURIComponent(
          name.toLowerCase().replaceAll(" ", "-")
        )}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();

      if (data.url) {
        setSounds((prev) => [{ url: data.url, duration: 0 }, ...prev]);
      }
    } catch (err) {
      console.error("Ошибка при загрузке звука:", err);
      alert("Ошибка при загрузке звука");
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDelete = async (url) => {
    if (!confirm("Удалить этот звук?")) return;
    try {
      const filename = url.split("/").pop();
      const res = await fetch(`/upload/sounds/${filename}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");

      setSounds((prev) => prev.filter((s) => s.url !== url));
      stopSound(url);
    } catch (err) {
      console.error("Ошибка удаления звука:", err);
      alert("Не удалось удалить звук");
    }
  };

  // ===========================
  // Render
  // ===========================
  return (
    <div className="text-center space-y-6 overflow-x-hidden">
      <h2 className="text-2xl font-semibold mb-2">Управление звуками</h2>

      <p className="text-white/80">
        Активных звуков: {scene.sounds?.length || 0}
      </p>

      {/* Drag & Drop Upload */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative mx-auto w-full max-w-2xl p-8 border-2 border-dashed rounded-xl transition
          ${
            isDragging
              ? "border-white/80 bg-white/10"
              : "border-white/30 hover:border-white/50 bg-white/5"
          }`}
      >
        <input
          id="file-input"
          type="file"
          accept="audio/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />
        <label htmlFor="file-input" className="cursor-pointer block text-white/80">
          {isUploading ? (
            <span className="text-white/70">Загрузка...</span>
          ) : (
            <>
              <span className="text-xl">🎵</span> <br />
              <span className="text-white/70">
                Перетащи звук сюда <br /> или нажми, чтобы выбрать
              </span>
            </>
          )}
        </label>
        {isDragging && (
          <div className="absolute inset-0 bg-white/20 rounded-xl pointer-events-none animate-pulse" />
        )}
      </div>

      {/* Список звуков */}
      <div className="pt-6">
        <h3 className="text-lg font-medium mb-3 text-white/90">Доступные звуки:</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {sounds.map(({ url, duration }, i) => {
            const active = findSoundInScene(url);
            const name = getNameFromUrl(url);
            return (
              <div
                key={i}
                className="w-60 p-4 bg-white/10 rounded-xl border border-white/20 text-left space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium truncate">{name}</span>
                  <button
                    onClick={() => handleDelete(url)}
                    className="text-xs text-white/70 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-white/60 text-center">
                  {duration.toFixed(1)} сек.
                </p>

                <div className="flex flex-wrap gap-2 justify-center">
                  {!active?.play && (
                    <>
                      <button
                        onClick={() => addSoundToScene(url, false)}
                        className="px-3 py-1 bg-green-600/70 hover:bg-green-600 rounded text-sm text-white"
                      >
                        ▶ Play
                      </button>
                      <button
                        onClick={() => addSoundToScene(url, true)}
                        className="px-3 py-1 bg-blue-600/70 hover:bg-blue-600 rounded text-sm text-white"
                      >
                        🔁 Loop
                      </button>
                    </>
                  )}

                  {active?.play && (
                    <>
                      <button
                        onClick={() => pauseSound(url)}
                        className="px-3 py-1 bg-yellow-600/70 hover:bg-yellow-600 rounded text-sm text-white"
                      >
                        ⏸ Pause
                      </button>
                      <button
                        onClick={() => stopSound(url)}
                        className="px-3 py-1 bg-red-600/70 hover:bg-red-600 rounded text-sm text-white"
                      >
                        ⏹ Stop
                      </button>
                    </>
                  )}
                </div>

                {active && (
                  <div className="mt-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={active.volume}
                      onChange={(e) =>
                        changeVolume(url, parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-white/60 text-center">
                      Громкость: {(active.volume * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
