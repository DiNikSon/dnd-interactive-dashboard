import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router";

export default function ChangeBackground() {
  const { scene, setScene } = useOutletContext();
  const [backgrounds, setBackgrounds] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef(null);

  const DEFAULT_BG = "/src/images/default-bg.jpg";

  // ===========================
  // Fetch backgrounds
  // ===========================
  useEffect(() => {
    const fetchBackgrounds = async () => {
      try {
        const res = await fetch("/upload/backgrounds");
        const data = await res.json();
        setBackgrounds([DEFAULT_BG, ...new Set(data.filter((url) => url !== DEFAULT_BG))]);
      } catch (err) {
        console.error("Ошибка при загрузке фонов:", err);
        setBackgrounds([DEFAULT_BG]);
      }
    };
    fetchBackgrounds();
  }, []);

  // ===========================
  // Handlers
  // ===========================
  const handleSelect = (bg) => setScene((prev) => ({ ...prev, background: bg }));

  const handleDelete = async (bg) => {
    if (bg === DEFAULT_BG) return;
    if (!confirm("Удалить этот фон?")) return;

    try {
      const filename = bg.split("/").pop();
      const res = await fetch(`/upload/backgrounds/${filename}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");

      setBackgrounds((prev) => prev.filter((u) => u !== bg));
      if (scene.background === bg) setScene((prev) => ({ ...prev, background: DEFAULT_BG }));
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить фон");
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const res = await fetch("/upload/backgrounds", { method: "POST", body: formData });
      const data = await res.json();

      if (data.url) {
        setScene((prev) => ({ ...prev, background: data.url }));
        setBackgrounds((prev) => [DEFAULT_BG, data.url, ...prev.filter((u) => u !== DEFAULT_BG && u !== data.url)]);
      }
    } catch (err) {
      console.error("Ошибка при загрузке:", err);
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  // ===========================
  // Render
  // ===========================
  return (
    <div className="text-center space-y-6 overflow-x-hidden">
      <h2 className="text-2xl font-semibold mb-2">Смена фона</h2>
      <p className="text-white/80">
        Текущий фон:{" "}
        <span className="font-mono text-white/90">{scene?.background || "—"}</span>
      </p>

      {scene?.background && (
        <div className="mx-auto w-full max-w-2xl rounded-xl overflow-hidden shadow-lg border border-white/20">
          <img src={scene.background} alt="Текущий фон" className="w-full h-64 object-cover" />
        </div>
      )}

      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-white/70 hover:text-white transition">
        <input
          type="checkbox"
          checked={!!scene?.noBlur}
          onChange={(e) => setScene((prev) => ({ ...prev, noBlur: e.target.checked }))}
          className="w-4 h-4"
        />
        Убрать размытие фона
      </label>

      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative mx-auto w-full max-w-2xl p-8 border-2 border-dashed rounded-xl transition
          ${isDragging ? "border-white/80 bg-white/10" : "border-white/30 hover:border-white/50 bg-white/5"}`}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />
        <label htmlFor="file-input" className="cursor-pointer block text-white/80">
          {isUploading ? (
            <span className="text-white/70">Загрузка...</span>
          ) : (
            <>
              <span className="text-xl">📁</span> <br />
              <span className="text-white/70">Перетащи изображение сюда <br /> или нажми, чтобы выбрать</span>
            </>
          )}
        </label>
        {isDragging && (
          <div className="absolute inset-0 bg-white/20 rounded-xl pointer-events-none animate-pulse" />
        )}
      </div>

      <div className="pt-6">
        <h3 className="text-lg font-medium mb-3 text-white/90">Выбрать из доступных:</h3>
        <div className="flex flex-nowrap gap-4 max-w-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-white/10 hover:scrollbar-thumb-white/50 scrollbar-thumb-rounded-full scrollbar-track-rounded-full scroll-smooth p-1">
          {backgrounds.map((bg, index) => (
            <div key={index} className="relative w-40 h-24 flex-shrink-0">
              <button
                onClick={() => handleSelect(bg)}
                className={`w-full h-full rounded-lg overflow-hidden border-2 transition ${
                  scene.background === bg ? "border-white shadow-lg" : "border-transparent hover:border-white/40"
                }`}
              >
                <img src={bg} alt={`Background ${index}`} className="object-cover w-full h-full" />
              </button>
              {bg !== DEFAULT_BG && (
                <button
                  onClick={() => handleDelete(bg)}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white text-xs px-2 py-0.5 rounded z-10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
