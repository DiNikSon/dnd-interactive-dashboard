export default function ChangeBackground() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold mb-4">Смена фона</h2>
      <p className="text-white/80 mb-6">
        Здесь будет инструмент для выбора или загрузки нового фона.
      </p>
      <button className="px-4 py-2 bg-white/30 rounded-lg hover:bg-white/50 transition">
        Выбрать новый фон
      </button>
    </div>
  );
}
