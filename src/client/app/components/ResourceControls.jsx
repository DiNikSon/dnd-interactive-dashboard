import { useState } from "react";
import { evalDiceString } from "@/utils/dice.js";

export const RECOVERY_TYPES = [
  { key: "long_rest",  label: "Длинный отдых" },
  { key: "short_rest", label: "Короткий отдых" },
  { key: "dawn",       label: "На рассвете" },
  { key: "manual",     label: "Вручную" },
];

export function normalizeRecovery(r) {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  return [r];
}

export function calcRecoveryDelta(rec, resource) {
  if (!rec.amount) return resource.max != null ? resource.max - resource.value : 0;
  try { return evalDiceString(String(rec.amount)).total; } catch { return 0; }
}

export function applyRecovery(resource, filterType) {
  const recs = normalizeRecovery(resource.recovery).filter(r => r.type === filterType);
  if (!recs.length) return null;
  let newVal = resource.value;
  for (const rec of recs) newVal += calcRecoveryDelta(rec, resource);
  return resource.max != null ? Math.min(resource.max, Math.max(0, newVal)) : Math.max(0, newVal);
}

export function decompose(value, denominations) {
  if (!denominations?.length) return [];
  const sorted = [...denominations].sort((a, b) => b.base - a.base);
  let remaining = Math.max(0, value || 0);
  return sorted.map((d, i) => {
    if (i === sorted.length - 1) {
      const count = remaining;
      remaining = 0;
      return { ...d, count };
    }
    const count = Math.floor(remaining / d.base);
    remaining -= count * d.base;
    return { ...d, count };
  });
}

export function groupResources(resources) {
  const result = [];
  const groups = {};
  for (const r of resources) {
    if (!r.group) {
      result.push({ isGroup: false, item: r });
    } else {
      if (!groups[r.group]) {
        groups[r.group] = { isGroup: true, name: r.group, items: [] };
        result.push(groups[r.group]);
      }
      groups[r.group].items.push(r);
    }
  }
  return result;
}

// ── Групповой блок ────────────────────────────────────────────────────────────

export function GroupBlock({ group, onEdit, onChange, onSetValue, onRecover, editable = true }) {
  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10">
        <span className="text-xs text-white/40 uppercase tracking-wide font-semibold">{group.name}</span>
      </div>
      <div className="divide-y divide-white/5">
        {group.items.map(r => (
          <ResourceRow key={r.id} resource={r} compact onEdit={onEdit} onChange={onChange} onSetValue={onSetValue} onRecover={onRecover} editable={editable} />
        ))}
      </div>
    </div>
  );
}

// ── Строка ресурса ────────────────────────────────────────────────────────────

