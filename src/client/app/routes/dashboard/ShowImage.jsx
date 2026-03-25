import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import useLPSync from "@/hooks/useLPSync";

const NO_GROUP = "Без группы";

export default function ShowImage() {
  const { scene, setScene } = useOutletContext();
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingGroupUrl, setEditingGroupUrl] = useState(null);
  const [groupInput, setGroupInput] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const dropRef = useRef(null);

  const [groupsData, setGroupsData] = useLPSync(
    "/sync/subscribe/imageGroups",
    "/sync/set/imageGroups"
  );
  const groupMap = groupsData?.map || {};

  const isActive = scene?.active === "image";

  useEffect(() => {
    fetch("/upload/images")
      .then((r) => r.json())
      .then(setImages)
      .catch(() => setImages([]));
  }, []);

  const select = (url) => {
    setScene((prev) => ({ ...prev, activeImage: url, active: "image" }));
  };

  const toggleScene = (e) => {
    setScene((prev) => ({ ...prev, active: e.target.checked ? "image" : null }));
  };

  const handleDelete = async (url) => {
    if (!confirm("Удалить это изображение?")) return;
    const filename = url.split("/").pop();
    await fetch(`/upload/images/${filename}`, { method: "DELETE" });
    setImages((prev) => prev.filter((u) => u !== url));
    if (scene?.activeImage === url) {
      setScene((prev) => ({ ...prev, activeImage: null, active: null }));
    }
    const newMap = { ...groupMap };
    delete newMap[url];
    setGroupsData({ map: newMap });
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);
    try {
      const res = await fetch("/upload/images", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setImages((prev) => [data.url, ...prev.filter((u) => u !== data.url)]);
        setScene((prev) => ({ ...prev, activeImage: data.url, active: "image" }));
      }
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const startEditGroup = (url) => {
    setEditingGroupUrl(url);
    setGroupInput(groupMap[url] || "");
  };

  const saveGroup = (url) => {
    const val = groupInput.trim();
    const newMap = { ...groupMap };
    if (val) newMap[url] = val;
    else delete newMap[url];
    setGroupsData({ map: newMap });
    setEditingGroupUrl(null);
  };

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Группировка
  const grouped = {};
  for (const url of images) {
    const g = groupMap[url] || NO_GROUP;
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(url);
  }

  // Сначала именованные группы (по алфавиту), потом "Без группы"
  const groupNames = [
    ...Object.keys(grouped).filter((g) => g !== NO_GROUP).sort(),
    ...(grouped[NO_GROUP] ? [NO_GROUP] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold">Изображение</h2>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isActive}
            onChange={toggleScene}
            className="w-4 h-4 accent-blue-400"
          />
          <span className="text-white/70">На сцене</span>
        </label>
      </div>

      {/* Текущее выбранное */}
      {scene?.activeImage && (
        <div className="rounded-xl overflow-hidden border border-white/20 max-w-sm">
          <img src={scene.activeImage} alt="" className="w-full max-h-48 object-contain bg-black/30" />
          <p className="text-xs text-white/40 px-3 py-1 truncate">{scene.activeImage.split("/").pop()}</p>
        </div>
      )}

      {/* Зона загрузки */}
      <div
        ref={dropRef}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); setIsDragging(false); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`relative p-8 border-2 border-dashed rounded-xl transition text-center
          ${isDragging ? "border-white/80 bg-white/10" : "border-white/30 hover:border-white/50 bg-white/5"}`}
      >
        <input id="img-input" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} className="hidden" disabled={isUploading} />
        <label htmlFor="img-input" className="cursor-pointer block text-white/80">
          {isUploading ? <span className="text-white/70">Загрузка...</span> : (
            <><span className="text-xl">📁</span><br /><span className="text-white/70">Перетащи изображение или нажми</span></>
          )}
        </label>
        {isDragging && <div className="absolute inset-0 bg-white/20 rounded-xl pointer-events-none animate-pulse" />}
      </div>

      {/* Галерея по группам */}
      {images.length > 0 && (
        <div className="space-y-2">
          {groupNames.map((group) => {
            const isOpen = openGroups[group] ?? false;
            return (
              <div key={group} className="rounded-xl border border-white/10 overflow-hidden">
                {/* Заголовок группы */}
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 transition text-left"
                >
                  <span className={`text-white/40 text-xs transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                  <span className="flex-1 text-sm font-medium">{group}</span>
                  <span className="text-white/30 text-xs">{grouped[group].length}</span>
                </button>

                {/* Содержимое */}
                {isOpen && (
                  <div className="p-3 flex flex-wrap gap-3">
                    {grouped[group].map((url) => (
                      <div key={url} className="relative w-36 flex-shrink-0">
                        <div className="relative w-full h-24">
                          <button
                            onClick={() => select(url)}
                            className={`w-full h-full rounded-lg overflow-hidden border-2 transition ${
                              scene?.activeImage === url ? "border-white shadow-lg" : "border-transparent hover:border-white/40"
                            }`}
                          >
                            <img src={url} alt="" className="object-cover w-full h-full" />
                          </button>
                          <button
                            onClick={() => handleDelete(url)}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white text-xs px-2 py-0.5 rounded z-10"
                          >✕</button>
                        </div>
                        {/* Редактирование группы */}
                        {editingGroupUrl === url ? (
                          <div className="mt-1 flex gap-1">
                            <input
                              autoFocus
                              value={groupInput}
                              onChange={(e) => setGroupInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveGroup(url); if (e.key === "Escape") setEditingGroupUrl(null); }}
                              placeholder="Группа"
                              className="flex-1 min-w-0 px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-xs outline-none"
                            />
                            <button onClick={() => saveGroup(url)} className="px-1.5 py-0.5 bg-blue-600/70 hover:bg-blue-600 rounded text-xs">✓</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditGroup(url)}
                            className="mt-1 w-full text-left text-xs text-white/30 hover:text-white/60 truncate px-0.5 transition"
                            title="Изменить группу"
                          >
                            {groupMap[url] ? groupMap[url] : <span className="italic">группа...</span>}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
