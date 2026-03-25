import { useState, useRef } from "react";
import useLPSync from "@/hooks/useLPSync";
import { generateUUID } from "@/utils/uuid.js";
import SimpleMarkdown from "@/components/SimpleMarkdown.jsx";

const CR_LIST = ["0","1/8","1/4","1/2","1","2","3","4","5","6","7","8","9","10",
  "11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"];

const CR_XP = {
  "0":0,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,"5":1800,
  "6":2300,"7":2900,"8":3900,"9":5000,"10":5900,"11":7200,"12":8400,"13":10000,
  "14":11500,"15":13000,"16":15000,"17":18000,"18":20000,"19":22000,"20":25000,
  "21":33000,"22":41000,"23":50000,"24":62000,"25":75000,"26":90000,"27":105000,
  "28":120000,"29":135000,"30":155000,
};

const SIZES = ["Крошечный","Маленький","Средний","Большой","Огромный","Гигантский"];
const STATS = ["str","dex","con","int","wis","cha"];
const STAT_LABELS = { str:"СИЛ", dex:"ЛОВ", con:"ТЕЛ", int:"ИНТ", wis:"МДР", cha:"ХАР" };

function mod(v) { const m = Math.round((v - 10) / 2); return (m >= 0 ? "+" : "") + m; }
function fmtXP(cr) { const x = CR_XP[cr]; return x != null ? x.toLocaleString("ru") : "—"; }

const DEFAULT_MONSTER = {
  id: null, name: "", size: "Средний", type: "", alignment: "",
  ac: 10, hp: "1d8", speed: "6 клеток",
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  senses: "", passivePerception: 10,
  challenge: "1",
  features: "", actions: "",
};

