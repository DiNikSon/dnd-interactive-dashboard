import { useState, useEffect } from "react";
import useLPSync from "@/hooks/useLPSync";

export function meta() {
  return [
    { title: "Интерактор | DNDI" },
    { name: "description", content: "Интерактор игрока" },
  ];
}

function getOrCreateToken() {
  let token = localStorage.getItem("dndi_player_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("dndi_player_token", token);
  }
  return token;
}

export default function Interactor() {
  const [data] = useLPSync("/sync/subscribe/scene", "/sync/set/scene");
  const [charsData] = useLPSync("/sync/subscribe/characters", "/sync/set/characters");
  const characters = charsData?.list || [];

  const [token] = useState(() => getOrCreateToken());
  const [claiming, setClaiming] = useState(false);

  const myChar = characters.find((c) => c.playerId === token);
  const freeChars = characters.filter((c) => !c.playerId && c.enabled !== false);

  const claim = async (characterId) => {
    setClaiming(true);
    try {
      await fetch("/players/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, characterId }),
      });
    } catch (err) {
      console.error("Ошибка при выборе персонажа:", err);
    } finally {
      setClaiming(false);
    }
  };

  const release = async () => {
    await fetch("/players/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  };

  return (
    <div
      style={{ "--image-url": data.background ? `url(${data.background})` : "none" }}
      className="min-h-screen min-w-screen bg-[image:var(--image-url)] bg-cover bg-no-repeat"
    >
      <div className="min-h-screen min-w-screen backdrop-blur-xs flex items-center justify-center">
        {myChar ? (
          <PlayerView char={myChar} onRelease={release} />
        ) : (
          <CharacterSelect
            characters={freeChars}
            onClaim={claim}
            claiming={claiming}
          />
        )}
      </div>
    </div>
  );
}

function CharacterSelect({ characters, onClaim, claiming }) {
  return (
    <div className="bg-black/50 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 text-white text-center space-y-6">
      <h1 className="text-2xl font-semibold">Выбери персонажа</h1>

      {characters.length === 0 ? (
        <p className="text-white/50">
          Нет свободных персонажей. Подожди, пока ГМ добавит их.
        </p>
      ) : (
        <div className="space-y-2">
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => !claiming && onClaim(char.id)}
              disabled={claiming}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition disabled:opacity-50"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: char.color }}
              />
              <span className="font-medium">{char.name}</span>
              <span className="ml-auto text-white/50 text-sm">
                инициатива {char.initiative}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerView({ char, onRelease }) {
  return (
    <div className="bg-black/50 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 text-white text-center space-y-4">
      <div
        className="w-10 h-10 rounded-full mx-auto"
        style={{ backgroundColor: char.color }}
      />
      <h1 className="text-2xl font-semibold">{char.name}</h1>
      <p className="text-white/50 text-sm">инициатива: {char.initiative}</p>

      <button
        onClick={onRelease}
        className="mt-4 text-xs text-white/30 hover:text-white/60 transition"
      >
        Сменить персонажа
      </button>
    </div>
  );
}
