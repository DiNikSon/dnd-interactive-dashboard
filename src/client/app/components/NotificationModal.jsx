import { useEffect, useState } from "react";

/**
 * @param {Object} props
 * @param {{ id, title, text, timer, createdAt }} props.notification
 * @param {() => void} props.onClose
 */
export function NotificationModal({ notification, onClose, closable = true, large = false }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!notification?.timer) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const elapsed = (Date.now() - notification.createdAt) / 1000;
      const left = Math.ceil(notification.timer - elapsed);
      if (left <= 0) {
        onClose();
      } else {
        setRemaining(left);
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [notification?.id]);

  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-gray-900/95 border border-white/20 rounded-2xl shadow-2xl space-y-3"
        style={large
          ? { padding: "4vw", width: "50vw", maxWidth: "none", fontSize: "2vw" }
          : { padding: "1.5rem", maxWidth: "24rem", width: "100%", margin: "0 1rem" }
        }
      >
        {/* Шапка */}
        <div className="flex items-start justify-between gap-3">
          <h2
            className="font-semibold text-white leading-tight"
            style={large ? { fontSize: "2.5vw" } : {}}
          >
            {notification.title}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {remaining !== null && (
              <span className="text-white/40" style={large ? { fontSize: "1.5vw" } : { fontSize: "0.875rem" }}>
                {remaining}с
              </span>
            )}
            {closable && (
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition leading-none"
                style={large ? { fontSize: "3vw" } : { fontSize: "1.25rem" }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Текст */}
        {notification.text && (
          <p
            className="text-white/80 leading-relaxed"
            style={large ? { fontSize: "1.8vw" } : { fontSize: "0.875rem" }}
          >
            {notification.text}
          </p>
        )}

        {closable && (
          <button
            onClick={onClose}
            className="w-full mt-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
          >
            Закрыть
          </button>
        )}
      </div>
    </div>
  );
}
