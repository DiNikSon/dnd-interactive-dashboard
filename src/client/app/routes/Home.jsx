import { Link } from "react-router";

export function meta({}) {
  return [
    { title: "Главное меню - DNDI" },
    { name: "description", content: "Главное меню приложения DND-Interactive!" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen min-w-screen bg-[url('/src/images/default-bg.jpg')] bg-cover bg-no-repeat bg-center">
      <div className="min-h-screen min-w-screen backdrop-blur-xs flex items-center justify-center">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          
          {/* Кнопка Интерактор */}
          <Link
            to="/interactor"
            className="group flex flex-col items-center justify-center w-64 h-64 bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl shadow-lg transition-all duration-300 backdrop-blur-sm"
          >
            <img
              src="/src/images/interactor-icon.png"
              alt="Интерактор"
              className="w-24 h-24 mb-4 group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-white text-2xl font-semibold tracking-wide">
              Интерактор
            </span>
          </Link>

          {/* Кнопка Сцена */}
          <Link
            to="/scene"
            className="group flex flex-col items-center justify-center w-64 h-64 bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl shadow-lg transition-all duration-300 backdrop-blur-sm"
          >
            <img
              src="/src/images/scene-icon.png"
              alt="Сцена"
              className="w-24 h-24 mb-4 group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-white text-2xl font-semibold tracking-wide">
              Сцена
            </span>
          </Link>

        </div>
      </div>
    </div>
  );
}