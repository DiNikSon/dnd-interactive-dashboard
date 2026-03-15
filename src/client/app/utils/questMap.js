export const MARKER_TYPES = {
  quest:   { label: "Задание",    color: "#f59e0b", symbol: "!" },
  dungeon: { label: "Данж",       color: "#ef4444", symbol: "☠" },
  shop:    { label: "Магазин",    color: "#10b981", symbol: "₽" },
  npc:     { label: "НПС",        color: "#3b82f6", symbol: "?" },
  danger:  { label: "Опасность",  color: "#f97316", symbol: "⚠" },
  point:   { label: "Точка",      color: "#8b5cf6", symbol: "●" },
};

export const VISIBILITY_LABELS = {
  map:    { label: "На карте",        color: "bg-blue-500/20 text-blue-300" },
  list:   { label: "Только в списке", color: "bg-yellow-500/20 text-yellow-300" },
  hidden: { label: "Скрыто",         color: "bg-gray-500/20 text-gray-300" },
};

// Returns only quests visible and unlocked for players given the full quests list
export function getVisibleQuests(allQuests) {
  const completedIds = new Set(allQuests.filter(q => q.completed).map(q => q.id));
  return allQuests.filter(q => {
    if (q.visibility === "hidden") return false;
    if (q.requiresQuestIds?.length) {
      if (!q.requiresQuestIds.every(id => completedIds.has(id))) return false;
    }
    return true;
  });
}