export function ResourceRow({ resource: r, compact, onEdit, onChange, onSetValue, onRecover, editable = true }) {
  const recoveries = normalizeRecovery(r.recovery);
  const recoveryText = recoveries
    .map(rec => [RECOVERY_TYPES.find(x => x.key === rec.type)?.label, rec.amount].filter(Boolean).join(" "))
    .join(" · ");
  const hasManual = recoveries.some(rec => rec.type === "manual");

  return (
    <div className={`flex items-center gap-3 ${compact ? "px-4 py-2" : "bg-white/5 rounded-xl px-4 py-3"}`}>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${compact ? "text-xs" : "text-sm"} ${r.hidden ? "text-white/40" : ""}`}>
          {r.name || "Без названия"}
          {r.hidden && <span className="ml-1 text-white/30 text-xs">👁</span>}
        </div>
        {recoveryText && !compact && (
          <div className="text-white/30 text-xs">{recoveryText}</div>
        )}
      </div>

      {r.type === "currency"
        ? <CurrencyControl resource={r} onChange={onChange} />
        : r.type === "tally"
        ? <TallyControl resource={r} onChange={onChange} onSetValue={onSetValue} compact={compact} />
        : <NumericalControl resource={r} onChange={onChange} onSetValue={onSetValue} compact={compact} />
      }

      {hasManual && onRecover && (
        <button
          onClick={() => onRecover(r.id)}
          className="text-xs px-2 py-1 bg-green-600/40 hover:bg-green-600/70 rounded transition flex-shrink-0"
          title="Восстановить (вручную)"
        >↑</button>
      )}

      {editable && onEdit && (
        <button
          onClick={() => onEdit(r)}
          className="text-white/30 hover:text-white/70 transition text-xs px-1.5 py-1 rounded hover:bg-white/10 flex-shrink-0"
        >✏</button>
      )}
    </div>
  );
}

// ── Numerical ─────────────────────────────────────────────────────────────────

export function NumericalControl({ resource: r, onChange, onSetValue, compact }) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => onChange(r.id, -1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center"
      >−</button>
      <input
        type="number"
        value={r.value}
        onChange={e => onSetValue?.(r.id, e.target.value)}
        readOnly={!onSetValue}
        className={`text-center bg-white/10 rounded border border-white/20 outline-none ${compact ? "w-10 text-xs py-0.5" : "w-12 text-sm py-1"}`}
      />
      {r.max != null && <span className="text-white/30 text-xs">/{r.max}</span>}
      <button
        onClick={() => onChange(r.id, 1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center"
      >+</button>
    </div>
  );
}

// ── Tally ─────────────────────────────────────────────────────────────────────

export function TallyControl({ resource: r, onChange, onSetValue, compact }) {
  const size = compact ? "w-4 h-4 text-[10px]" : "w-5 h-5 text-xs";

  if (r.max === 1) {
    const checked = r.value >= 1;
    const cbSize = compact ? "w-4 h-4" : "w-5 h-5";
    return (
      <button
        onClick={() => onSetValue?.(r.id, checked ? 0 : 1)}
        className={`${cbSize} rounded-full flex-shrink-0 transition border ${
          checked
            ? "bg-indigo-500 border-indigo-400 hover:bg-indigo-400"
            : "bg-white/10 border-white/20 hover:bg-white/20"
        }`}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <button
        onClick={() => onChange(r.id, -1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center flex-shrink-0"
      >−</button>
      <div className="flex flex-wrap gap-1 min-w-0">
        {Array.from({ length: r.max }, (_, i) => (
          <button
            key={i}
            onClick={() => onSetValue?.(r.id, i + 1)}
            className={`${size} rounded-full flex items-center justify-center flex-shrink-0 transition ${
              i < r.value
                ? "bg-indigo-500 border border-indigo-400 hover:bg-indigo-400"
                : "bg-white/10 border border-white/20 hover:bg-white/20"
            }`}
          />
        ))}
      </div>
      <button
        onClick={() => onChange(r.id, 1)}
        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-sm leading-none transition flex items-center justify-center flex-shrink-0"
      >+</button>
    </div>
  );
}

// ── Currency ──────────────────────────────────────────────────────────────────

export function CurrencyControl({ resource: r, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const decomposed = decompose(r.value, r.denominations);

  if (!decomposed.length) {
    return <span className="text-white/30 text-xs italic">Нет деноминаций</span>;
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        {decomposed.map(d => (
          <div key={d.abbr} className="flex items-center gap-0.5">
            <button
              onClick={() => onChange(r.id, -d.base)}
              className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-sm leading-none transition flex items-center justify-center"
            >−</button>
            <span className="text-sm font-mono min-w-[1.5rem] text-center">{d.count}</span>
            <span className="text-xs text-white/50 mr-0.5">{d.abbr}</span>
            <button
              onClick={() => onChange(r.id, d.base)}
              className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-sm leading-none transition flex items-center justify-center"
            >+</button>
          </div>
        ))}
        <button
          onClick={() => setShowModal(true)}
          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white/60 hover:text-white transition ml-1"
        >±</button>
      </div>

      {showModal && (
        <CurrencyModal
          denominations={decomposed}
          onConfirm={(delta) => { onChange(r.id, delta); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export function CurrencyModal({ denominations, onConfirm, onClose }) {
  const [amounts, setAmounts] = useState(denominations.map(() => 0));
  const delta = amounts.reduce((sum, amt, i) => sum + amt * denominations[i].base, 0);

  const setAmount = (i, val) => {
    const next = [...amounts];
    next[i] = Math.max(0, parseInt(val) || 0);
    setAmounts(next);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm space-y-5 text-white" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold">Трата / Получение</h3>
        <div className="flex gap-4 flex-wrap">
          {denominations.map((d, i) => (
            <div key={d.abbr} className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-white/40">{d.name || d.abbr}</span>
              <input
                type="number" min={0} value={amounts[i]}
                onChange={e => setAmount(i, e.target.value)}
                className="w-16 text-center px-2 py-1.5 bg-white/10 rounded-lg border border-white/20 text-sm outline-none"
              />
              <span className="text-xs text-white/50">{d.abbr}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => delta > 0 && onConfirm(-delta)} disabled={delta === 0}
            className="flex-1 py-2 bg-red-600/70 hover:bg-red-600 disabled:opacity-30 rounded-lg text-sm transition">
            Потратить
          </button>
          <button onClick={() => delta > 0 && onConfirm(delta)} disabled={delta === 0}
            className="flex-1 py-2 bg-green-600/70 hover:bg-green-600 disabled:opacity-30 rounded-lg text-sm transition">
            Получить
          </button>
        </div>
        <button onClick={onClose}
          className="w-full py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/50 transition">
          Отмена
        </button>
      </div>
    </div>
  );
}
