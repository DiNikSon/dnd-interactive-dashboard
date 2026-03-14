import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";

export default function ChangeMusic() {
  const { scene, setScene } = useOutletContext();
  const [playlistsData, setPlaylistsData] = useLPSync(
    "/sync/subscribe/playlists",
    "/sync/set/playlists"
  );
  const playlists = playlistsData?.items || [];

  const [tracks, setTracks] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [now, setNow] = useState(Date.now());

  const music = scene.sounds?.find((s) => s.id === "music");
  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // ===========================
  // Fetch tracks
  // ===========================
  const fetchTracks = async () => {
    try {
      const res = await fetch("/upload/audio/music/");
      setTracks(await res.json());
    } catch (err) {
      console.error("Ошибка загрузки треков:", err);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  // ===========================
  // Playlists
  // ===========================
  const savePlaylists = (newItems) => {
    setPlaylistsData({ items: newItems });
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist = {
      id: generateUUID(),
      name: newPlaylistName.trim(),
      tracks: [],
    };
    savePlaylists([...playlists, newPlaylist]);
    setNewPlaylistName("");
    setSelectedPlaylistId(newPlaylist.id);
  };

  const deletePlaylist = (id) => {
    if (!confirm("Удалить плейлист?")) return;
    savePlaylists(playlists.filter((p) => p.id !== id));
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
  };

  const addTrack = (playlistId, trackUrl) => {
    savePlaylists(
      playlists.map((p) =>
        p.id === playlistId ? { ...p, tracks: [...p.tracks, trackUrl] } : p
      )
    );
  };

  const removeTrack = (playlistId, trackUrl) => {
    savePlaylists(
      playlists.map((p) =>
        p.id === playlistId
          ? { ...p, tracks: p.tracks.filter((t) => t !== trackUrl) }
          : p
      )
    );
  };

  // ===========================
  // Music playback
  // ===========================
  const updateMusic = (newData) => {
    setScene((prev) => ({
      ...prev,
      sounds: (prev.sounds || []).map((s) =>
        s.id === "music" ? { ...s, ...newData } : s
      ),
    }));
  };

  const playPlaylist = (playlist) => {
    setScene((prev) => ({
      ...prev,
      sounds: [
        ...(prev.sounds || []).filter((s) => s.id !== "music"),
        {
          id: "music",
          src: [...playlist.tracks],
          loop: true,
          play: Date.now(),
          volume: music?.volume ?? 1,
        },
      ],
    }));
  };

  const stopMusic = () => {
    setScene((prev) => ({
      ...prev,
      sounds: (prev.sounds || []).filter((s) => s.id !== "music"),
    }));
  };

  const pauseMusic = () => {
    if (!music?.play) return;
    updateMusic({ pausedAt: Date.now() - music.play, play: false });
  };

  const resumeMusic = () => {
    if (!music || music.play) return;
    updateMusic({ play: Date.now() - (music.pausedAt || 0), pausedAt: undefined });
  };

  const getCurrentTrackInfo = () => {
    if (!music?.src) return null;
    const srcs = Array.isArray(music.src) ? music.src : [music.src];
    const durations = srcs.map((url) => tracks[url] || 0);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    if (totalDuration === 0) return { index: 0, total: srcs.length, url: srcs[0] };

    const elapsedMs = music.play ? now - music.play : (music.pausedAt ?? 0);
    let offset = (elapsedMs / 1000) % totalDuration;
    let trackIndex = 0;
    while (offset >= durations[trackIndex] && trackIndex < durations.length - 1) {
      offset -= durations[trackIndex];
      trackIndex++;
    }
    return { index: trackIndex, total: srcs.length, url: srcs[trackIndex] };
  };

  const nextTrack = () => {
    if (!music?.src) return;
    const srcs = Array.isArray(music.src) ? music.src : [music.src];
    const durations = srcs.map((url) => tracks[url] || 0);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    if (totalDuration === 0) return;

    const elapsedMs = music.play ? Date.now() - music.play : (music.pausedAt ?? 0);
    let offset = (elapsedMs / 1000) % totalDuration;
    let trackIndex = 0;
    while (
      offset >= durations[trackIndex] &&
      trackIndex < durations.length - 1
    ) {
      offset -= durations[trackIndex];
      trackIndex++;
    }

    const nextIndex = (trackIndex + 1) % srcs.length;
    const sumToNext = durations.slice(0, nextIndex).reduce((a, b) => a + b, 0);
    if (music.play) {
      updateMusic({ play: Date.now() - sumToNext * 1000 });
    } else {
      updateMusic({ pausedAt: sumToNext * 1000 });
    }
  };

  const shuffle = () => {
    if (!music) return;
    const srcs = Array.isArray(music.src) ? music.src : [music.src];
    const shuffled = [...srcs].sort(() => Math.random() - 0.5);
    updateMusic({ src: shuffled, play: Date.now() });
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
        `/upload/music?name=${encodeURIComponent(
          name.toLowerCase().replaceAll(" ", "-")
        )}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.url) await fetchTracks();
    } catch {
      alert("Ошибка при загрузке");
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handleDelete = async (url) => {
    if (!confirm("Удалить трек?")) return;
    const filename = url.split("/").pop();
    await fetch(`/upload/music/${filename}`, { method: "DELETE" });
    setTracks((prev) => {
      const n = { ...prev };
      delete n[url];
      return n;
    });
    savePlaylists(
      playlists.map((p) => ({ ...p, tracks: p.tracks.filter((t) => t !== url) }))
    );
  };

  // ===========================
  // Helpers
  // ===========================
  const getNameFromUrl = (url) => {
    const base = url.split("/").pop().split(".")[0].replaceAll("-", " ");
    return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ===========================
  // Render
  // ===========================
  return (
    <div className="text-center space-y-6 overflow-x-hidden">
      <h2 className="text-2xl font-semibold mb-2">Музыка</h2>

      {/* Активная музыка */}
      {music && (() => {
        const trackInfo = getCurrentTrackInfo();
        const isPlaying = !!music.play;
        return (
        <div className="mx-auto max-w-2xl p-4 bg-white/15 rounded-xl border border-white/30 text-left space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-medium text-white/90">
                {isPlaying ? "▶ Играет" : "⏸ Пауза"}
              </span>
              {trackInfo && (
                <p className="text-xs text-white/60 mt-0.5">
                  {trackInfo.index + 1} / {trackInfo.total} — {getNameFromUrl(trackInfo.url)}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isPlaying ? (
                <button
                  onClick={pauseMusic}
                  className="px-3 py-1 bg-yellow-600/70 hover:bg-yellow-600 rounded text-sm"
                >
                  ⏸ Пауза
                </button>
              ) : (
                <button
                  onClick={resumeMusic}
                  className="px-3 py-1 bg-green-600/70 hover:bg-green-600 rounded text-sm"
                >
                  ▶ Продолжить
                </button>
              )}
              <button
                onClick={nextTrack}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
              >
                ⏭ След. трек
              </button>
              <button
                onClick={shuffle}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
              >
                🔀 Shuffle
              </button>
              <button
                onClick={stopMusic}
                className="px-3 py-1 bg-red-600/70 hover:bg-red-600 rounded text-sm"
              >
                ⏹ Стоп
              </button>
            </div>
          </div>
          <div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={music.volume ?? 1}
              onChange={(e) => updateMusic({ volume: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-white/60 text-center">
              Громкость: {((music.volume ?? 1) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        )
      })()}

      {/* Двухколоночный layout */}
      <div className="flex gap-6 text-left">
        {/* Плейлисты */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <h3 className="text-lg font-medium text-white/90">Плейлисты</h3>
          <div className="flex gap-2">
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
              placeholder="Название..."
              className="flex-1 px-2 py-1 bg-white/10 rounded text-sm text-white placeholder-white/40 border border-white/20 outline-none"
            />
            <button
              onClick={createPlaylist}
              className="px-3 py-1 bg-green-600/70 hover:bg-green-600 rounded text-sm"
            >
              +
            </button>
          </div>
          <div className="space-y-1">
            {playlists.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                  selectedPlaylistId === p.id
                    ? "bg-white/25 border border-white/40"
                    : "bg-white/10 hover:bg-white/15 border border-white/10"
                }`}
              >
                <span
                  onClick={() => setSelectedPlaylistId(p.id)}
                  className="flex-1 text-sm font-medium truncate cursor-pointer"
                >
                  {p.name}
                </span>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => playPlaylist(p)}
                    className="text-xs px-2 py-0.5 bg-green-600/70 hover:bg-green-600 rounded"
                    title="Запустить"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => deletePlaylist(p.id)}
                    className="text-xs text-white/50 hover:text-red-400 px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {playlists.length === 0 && (
              <p className="text-sm text-white/40">Нет плейлистов</p>
            )}
          </div>
        </div>

        {/* Правая колонка */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Треки выбранного плейлиста */}
          {selectedPlaylist && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white/90">
                Треки: {selectedPlaylist.name}
              </h3>
              {selectedPlaylist.tracks.length === 0 ? (
                <p className="text-sm text-white/40">
                  Нет треков — добавь из библиотеки
                </p>
              ) : (
                <div className="space-y-1">
                  {selectedPlaylist.tracks.map((url, i) => (
                    <div
                      key={url}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg"
                    >
                      <span className="text-white/40 text-xs w-5">{i + 1}</span>
                      <span className="flex-1 text-sm truncate">
                        {getNameFromUrl(url)}
                      </span>
                      <span className="text-xs text-white/50">
                        {formatDuration(tracks[url] || 0)}
                      </span>
                      <button
                        onClick={() => removeTrack(selectedPlaylist.id, url)}
                        className="text-xs text-white/40 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Библиотека треков */}
          <div>
            <h3 className="text-lg font-medium text-white/90 mb-2">
              Библиотека треков
            </h3>

            {/* Upload zone */}
            <div
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) uploadFile(f);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onClick={() => document.getElementById("music-file-input").click()}
              className={`relative p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition mb-3 ${
                isDragging
                  ? "border-white/80 bg-white/10"
                  : "border-white/30 hover:border-white/50 bg-white/5"
              }`}
            >
              <input
                id="music-file-input"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                }}
              />
              {isUploading ? (
                <span className="text-white/70">Загрузка...</span>
              ) : (
                <span className="text-white/70">
                  🎵 Перетащи трек или нажми
                </span>
              )}
            </div>

            {/* Track list */}
            <div className="space-y-1">
              {Object.entries(tracks).map(([url, duration]) => {
                const inPlaylist = selectedPlaylist?.tracks.includes(url);
                return (
                  <div
                    key={url}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg"
                  >
                    <span className="flex-1 text-sm truncate">
                      {getNameFromUrl(url)}
                    </span>
                    <span className="text-xs text-white/50">
                      {formatDuration(duration)}
                    </span>
                    {selectedPlaylist && !inPlaylist && (
                      <button
                        onClick={() => addTrack(selectedPlaylist.id, url)}
                        className="text-xs px-2 py-0.5 bg-blue-600/70 hover:bg-blue-600 rounded whitespace-nowrap"
                      >
                        + В плейлист
                      </button>
                    )}
                    {selectedPlaylist && inPlaylist && (
                      <span className="text-xs text-white/40">✓ добавлен</span>
                    )}
                    <button
                      onClick={() => handleDelete(url)}
                      className="text-xs text-white/40 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {Object.keys(tracks).length === 0 && (
                <p className="text-sm text-white/40">
                  Нет загруженных треков
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
