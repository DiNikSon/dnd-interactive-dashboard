import React, { useEffect, useRef, useState } from "react";

/**
 * @param {Object} props
 * @param {false|number} props.play — timestamp, с которого идёт воспроизведение, или false, если не играет
 * @param {boolean} [props.loop=false] — зацикливать ли весь список
 * @param {string|string[]} props.src — один трек или массив треков
 */
export function AudioPlayer({ play, loop = false, src }) {
  const audioRef = useRef(null);
  const [durations, setDurations] = useState([]);
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

  // Основная логика воспроизведения
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !durations.length) return;

    audio.loop = false; // мы сами управляем лупом

    // Если play === false — останавливаем
    if (play === false) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const elapsed = (Date.now() - play) / 1000;

    // Если всё уже проиграно и нет лупа — стоп
    if (!loop && elapsed >= totalDuration) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    // Определяем текущий трек и смещение в нём
    let offset = elapsed % totalDuration;
    let trackIndex = 0;
    while (offset >= durations[trackIndex] && trackIndex < durations.length - 1) {
      offset -= durations[trackIndex];
      trackIndex++;
    }

    const startPlayback = async (index, timeOffset) => {
      try {
        audio.src = sources[index];

        // Ждём загрузки метаданных
        await new Promise((resolve) => {
          if (isFinite(audio.duration) && audio.duration > 0) {
            resolve(true);
          } else {
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

    // Воспроизводим первый нужный трек
    startPlayback(trackIndex, offset);

    // Переход к следующему треку после окончания
    const handleEnded = async () => {
      trackIndex++;
      if (trackIndex >= sources.length) {
        if (loop) trackIndex = 0;
        else return; // конец
      }
      await startPlayback(trackIndex, 0);
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [play, loop, src, durations]);

  return <audio ref={audioRef} preload="auto" />;
}