export default function Monsters() {
  const [monstersData, setMonstersData] = useLPSync(
    "/sync/subscribe/monsters",
    "/sync/set/monsters"
  );

  const monsters = monstersData?.items || [];
  const [editMonster, setEditMonster] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [search, setSearch] = useState("");

  const [expandedId, setExpandedId] = useState(null);

  const filtered = monsters.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => setEditMonster({ ...DEFAULT_MONSTER });
  const openEdit = (m) => setEditMonster({ ...m });

  const handleSave = async (form) => {
    let imageUrl = form.imageUrl || null;
    if (form.imageFile) {
      const fd = new FormData();
      fd.append("file", form.imageFile);
      const res = await fetch("/upload/monsters", { method: "POST", body: fd });
      if (res.ok) {
        const json = await res.json();
        imageUrl = json.url || json.path || imageUrl;
      }
    }
    const { imageFile, ...rest } = form;
    const obj = { ...rest, imageUrl, id: form.id || generateUUID() };
    const newItems = form.id
      ? monsters.map(m => m.id === form.id ? obj : m)
      : [...monsters, obj];
    setMonstersData({ items: newItems });
    setEditMonster(null);
  };

  const handleDelete = () => {
    setMonstersData({ items: monsters.filter(m => m.id !== editMonster.id) });
    setDeleteConfirm(false);
    setEditMonster(null);
  };

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Список */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="flex-1 px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
          />
          <button
            onClick={openAdd}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition flex-shrink-0"
          >
            + Добавить
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 && (
            <p className="text-white/40 text-sm">Нет монстров</p>
          )}
          {filtered.map(m => {
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} className="bg-white/5 rounded-xl overflow-hidden transition">
                {/* Строка */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                >
                  <div className="flex-1 min-w-0 font-medium text-sm">{m.name || "Без названия"}</div>
                  <span className="text-white/40 text-xs flex-shrink-0">{m.size}</span>
                  <span className="text-white/40 text-xs flex-shrink-0">CR {m.challenge}</span>
                  <span className="text-white/30 text-xs flex-shrink-0">{fmtXP(m.challenge)} XP</span>
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(m); }}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition flex-shrink-0"
                  >Изменить</button>
                  <span className={`text-white/30 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                </div>
                {/* Карточка */}
                {isExpanded && <MonsterCard monster={m} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Редактор */}
      {editMonster && (
        <MonsterEditPanel
          monster={editMonster}
          onSave={handleSave}
          onClose={() => setEditMonster(null)}
          onDelete={() => setDeleteConfirm(true)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm space-y-4 text-white">
            <h3 className="text-lg font-semibold">Удалить монстра?</h3>
            <p className="text-white/60 text-sm">Это действие нельзя отменить.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">Отмена</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MonsterCard({ monster: m }) {
  return (
    <div className="border-t border-white/10 px-4 pb-4 pt-3">
      <div className="bg-white/5 rounded-xl overflow-hidden">
        <div className="flex">
          {/* Левая колонка */}
          <div className="flex-1 p-4 min-w-0">
            {/* Заголовок */}
            <h2 className="text-white font-bold text-lg leading-tight">
              {m.name || "Без названия"}
            </h2>
            <p className="text-white/40 text-xs italic mb-3">
              {[m.size, m.type, m.alignment].filter(Boolean).join(", ")}
            </p>
            <Divider />

            {/* КД / HP / Скорость */}
            <StatLine label="КД" value={m.ac} />
            <StatLine label="HP" value={m.hp} />
            <StatLine label="Скорость" value={m.speed} />
            <Divider />

            {/* Характеристики */}
            <div className="flex justify-between py-2">
              {STATS.map(s => (
                <div key={s} className="flex flex-col items-center gap-0.5">
                  <span className="text-indigo-300 font-semibold text-xs">{STAT_LABELS[s]}</span>
                  <span className="text-white text-xs">{m[s]}</span>
                  <span className="text-white/50 text-xs">{mod(m[s])}</span>
                </div>
              ))}
            </div>
            <Divider />

            {/* Чувства / Пасс. восприятие / Сложность */}
            {m.senses && <StatLine label="Чувства" value={m.senses} />}
            <StatLine label="Пассивное восприятие" value={m.passivePerception} />
            <StatLine label="Сложность" value={`${m.challenge} (${fmtXP(m.challenge)} XP)`} />

            {/* Особенности */}
            {m.features && (
              <>
                <Divider />
                <div className="text-white/75 text-xs leading-relaxed">
                  <SimpleMarkdown text={m.features} />
                </div>
              </>
            )}

            {/* Действия */}
            {m.actions && (
              <>
                <div className="border-b border-indigo-400/40 mt-3 mb-2">
                  <h3 className="text-indigo-300 font-bold text-sm">Действия</h3>
                </div>
                <div className="text-white/75 text-xs leading-relaxed">
                  <SimpleMarkdown text={m.actions} />
                </div>
              </>
            )}
          </div>

          {/* Картинка */}
          {m.imageUrl && (
            <div className="flex-shrink-0 p-3 flex items-start">
              <img
                src={m.imageUrl}
                alt={m.name}
                style={{ width: "9rem", objectFit: "contain", maxHeight: "14rem" }}
                className="rounded-lg opacity-90"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-b border-white/10 my-2" />;
}

function StatLine({ label, value }) {
  return (
    <p className="text-xs text-white/75 leading-6">
      <span className="text-white/50 font-semibold">{label}:</span> {value}
    </p>
  );
}

function MarkdownField({ label, value, onChange, rows = 4, placeholder }) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-white/50">{label}</label>
        <button type="button" onClick={() => setPreview(p => !p)} className="text-xs text-white/40 hover:text-white/70 transition">
          {preview ? "Редактор" : "Предпросмотр"}
        </button>
      </div>
      {preview ? (
        <div className="min-h-[60px] px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white/80">
          <SimpleMarkdown text={value} />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm resize-none"
        />
      )}
    </div>
  );
}

function StatInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-white/40 font-semibold tracking-wide">{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.max(1, Math.min(30, parseInt(e.target.value) || 10)))}
        className="w-12 text-center px-1 py-1 bg-white/10 rounded border border-white/20 outline-none text-sm"
      />
      <span className="text-xs text-white/50">{mod(value)}</span>
    </div>
  );
}

function MonsterEditPanel({ monster, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({ ...monster });
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const xp = fmtXP(form.challenge);

  return (
    <div className="w-[26rem] flex-shrink-0 flex flex-col bg-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h3 className="font-semibold text-sm">{monster.id ? "Редактировать" : "Новый монстр"}</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white transition text-lg leading-none">×</button>
      </div>

      <form
        onSubmit={e => { e.preventDefault(); onSave(form); }}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Название + картинка */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Название</label>
          <input required value={form.name} onChange={e => set("name", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="Неоги личинка" />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Изображение</label>
          <div className="flex gap-3 items-start">
            {(form.imageFile ? URL.createObjectURL(form.imageFile) : form.imageUrl) && (
              <img
                src={form.imageFile ? URL.createObjectURL(form.imageFile) : form.imageUrl}
                alt=""
                className="w-20 h-20 object-contain rounded-lg bg-black/30 flex-shrink-0"
              />
            )}
            <div className="flex-1 space-y-1">
              <input
                type="file"
                accept="image/*"
                onChange={e => set("imageFile", e.target.files[0] || null)}
                className="w-full text-xs text-white/60 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-white/10 file:text-white/70 hover:file:bg-white/20"
              />
              {form.imageUrl && !form.imageFile && (
                <button type="button" onClick={() => set("imageUrl", null)}
                  className="text-xs text-red-400/70 hover:text-red-400 transition">
                  Удалить картинку
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Размер / Тип / Мировоззрение */}
        <div className="flex gap-2">
          <div>
            <label className="block text-xs text-white/50 mb-1">Размер</label>
            <select value={form.size} onChange={e => set("size", e.target.value)}
              className="px-2 py-2 bg-gray-800 text-white rounded-lg border border-white/20 outline-none text-sm">
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">Тип</label>
            <input value={form.type} onChange={e => set("type", e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
              placeholder="аберрация" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Мировоззрение</label>
          <input value={form.alignment} onChange={e => set("alignment", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="законно-злой" />
        </div>

        {/* КД / HP / Скорость */}
        <div className="flex gap-2">
          <div className="w-20">
            <label className="block text-xs text-white/50 mb-1">КД</label>
            <input type="number" min={1} value={form.ac} onChange={e => set("ac", parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">HP (число или кости)</label>
            <input value={form.hp} onChange={e => set("hp", e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
              placeholder="3d8+6" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Скорость</label>
          <input value={form.speed} onChange={e => set("speed", e.target.value)}
            className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            placeholder="6 клеток, полёт 8 клеток" />
        </div>

        {/* Характеристики */}
        <div>
          <label className="block text-xs text-white/50 mb-2">Характеристики</label>
          <div className="flex justify-between gap-1">
            {STATS.map(s => (
              <StatInput key={s} label={STAT_LABELS[s]} value={form[s]} onChange={v => set(s, v)} />
            ))}
          </div>
        </div>

        {/* Чувства / Пассивное восприятие */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">Чувства</label>
            <input value={form.senses} onChange={e => set("senses", e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
              placeholder="тёмное зрение 60 фт" />
          </div>
          <div className="w-20">
            <label className="block text-xs text-white/50 mb-1">Пасс. воспр.</label>
            <input type="number" value={form.passivePerception} onChange={e => set("passivePerception", parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm" />
          </div>
        </div>

        {/* Сложность */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Сложность (CR)</label>
          <div className="flex items-center gap-3">
            <select value={form.challenge} onChange={e => set("challenge", e.target.value)}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-white/20 outline-none text-sm">
              {CR_LIST.map(cr => <option key={cr} value={cr}>CR {cr}</option>)}
            </select>
            <span className="text-white/50 text-sm">{xp} XP</span>
          </div>
        </div>

        {/* Особенности */}
        <MarkdownField
          label="Особенности и способности"
          value={form.features}
          onChange={v => set("features", v)}
          rows={5}
          placeholder={"**Тёмное зрение:** ...\n\n**Бесстрашие:** ..."}
        />

        {/* Действия */}
        <MarkdownField
          label="Действия"
          value={form.actions}
          onChange={v => set("actions", v)}
          rows={5}
          placeholder={"**Укус:** Рукопашная атака оружием..."}
        />

        {/* Кнопки */}
        <div className="flex gap-2 pt-2">
          {monster.id && (
            <button type="button" onClick={onDelete}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-sm transition">
              Удалить
            </button>
          )}
          <button type="submit" className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
