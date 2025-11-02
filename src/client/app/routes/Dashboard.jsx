import { NavLink, Outlet } from "react-router";
import useLPSync from "../hooks/useLPSync";

export function meta() {
  return [
    { title: "Дэшборд | DNDI" },
    { name: "description", content: "Дэшборд управления приложением" },
  ];
}

export default function Dashboard() {
  const [scene, setScene] = useLPSync("/sync/subscribe/scene", "/sync/set/scene");

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
              to="placeholder"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white/30 text-white shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`
              }
            >
              🧰 Другой инструмент
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
