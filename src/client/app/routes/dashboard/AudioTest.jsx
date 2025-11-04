import React, { useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";

export default function AudioTest() {
  const [play, setPlay] = useState(false);

  return (
    <div className="text-center text-white/80">
      <h2 className="text-2xl font-semibold mb-4">Другой инструмент</h2>
      <button onClick={() => setPlay(Date.now())}>▶ Play (sync)</button>
      <button onClick={() => setPlay(false)}>⏸ Stop</button>

      <AudioPlayer
        play={play}
        loop={true}
        src="https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3"
      />
    </div>
  );
}
