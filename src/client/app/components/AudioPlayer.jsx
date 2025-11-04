import React, { useEffect, useRef, useState } from "react";

/**
 * @param {Object} props
 * @param {false|number} props.play — timestamp, с которого идёт воспроизведение, или false, если не играет
 * @param {boolean} [props.loop=false] — зацикливать ли весь список
 * @param {string|string[]} props.src — один трек или массив треков
 * @param {number|number[]|null} [props.volume=null] — громкость: null = не менять, number = одна громкость, массив = громкости по трекам
 */
export function AudioPlayer({ play, loop = false, src, volume = null }) {
  const audioRef = useRef(null);
  const [durations, setDurations] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const sources = Array.isArray(src) ? src : [src];

  // Предзагрузка длительностей треков
  useEffect(() => {
    let isMounted = true;

    const loadDurations = async () => {
      const promises = sources.map(
        (url) =>
          new Promise((resolve) => {
            const a = new Audio();
            a.src = url;
            const onMeta = () => {
              a.removeEventListener("loadedmetadata", onMeta);
              resolve(isFinite(a.duration) ? a.duration : 0);
            };
            a.addEventListener("loadedmetadata", onMeta);
            a.addEventListener("error", () => resolve(0));
          })
      );
      const results = await Promise.all(promises);
      if (isMounted) setDurations(results);
    };

    loadDurations();
    return () => {
      isMounted = false;
    };
  }, [src]);

  // Основное воспроизведение
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !durations.length) return;

    audio.loop = false;

    if (play === false) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const elapsed = (Date.now() - play) / 1000;

    if (!loop && elapsed >= totalDuration) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    // Определяем трек и смещение
    let offset = elapsed % totalDuration;
    let trackIndex = 0;
    while (offset >= durations[trackIndex] && trackIndex < durations.length - 1) {
      offset -= durations[trackIndex];
      trackIndex++;
    }

    setCurrentTrackIndex(trackIndex);

    const startPlayback = async (index, timeOffset) => {
      try {
        audio.src = sources[index];

        await new Promise((resolve) => {
          if (isFinite(audio.duration) && audio.duration > 0) resolve(true);
          else {
            const onMeta = () => {
              audio.removeEventListener("loadedmetadata", onMeta);
              resolve(true);
            };
            audio.addEventListener("loadedmetadata", onMeta);
          }
        });

        const duration = isFinite(audio.duration) ? audio.duration : 0;
        const safeOffset = Math.max(0, Math.min(timeOffset, duration));
        audio.currentTime = safeOffset;

        await audio.play();
      } catch (err) {
        console.warn("Audio play failed:", err);
      }
    };

    startPlayback(trackIndex, offset);

    const handleEnded = async () => {
      let nextIndex = trackIndex + 1;
      if (nextIndex >= sources.length) {
        if (loop) nextIndex = 0;
        else return;
      }
      setCurrentTrackIndex(nextIndex);
      await startPlayback(nextIndex, 0);
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [play, loop, src, durations]);

  // 💡 Отдельный эффект для обновления громкости без перезапуска
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (volume == null) return;

    let v = 1;
    if (typeof volume === "number") {
      v = volume;
    } else if (Array.isArray(volume)) {
      v = volume[currentTrackIndex] ?? 1;
    }

    audio.volume = Math.max(0, Math.min(1, v));
  }, [volume, currentTrackIndex]);

  return <audio ref={audioRef} preload="auto" />;
}
