import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";

export default function ShowImage() {
  const { scene, setScene } = useOutletContext();
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef(null);

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
    if (e.target.checked) {
      setScene((prev) => ({ ...prev, active: "image" }));
    } else {
      setScene((prev) => ({ ...prev, active: null }));
    }
  };

  const handleDelete = async (url) => {
    if (!confirm("Удалить это изображение?")) return;
    const filename = url.split("/").pop();
    await fetch(`/upload/images/${filename}`, { method: "DELETE" });
    setImages((prev) => prev.filter((u) => u !== url));
    if (scene?.activeImage === url) {
      setScene((prev) => ({ ...prev, activeImage: null, active: null }));
    }
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

      {/* Галерея */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((url) => (
            <div key={url} className="relative w-36 h-24 flex-shrink-0">
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
          ))}
        </div>
      )}
    </div>
  );
}
