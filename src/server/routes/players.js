import { Router } from "express";
import { data, sessions, notifySubscribers, persistProject } from "./sync.js";

const router = Router();

// POST /players/claim — игрок занимает персонажа
router.post("/claim", (req, res) => {
  const { token, characterId } = req.body;
  if (!token || !characterId)
    return res.status(400).json({ error: "token and characterId required" });

  const list = data.characters?.list || [];
  const char = list.find((c) => c.id === characterId);
  if (!char) return res.status(404).json({ error: "Character not found" });
  if (char.playerId && char.playerId !== token)
    return res.status(409).json({ error: "Already claimed" });

  // Освобождаем предыдущего персонажа этого токена, занимаем нового
  data.characters = {
    list: list.map((c) => {
      if (c.playerId === token && c.id !== characterId)
        return { ...c, playerId: null };
      if (c.id === characterId) return { ...c, playerId: token };
      return c;
    }),
  };

  if (!sessions[token]) sessions[token] = { characterId: null, connected: false };
  sessions[token].characterId = characterId;

  notifySubscribers("characters");
  persistProject();
  res.json({ ok: true });
});

// POST /players/release — игрок сам освобождает персонажа
router.post("/release", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });

  data.characters = {
    list: (data.characters?.list || []).map((c) =>
      c.playerId === token ? { ...c, playerId: null } : c
    ),
  };

  if (sessions[token]) sessions[token].characterId = null;

  notifySubscribers("characters");
  persistProject();
  res.json({ ok: true });
});

// POST /players/release-force — ГМ принудительно освобождает персонажа
router.post("/release-force", (req, res) => {
  const { characterId } = req.body;
  if (!characterId)
    return res.status(400).json({ error: "characterId required" });

  const char = (data.characters?.list || []).find((c) => c.id === characterId);
  const token = char?.playerId;

  data.characters = {
    list: (data.characters?.list || []).map((c) =>
      c.id === characterId ? { ...c, playerId: null } : c
    ),
  };

  if (token && sessions[token]) sessions[token].characterId = null;

  notifySubscribers("characters");
  persistProject();
  res.json({ ok: true });
});

// GET /players/online — список сессий с персонажами (для ГМ)
router.get("/online", (req, res) => {
  const list = data.characters?.list || [];
  const result = Object.entries(sessions).map(([token, session]) => ({
    token,
    characterId: session.characterId,
    connected: session.connected,
    character: list.find((c) => c.id === session.characterId) || null,
  }));
  res.json(result);
});

export default router;
