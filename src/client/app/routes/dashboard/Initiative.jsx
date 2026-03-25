import { useState } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";

function getInitials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function dexMod(dex) { return Math.floor((dex - 10) / 2); }

function rollDice(notation) {
  const match = String(notation).match(/^(\d+)[dд](\d+)([+-]\d+)?$/i);
  if (!match) return Math.max(1, parseInt(notation) || 1);
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const bonus = parseInt(match[3] || "0");
  let total = bonus;
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
  return Math.max(1, total);
}

export default function Initiative() {
  const { scene, setScene } = useOutletContext();

  const [
    initiativeData, setInitiativeData,
    charsData, ,
    notifications, setNotifications,
    monstersData, ,
    resourcesData, setResourcesData,
  ] = useLPSync("/sync/subscribe/", "/sync/set/", ["initiative", "characters", "notifications", "monsters", "resources"]);

  const participants = initiativeData?.participants || [];
  const currentTurnId = initiativeData?.currentTurnId || null;
  const inCombat = initiativeData?.inCombat || false;
  const round = initiativeData?.round || 1;
  const characters = charsData?.list || [];
  const monsters = monstersData?.items || [];
  const resources = resourcesData?.items || [];

  const [form, setForm] = useState({ name: "", bonus: 0, hp: "", ac: "", count: 1, isEnemy: true, hideName: false, hideHp: false });
  const [monsterSearch, setMonsterSearch] = useState("");

  const saveInitiative = (patch) =>
    setInitiativeData((prev) => ({ ...prev, ...patch }));

  const availableChars = characters.filter(
    (c) => c.enabled !== false && !participants.some((p) => p.characterId === c.id)
  );

  const getHpResource = (characterId) =>
    resources.find((r) => r.characterId === characterId && r.name === "Здоровье");

  const nextEnemyNum = () =>
    participants.filter((p) => p.type === "enemy").reduce((m, p) => Math.max(m, p.enemyNumber || 0), 0) + 1;
  const nextAllyNum = () =>
    participants.filter((p) => p.type === "ally").reduce((m, p) => Math.max(m, p.allyNumber || 0), 0) + 1;

  // ===========================
  // Добавление участников
  // ===========================
  const addFromForm = () => {
    if (!form.name.trim()) return;
    const count = Math.max(1, Number(form.count));
    const bonus = Number(form.bonus);
    const isEnemy = form.isEnemy;
    const hp = form.hp !== "" ? (parseInt(form.hp) || null) : null;
    const newOnes = [];
    let maxEnemyNum = participants.filter((p) => p.type === "enemy").reduce((m, p) => Math.max(m, p.enemyNumber || 0), 0);
    let maxAllyNum = participants.filter((p) => p.type === "ally").reduce((m, p) => Math.max(m, p.allyNumber || 0), 0);

    const ac = form.ac !== "" ? parseInt(form.ac) || null : null;
    for (let i = 0; i < count; i++) {
      newOnes.push({
        id: generateUUID(),
        name: form.name.trim(),
        initiativeBonus: bonus,
        initiative: 10 + bonus,
        type: isEnemy ? "enemy" : "ally",
        characterId: null,
        color: null,
        inBattle: true,
        able: true,
        enemyNumber: isEnemy ? ++maxEnemyNum : null,
        allyNumber: !isEnemy ? ++maxAllyNum : null,
        hideName: form.hideName,
        hideHp: form.hideHp,
        hp,
        maxHp: hp,
        ac,
      });
    }
    saveInitiative({ participants: [...participants, ...newOnes] });
    setForm({ name: "", bonus: 0, hp: "", ac: "", count: 1, isEnemy: true, hideName: false, hideHp: false });
  };

  const addFromMonster = (monster) => {
    const bonus = dexMod(monster.dex || 10);
    const maxHp = rollDice(monster.hp || "1");
    saveInitiative({
      participants: [...participants, {
        id: generateUUID(),
        name: monster.name,
        initiativeBonus: bonus,
        initiative: 10 + bonus,
        type: "enemy",
        characterId: null,
        monsterId: monster.id,
        color: null,
        inBattle: true,
        able: true,
        enemyNumber: nextEnemyNum(),
        allyNumber: null,
        hideName: form.hideName,
        hideHp: form.hideHp,
        hp: maxHp,
        maxHp,
        ac: monster.ac || null,
      }],
    });
  };

  const addPlayerChar = (char) => {
    const hpRes = getHpResource(char.id);
    if (!hpRes) {
      const input = window.prompt(`Максимальное здоровье для ${char.name}:`);
      if (input === null) return;
      const maxHp = parseInt(input) || 0;
      setResourcesData({
        items: [...resources, {
          id: generateUUID(),
          characterId: char.id,
          name: "Здоровье",
          group: "",
          type: "numerical",
          value: maxHp,
          max: maxHp,
          recovery: [{ type: "long_rest", amount: "1000" }],
          hidden: false,
        }],
      });
    }
    saveInitiative({
      participants: [...participants, {
        id: generateUUID(),
        name: char.name,
        initiativeBonus: char.initiative,
        initiative: 10 + char.initiative,
        type: "player",
        characterId: char.id,
        color: char.color,
        inBattle: true,
        able: true,
        enemyNumber: null,
        allyNumber: null,
        hideName: false,
        hideHp: false,
        hp: null,
        maxHp: null,
        ac: char.ac || null,
      }],
    });
  };

  const removeParticipant = (id) => {
    const newList = participants.filter((p) => p.id !== id);
    const newCurrentId = currentTurnId === id ? null : currentTurnId;
    saveInitiative({ participants: newList, currentTurnId: newCurrentId });
  };

  const toggleAble = (id) => {
    saveInitiative({
      participants: participants.map((p) => p.id === id ? { ...p, able: !p.able } : p),
    });
  };

  const toggleFlag = (id, flag) => {
    saveInitiative({
      participants: participants.map((p) => p.id === id ? { ...p, [flag]: !p[flag] } : p),
    });
  };

  const updateInitiative = (id, value) => {
    saveInitiative({
      participants: participants.map((p) => p.id === id ? { ...p, initiative: Number(value) } : p),
    });
  };

  const changeHp = (id, delta) => {
    const p = participants.find((x) => x.id === id);
    if (!p) return;
    if (p.type === "player" && p.characterId) {
      const hpRes = getHpResource(p.characterId);
      if (hpRes) {
        setResourcesData({ items: resources.map((r) => r.id === hpRes.id ? { ...r, value: r.value + delta } : r) });
      }
    } else {
      saveInitiative({
        participants: participants.map((x) => x.id === id ? { ...x, hp: (x.hp ?? 0) + delta } : x),
      });
    }
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
        p.id === id ? { ...p, initiative: Math.floor(Math.random() * 20) + 1 + bonus } : p
      ),
    });
  };

  const sortedParticipants = [...participants].sort((a, b) => b.initiative - a.initiative);

  // ===========================
  // Combat flow
  // ===========================
  const sceneDisplayName = (p) => {
    if (p.hideName) {
      if (p.type === "enemy") return `Враг №${p.enemyNumber}`;
      if (p.type === "ally") return `Союзник №${p.allyNumber}`;
    }
    if (p.type === "enemy") return `${p.name} №${p.enemyNumber}`;
    return p.name;
  };

  const sendTurnNotifications = (p, roundNum) => {
    const title = `Ход: ${sceneDisplayName(p)}`;
    const text = `Раунд ${roundNum}`;
    const now = Date.now();
    const newNotifs = { ...notifications };
    newNotifs.scene = [...(notifications?.scene || []), { id: generateUUID(), title, text, timer: 2, createdAt: now }];
    if (p.type === "player" && p.characterId) {
      newNotifs.players = [...(notifications?.players || []), {
        id: generateUUID(), characterId: p.characterId, title, text, timer: 5, createdAt: now,
      }];
    }
    setNotifications(newNotifs);
  };

  const ableParticipants = sortedParticipants.filter((p) => p.able !== false);

  const startCombat = () => {
    if (ableParticipants.length === 0) return;
    const first = ableParticipants[0];
    saveInitiative({ inCombat: true, currentTurnId: first.id, round: 1 });
    setScene((prev) => ({ ...prev, active: "initiative" }));
    sendTurnNotifications(first, 1);
  };

  const nextTurn = () => {
    if (!inCombat || ableParticipants.length === 0) return;
    const fullIdx = sortedParticipants.findIndex((p) => p.id === currentTurnId);
    let newRound = round;
    let next = null;
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
    setScene((prev) => ({ ...prev, active: null }));
  };

  const resetTracker = () => {
    if (!confirm("Очистить трекер инициативы?")) return;
    saveInitiative({ participants: [], currentTurnId: null, inCombat: false, round: 1 });
    setScene((prev) => ({ ...prev, active: null }));
  };

  // ===========================
  // Render helpers
  // ===========================
  const Avatar = ({ p }) => {
    const bg = p.type === "enemy" ? "#c2410c" : p.type === "ally" ? "#22c55e" : p.color || "#6366f1";
    const label = p.type === "enemy"
      ? String(p.enemyNumber || "")
      : p.type === "ally"
      ? String(p.allyNumber || "")
      : getInitials(p.name);
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: bg }}>
        {label}
      </div>
    );
  };

  const HpDisplay = ({ p }) => {
    let current, max;
    if (p.type === "player" && p.characterId) {
      const hpRes = getHpResource(p.characterId);
      current = hpRes?.value;
      max = hpRes?.max;
    } else {
      current = p.hp;
      max = p.maxHp;
    }
    if (current == null && max == null) return null;
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => changeHp(p.id, -1)}
          className="w-5 h-5 rounded bg-red-800/60 hover:bg-red-700/80 text-white text-xs leading-none flex items-center justify-center"
        >−</button>
        <span className="text-xs text-white/70 min-w-[3rem] text-center">
          {current ?? "?"}/{max ?? "?"}
        </span>
        <button
          onClick={() => changeHp(p.id, 1)}
          className="w-5 h-5 rounded bg-green-800/60 hover:bg-green-700/80 text-white text-xs leading-none flex items-center justify-center"
        >+</button>
      </div>
    );
  };

  const filteredMonsters = monsters.filter((m) =>
    m.name?.toLowerCase().includes(monsterSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Трекер инициативы</h2>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={scene?.active === "initiative"}
              onChange={(e) => setScene((prev) => ({ ...prev, active: e.target.checked ? "initiative" : null }))}
              className="w-4 h-4 accent-yellow-400"
            />
            <span className="text-white/70">На сцене</span>
          </label>
        </div>
        <div className="flex gap-2">
          {inCombat ? (
            <>
              <span className="text-white/60 text-sm self-center">Раунд {round}</span>
              <button onClick={nextTurn} className="px-4 py-2 bg-blue-600/70 hover:bg-blue-600 rounded-lg text-sm">
                Следующий ход →
              </button>
              <button onClick={endCombat} className="px-4 py-2 bg-red-600/70 hover:bg-red-600 rounded-lg text-sm">
                Завершить бой
              </button>
            </>
          ) : (
            <>
              <button onClick={rollAll} disabled={participants.length === 0} className="px-4 py-2 bg-yellow-600/70 hover:bg-yellow-600 rounded-lg text-sm disabled:opacity-40">
                🎲 Бросить всем
              </button>
              <button onClick={startCombat} disabled={participants.length === 0} className="px-4 py-2 bg-green-600/70 hover:bg-green-600 rounded-lg text-sm disabled:opacity-40">
                ⚔️ Начать бой
              </button>
              <button onClick={resetTracker} disabled={participants.length === 0} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm disabled:opacity-40" title="Очистить трекер">
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
            const dashboardName = p.type === "enemy"
              ? `${p.name} №${p.enemyNumber}`
              : p.type === "ally" && p.allyNumber
              ? `${p.name} №${p.allyNumber}`
              : p.name;
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
                  <span className="font-medium text-sm">{dashboardName}</span>
                  {p.hideName && <span className="ml-1 text-orange-400/70 text-xs" title="Имя скрыто на сцене">👁</span>}
                  <span className="text-white/40 text-xs ml-2">
                    {p.type === "player" ? "игрок" : p.type === "ally" ? "союзник" : "враг"}
                    {p.initiativeBonus !== 0 && ` (${p.initiativeBonus > 0 ? "+" : ""}${p.initiativeBonus})`}
                  </span>
                </div>

                <HpDisplay p={p} />

                {p.ac != null && (
                  <span className="text-xs text-white/50 flex-shrink-0" title="Класс брони">🛡{p.ac}</span>
                )}

                {/* Кнопки скрытия */}
                <div className="flex gap-1 flex-shrink-0">
                  {p.type !== "player" && (
                    <button
                      onClick={() => toggleFlag(p.id, "hideName")}
                      title={p.hideName ? "Показать имя" : "Скрыть имя"}
                      className={`text-xs px-1.5 py-1 rounded transition ${p.hideName ? "bg-orange-600/60 text-white" : "bg-white/10 text-white/40 hover:text-white/70"}`}
                    >👁</button>
                  )}
                  <button
                    onClick={() => toggleFlag(p.id, "hideHp")}
                    title={p.hideHp ? "Показать ХП" : "Скрыть ХП"}
                    className={`text-xs px-1.5 py-1 rounded transition ${p.hideHp ? "bg-orange-600/60 text-white" : "bg-white/10 text-white/40 hover:text-white/70"}`}
                  >❤</button>
                </div>

                <input
                  type="number"
                  value={p.initiative}
                  onChange={(e) => updateInitiative(p.id, e.target.value)}
                  className="w-14 px-2 py-1 bg-white/10 rounded border border-white/20 text-sm text-center outline-none"
                />

                <label className="flex items-center gap-1 text-xs cursor-pointer" title="Дееспособен">
                  <input type="checkbox" checked={isAble} onChange={() => toggleAble(p.id)} className="w-3.5 h-3.5 accent-green-400" />
                </label>

                <button onClick={() => rollOne(p.id, p.initiativeBonus)} className="text-xs px-2 py-1 bg-yellow-600/50 hover:bg-yellow-600/80 rounded" title="Бросить кубик">🎲</button>
                <button onClick={() => removeParticipant(p.id)} className="text-xs px-2 py-1 bg-white/10 hover:text-red-400 rounded">✕</button>
              </div>
            );
          })}
        </div>

        {/* ===========================
            Панель добавления
        =========================== */}
        <div className="space-y-4 w-64">
            {/* Игроки */}
            {availableChars.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/70">Игроки</h3>
                {availableChars.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => addPlayerChar(char)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white/8 hover:bg-white/15 rounded-lg text-sm text-left"
                  >
                    <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
                    <span className="flex-1 truncate">{char.name}</span>
                    <span className="text-white/40 text-xs">+{char.initiative}</span>
                    <span className="text-white/40 text-xs">+</span>
                  </button>
                ))}
              </div>
            )}

            {/* Общие флаги для монстров и ручного добавления */}
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer text-white/70">
                <input type="checkbox" checked={form.hideName} onChange={(e) => setForm((f) => ({ ...f, hideName: e.target.checked }))} className="w-3 h-3" />
                Скрыть имя
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer text-white/70">
                <input type="checkbox" checked={form.hideHp} onChange={(e) => setForm((f) => ({ ...f, hideHp: e.target.checked }))} className="w-3 h-3" />
                Скрыть ХП
              </label>
            </div>

            {/* Монстры из библиотеки */}
            {monsters.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/70">Монстры</h3>
                <input
                  placeholder="Поиск..."
                  value={monsterSearch}
                  onChange={(e) => setMonsterSearch(e.target.value)}
                  className="w-full px-2 py-1 bg-white/10 rounded border border-white/20 outline-none text-xs"
                />
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filteredMonsters.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addFromMonster(m)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 bg-white/8 hover:bg-white/15 rounded text-left"
                    >
                      <span className="flex-1 truncate text-xs">{m.name}</span>
                      <span className="text-white/30 text-xs">
                        {dexMod(m.dex || 10) >= 0 ? "+" : ""}{dexMod(m.dex || 10)} / {m.hp}
                      </span>
                      <span className="text-white/40 text-xs">+</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Добавить вручную */}
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
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-white/50 block mb-1">Здоровье</label>
                  <input
                    type="number"
                    placeholder="нет ХП"
                    value={form.hp}
                    onChange={(e) => setForm((f) => ({ ...f, hp: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-white/10 rounded border border-white/20 outline-none text-sm"
                  />
                </div>
                <div className="w-20">
                  <label className="text-xs text-white/50 block mb-1">КБ</label>
                  <input
                    type="number"
                    placeholder="—"
                    value={form.ac}
                    onChange={(e) => setForm((f) => ({ ...f, ac: e.target.value }))}
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
      </div>
    </div>
  );
}
