import React, { useEffect, useRef } from "react";

export function AudioPlayer({ play, loop = false, src }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = src;
    audio.loop = loop;

    // Если play === false — останавливаем
    if (play === false) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const offsetSeconds = (Date.now() - play) / 1000;

    const playAudio = async () => {
      try {
        // Ждём, пока будут загружены метаданные
        if (audio.readyState < 1) {
          await new Promise((resolve) => {
            const onLoaded = () => {
              audio.removeEventListener("loadedmetadata", onLoaded);
              resolve(true);
            };
            audio.addEventListener("loadedmetadata", onLoaded);
          });
        }

        const duration = audio.duration || Infinity;
        let startTime = offsetSeconds;
        console.log(offsetSeconds, duration)
        if (loop) {
          // Если звук зациклен — используем остаток от деления
          startTime = offsetSeconds % duration;
        } else if (offsetSeconds >= duration) {
          // Если не зациклен и уже прошло больше длительности — не играем
          audio.pause();
          audio.currentTime = duration;
          return;
        }

        audio.currentTime = startTime;
        await audio.play();
      } catch (err) {
        console.warn("Audio play failed:", err);
      }
    };

    playAudio();

    return () => {
      audio.pause();
    };
  }, [play, loop, src]);

  return <audio ref={audioRef} preload="auto" />;
}
