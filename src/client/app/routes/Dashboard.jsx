import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import useLPSync from "@/hooks/useLPSync";

export function meta() {
  return [
    { title: "Дэшборд | DNDI" },
    { name: "description", content: "Дэшборд управления приложением" },
  ];
}

export default function Dashboard() {
  const [scene, setScene, projectName] = useLPSync(
    "/sync/subscribe/",
    "/sync/set/",
    ["scene", "project"]
  );

  if (!projectName || typeof projectName !== "string") {
    return <ProjectPicker />;
  }

  return (
    <div className="h-screen w-screen bg-[url('/src/images/dashboard-bg.png')] bg-auto bg-repeat-x bg-center">
      <div className="h-full w-full backdrop-blur-xs flex">
        {/* ==== Боковая панель ==== */}
        <aside className="h-full w-64 bg-white/15 backdrop-blur-md border-r border-white/20 flex flex-col">
          {/* Заголовок */}
          <div className="p-6 border-b border-white/10 flex-shrink-0">
            <h1 className="text-2xl font-semibold text-white text-center tracking-wide">
              Dashboard
            </h1>
            <p className="text-white/40 text-xs text-center mt-1">{projectName}</p>
          </div>

          {/* Навигация с прокруткой */}
          <div
            className="
              flex-1 overflow-y-auto p-4 space-y-2
              scrollbar-thin
              scrollbar-thumb-white/30
              scrollbar-track-white/5
              hover:scrollbar-thumb-white/50
              scrollbar-thumb-rounded-full
              scrollbar-track-rounded-full
              transition-all
            "
          >
            <NavLink
              to="characters"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              🧙 Персонажи
            </NavLink>

            <NavLink
              to="background"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              🎨 Смена фона
            </NavLink>

            <NavLink
              to="soundpad"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              🧰 Саундпад
            </NavLink>

            <NavLink
              to="notification"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              🔔 Уведомление
            </NavLink>

            <NavLink
              to="music"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              🎵 Музыка
            </NavLink>

            <NavLink
              to="widgets"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              🖼️ Виджеты
            </NavLink>

            <NavLink
              to="initiative"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              ⚔️ Инициатива
            </NavLink>
          </div>

          {/* Футер */}
          <div className="p-4 border-t border-white/10 text-xs text-white/60 text-center flex-shrink-0">
            v1.0.0 • Tools Panel
          </div>
        </aside>

        {/* ==== Правая рабочая область ==== */}
        <main className="flex-1 h-full p-10 overflow-hidden flex">
          {/* Контейнер инструмента */}
          <div
            className="
              bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl
              p-10 w-full text-white
              overflow-y-auto
              scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-white/5
              hover:scrollbar-thumb-white/50
              scrollbar-thumb-rounded-full scrollbar-track-rounded-full
            "
          >
            <Outlet context={{ scene, setScene }} />
          </div>
        </main>
      </div>
    </div>
  );
}

function ProjectPicker() {
  const [projects, setProjects] = useState(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/sync/projects").then((r) => r.json()).then(setProjects);
  }, []);

  const loadProject = async (name) => {
    setLoading(true);
    await fetch(`/sync/load/${name}`, { method: "POST" });
    setLoading(false);
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/sync/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || "Ошибка");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[url('/src/images/dashboard-bg.png')] bg-auto bg-repeat-x bg-center flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-10 w-full max-w-md text-white space-y-6 shadow-2xl mx-4">
        <h1 className="text-2xl font-semibold text-center">Выбери проект</h1>

        {projects === null ? (
          <p className="text-white/40 text-sm text-center">Загрузка...</p>
        ) : projects.length === 0 ? (
          <p className="text-white/40 text-sm text-center">Нет проектов — создай первый</p>
        ) : (
          <div className="space-y-2">
            {projects.map((name) => (
              <button
                key={name}
                onClick={() => loadProject(name)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-left transition disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-white/10 pt-4 space-y-2">
          <p className="text-sm text-white/50">Новый проект</p>
          <div className="flex gap-2">
            <input
              placeholder="Название"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              className="flex-1 px-3 py-2 bg-white/10 rounded-lg border border-white/20 outline-none text-sm"
            />
            <button
              onClick={createProject}
              disabled={!newName.trim() || loading}
              className="px-4 py-2 bg-green-600/70 hover:bg-green-600 rounded-lg text-sm disabled:opacity-40"
            >
              Создать
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
}
