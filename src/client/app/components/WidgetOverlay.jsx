import { QRCodeSVG } from "qrcode.react";

const POSITIONS = {
  topLeft:      "top-[2vw] left-[2vw]",
  topCenter:    "top-[2vw] left-1/2 -translate-x-1/2",
  topRight:     "top-[2vw] right-[2vw]",
  middleLeft:   "top-1/2 left-[2vw] -translate-y-1/2",
  middleRight:  "top-1/2 right-[2vw] -translate-y-1/2",
  bottomLeft:   "bottom-[2vw] left-[2vw]",
  bottomCenter: "bottom-[2vw] left-1/2 -translate-x-1/2",
  bottomRight:  "bottom-[2vw] right-[2vw]",
};

export function WidgetOverlay({ widgets }) {
  if (!widgets) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {Object.entries(widgets).map(([slot, widget]) => {
        if (!widget || !widget.type || widget.visible === false) return null;
        return (
          <div key={slot} className={`absolute ${POSITIONS[slot]}`}>
            <WidgetRenderer widget={widget} />
          </div>
        );
      })}
    </div>
  );
}

function WidgetRenderer({ widget }) {
  if (widget.type === "qr") {
    return <QrWidget widget={widget} />;
  }
  return null;
}

function QrWidget({ widget }) {
  const { title, url } = widget;
  if (!url) return null;

  const size = Math.round(window.innerWidth * 0.1);

  return (
    <div
      className="bg-black/70 backdrop-blur-sm rounded-xl p-[1vw] flex flex-col items-center gap-[0.6vw]"
      style={{ fontSize: "1.2vw" }}
    >
      {title && (
        <span className="text-white font-semibold text-center">{title}</span>
      )}
      <div className="rounded-lg overflow-hidden bg-white p-[0.4vw]">
        <QRCodeSVG value={url} size={size} />
      </div>
    </div>
  );
}
