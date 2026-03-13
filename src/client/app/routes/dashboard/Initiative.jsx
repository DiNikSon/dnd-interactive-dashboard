import { useState } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Initiative() {
  const { scene, setScene } = useOutletContext();

  const [initiativeData, setInitiativeData, charsData, , notifications, setNotifications] =
    useLPSync("/sync/subscribe/", "/sync/set/", ["initiative", "characters", "notifications"]);

  const participants = initiativeData?.participants || [];
  const currentTurnId = initiativeData?.currentTurnId || null;
  const inCombat = initiativeData?.inCombat || false;
  const round = initiativeData?.round || 1;
  const characters = charsData?.list || [];

  // ===========================
  // Форма добавления
  // ===========================
  const [form, setForm] = useState({ name: "", bonus: 0, count: 1, isEnemy: true });

  const saveInitiative = (patch) =>
    setInitiativeData((prev) => ({ ...prev, ...patch }));

  // Enabled player characters not yet in participants
  const availableChars = characters.filter(
    (c) => c.enabled !== false && !participants.some((p) => p.characterId === c.id)
  );

  const addFromForm = () => {
    if (!form.name.trim()) return;
    const count = Math.max(1, Number(form.count));
    const bonus = Number(form.bonus);
    const isEnemy = form.isEnemy;
    const newOnes = [];
    // Enemy numbers: find current max
    let maxNum = participants.filter((p) => p.type === "enemy").reduce((m, p) => Math.max(m, p.enemyNumber || 0), 0);

    for (let i = 0; i < count; i++) {
      maxNum++;
      newOnes.push({
        id: crypto.randomUUID(),
        name: form.name.trim(),
        initiativeBonus: bonus,
        initiative: 10 + bonus,
        type: isEnemy ? "enemy" : "ally",
        characterId: null,
        color: null,
        inBattle: true,
        able: true,
        enemyNumber: isEnemy ? maxNum : null,
      });
    }
    saveInitiative({ participants: [...participants, ...newOnes] });
    setForm({ name: "", bonus: 0, count: 1, isEnemy: true });
  };

  const addPlayerChar = (char) => {
    saveInitiative({
      participants: [
        ...participants,
        {
          id: crypto.randomUUID(),
          name: char.name,
          initiativeBonus: char.initiative,
          initiative: 10 + char.initiative,
          type: "player",
          characterId: char.id,
          color: char.color,
          inBattle: true,
          able: true,
          enemyNumber: null,
        },
      ],
    });
  };

  const removeParticipant = (id) => {
    const newList = participants.filter((p) => p.id !== id);
    const newCurrentId = currentTurnId === id ? null : currentTurnId;
    saveInitiative({ participants: newList, currentTurnId: newCurrentId });
  };

  const toggleAble = (id) => {
    saveInitiative({
      participants: participants.map((p) =>
        p.id === id ? { ...p, able: p.able === false ? true : false } : p
      ),
    });
  };

  const updateInitiative = (id, value) => {
    saveInitiative({
      participants: participants.map((p) =>
        p.id === id ? { ...p, initiative: Number(value) } : p
      ),
    });
  };

  const rollAll = () => {
    saveInitiative({
      participants: participants.map((p) => ({
        ...p,
        initiative: Math.floor(Math.random() * 20) + 1 + p.initiativeBonus,
      })),
    });
  };

  const rollOne = (id, bonus) => {
    saveInitiative({
      participants: participants.map((p) =>
        p.id === id
          ? { ...p, initiative: Math.floor(Math.random() * 20) + 1 + bonus }
          : p
      ),
    });
  };

  const sortedParticipants = [...participants].sort(
    (a, b) => b.initiative - a.initiative
  );

  // ===========================
  // Combat flow
  // ===========================
  const sendTurnNotifications = (participant, roundNum) => {
    const title = `Ход: ${participant.name}`;
    const text = `Раунд ${roundNum}`;
    const now = Date.now();

    setNotifications((prev) => {
      const newNotifs = { ...prev };
      // Scene notification — 2s, not closable
      newNotifs.scene = { id: crypto.randomUUID(), title, text, timer: 2, createdAt: now };
      // Player notification — 5s, closable
      if (participant.type === "player" && participant.characterId) {
        newNotifs.players = {
          ...(prev.players || {}),
          [participant.characterId]: { id: crypto.randomUUID(), title, text, timer: 5, createdAt: now },
        };
      }
      return newNotifs;
    });
  };

  const ableParticipants = sortedParticipants.filter((p) => p.able !== false);

  const startCombat = () => {
    if (ableParticipants.length === 0) return;
    const first = ableParticipants[0];
    saveInitiative({ inCombat: true, currentTurnId: first.id, round: 1 });
    setScene((prev) => ({ ...prev, initiativeActive: true }));
    sendTurnNotifications(first, 1);
  };

  const nextTurn = () => {
    if (!inCombat || ableParticipants.length === 0) return;
    // Find position of current in the full sorted list, then scan forward for next able
    const fullIdx = sortedParticipants.findIndex((p) => p.id === currentTurnId);
    let newRound = round;
    let next = null;
    // Search forward from fullIdx+1, wrapping around
    for (let i = 1; i <= sortedParticipants.length; i++) {
      const candidate = sortedParticipants[(fullIdx + i) % sortedParticipants.length];
      if (candidate.able !== false) {
        if (fullIdx + i >= sortedParticipants.length) newRound = round + 1;
        next = candidate;
        break;
      }
    }
    if (!next) return;
    saveInitiative({ currentTurnId: next.id, round: newRound });
    sendTurnNotifications(next, newRound);
  };

  const endCombat = () => {
    saveInitiative({ inCombat: false, currentTurnId: null, round: 1 });
    setScene((prev) => ({ ...prev, initiativeActive: false }));
  };

  const resetTracker = () => {
    if (!confirm("Очистить трекер инициативы?")) return;
    saveInitiative({ participants: [], currentTurnId: null, inCombat: false, round: 1 });
    setScene((prev) => ({ ...prev, initiativeActive: false }));
  };

  // ===========================
  // Render helpers
  // ===========================
  const Avatar = ({ p }) => {
    const bg =
      p.type === "enemy"
        ? "#ef4444"
        : p.type === "ally"
        ? "#22c55e"
        : p.color || "#6366f1";
    const label = p.type === "enemy" ? String(p.enemyNumber || "") : getInitials(p.name);
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: bg }}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Трекер инициативы</h2>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!scene?.initiativeActive}
              onChange={(e) => setScene((prev) => ({ ...prev, initiativeActive: e.target.checked }))}
              className="w-4 h-4 accent-yellow-400"
            />
            <span className="text-white/70">На сцене</span>
          </label>
        </div>
        <div className="flex gap-2">
          {inCombat ? (
            <>
              <span className="text-white/60 text-sm self-center">Раунд {round}</span>
              <button
                onClick={nextTurn}
                className="px-4 py-2 bg-blue-600/70 hover:bg-blue-600 rounded-lg text-sm"
              >
                Следующий ход →
              </button>
              <button
                onClick={endCombat}
                className="px-4 py-2 bg-red-600/70 hover:bg-red-600 rounded-lg text-sm"
              >
                Завершить бой
              </button>
            </>
          ) : (
            <>
              <button
                onClick={rollAll}
                disabled={participants.length === 0}
                className="px-4 py-2 bg-yellow-600/70 hover:bg-yellow-600 rounded-lg text-sm disabled:opacity-40"
              >
                🎲 Бросить всем
              </button>
              <button
                onClick={startCombat}
                disabled={participants.length === 0}
                className="px-4 py-2 bg-green-600/70 hover:bg-green-600 rounded-lg text-sm disabled:opacity-40"
              >
                ⚔️ Начать бой
              </button>
              <button
                onClick={resetTracker}
                disabled={participants.length === 0}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm disabled:opacity-40"
                title="Очистить трекер"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-6">
        {/* ===========================
            Список участников
        =========================== */}
        <div className="space-y-2">
          {sortedParticipants.length === 0 && (
            <p className="text-white/40 text-sm">Нет участников — добавь игроков и врагов</p>
          )}
          {sortedParticipants.map((p) => {
            const isCurrent = p.id === currentTurnId;
            const isAble = p.able !== false;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition ${
                  !isAble
                    ? "opacity-40 bg-white/5 border-white/5"
                    : isCurrent
                    ? "bg-yellow-500/20 border-yellow-400/50"
                    : "bg-white/8 border-white/10"
                }`}
              >
                {isCurrent && <span className="text-yellow-400 text-sm">▶</span>}
                <Avatar p={p} />

                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">
                    {p.type === "enemy" ? `${p.name} №${p.enemyNumber}` : p.name}
                  </span>
                  <span className="text-white/40 text-xs ml-2">
                    {p.type === "player" ? "игрок" : p.type === "ally" ? "союзник" : "враг"}
                    {p.initiativeBonus !== 0 && ` (${p.initiativeBonus > 0 ? "+" : ""}${p.initiativeBonus})`}
                  </span>
                </div>

                {/* Initiative input */}
                <input
                  type="number"
                  value={p.initiative}
                  disabled={inCombat}
                  onChange={(e) => updateInitiative(p.id, e.target.value)}
                  className="w-14 px-2 py-1 bg-white/10 rounded border border-white/20 text-sm text-center outline-none disabled:opacity-50"
                />

                <label className="flex items-center gap-1 text-xs cursor-pointer" title="Дееспособен">
                  <input
                    type="checkbox"
                    checked={isAble}
                    onChange={() => toggleAble(p.id)}
                    className="w-3.5 h-3.5 accent-green-400"
                  />
                </label>

                {!inCombat && (
                  <>
                    <button
                      onClick={() => rollOne(p.id, p.initiativeBonus)}
                      className="text-xs px-2 py-1 bg-yellow-600/50 hover:bg-yellow-600/80 rounded"
                      title="Бросить кубик"
                    >
                      🎲
                    </button>
                    <button
                      onClick={() => removeParticipant(p.id)}
                      className="text-xs px-2 py-1 bg-white/10 hover:text-red-400 rounded"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ===========================
            Панель добавления
        =========================== */}
        {!inCombat && (
          <div className="space-y-4 w-64">
            {/* Добавить персонажей игроков */}
            {availableChars.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/70">Игроки</h3>
                {availableChars.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => addPlayerChar(char)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white/8 hover:bg-white/15 rounded-lg text-sm text-left"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: char.color }}
                    />
                    <span className="flex-1 truncate">{char.name}</span>
                    <span className="text-white/40 text-xs">+{char.initiative}</span>
                    <span className="text-white/40 text-xs">+</span>
                  </button>
                ))}
              </div>
            )}

            {/* Добавить вручную (враг/союзник) */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">Добавить</h3>
              <input
                placeholder="Имя"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addFromForm()}
                className="w-full px-3 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-white/50 block mb-1">Бонус</label>
                  <input
                    type="number"
                    value={form.bonus}
                    onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/50 block mb-1">Кол-во</label>
                  <input
                    type="number"
                    min="1"
                    value={form.count}
                    onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isEnemy}
                  onChange={(e) => setForm((f) => ({ ...f, isEnemy: e.target.checked }))}
                  className="w-4 h-4 accent-red-500"
                />
                <span className={form.isEnemy ? "text-red-400" : "text-green-400"}>
                  {form.isEnemy ? "Враг" : "Союзник"}
                </span>
              </label>
              <button
                onClick={addFromForm}
                disabled={!form.name.trim()}
                className="w-full px-3 py-1.5 bg-blue-600/70 hover:bg-blue-600 rounded text-sm disabled:opacity-40"
              >
                + Добавить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
