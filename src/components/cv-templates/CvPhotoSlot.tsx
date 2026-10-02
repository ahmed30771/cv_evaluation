"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

const EXPORT_MAX = 480;
const CROP_VIEW = 280;

/** Resize + compress an image file / blob canvas output to a data URL suitable for draft JSON. */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return bitmapToPhotoDataUrl(bitmap);
  } finally {
    bitmap.close();
  }
}

function bitmapToPhotoDataUrl(bitmap: ImageBitmap, sx = 0, sy = 0, sw?: number, sh?: number): string {
  const srcW = sw ?? bitmap.width;
  const srcH = sh ?? bitmap.height;
  const scale = Math.min(1, EXPORT_MAX / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process photo");
  ctx.drawImage(bitmap, sx, sy, srcW, srcH, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  if (dataUrl.length > 420_000) throw new Error("Photo is too large — try a smaller image");
  return dataUrl;
}

async function cropSourceToDataUrl(
  src: string,
  crop: { sx: number; sy: number; size: number },
): Promise<string> {
  const img = await loadHtmlImage(src);
  const bitmap = await createImageBitmap(img, crop.sx, crop.sy, crop.size, crop.size);
  try {
    return bitmapToPhotoDataUrl(bitmap);
  } finally {
    bitmap.close();
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

type AdjustSession = {
  src: string;
  revoke: boolean;
  naturalW: number;
  naturalH: number;
};

function PhotoAdjustModal({
  session,
  shape,
  accent,
  onCancel,
  onApply,
}: {
  session: AdjustSession;
  shape: "circle" | "rounded" | "square";
  accent: string;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}) {
  const baseCover = Math.max(CROP_VIEW / session.naturalW, CROP_VIEW / session.naturalH);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const displayScale = baseCover * zoom;
  const imgW = session.naturalW * displayScale;
  const imgH = session.naturalH * displayScale;

  const clampOffset = useCallback(
    (x: number, y: number, z = zoom) => {
      const scale = baseCover * z;
      const w = session.naturalW * scale;
      const h = session.naturalH * scale;
      const maxX = Math.max(0, (w - CROP_VIEW) / 2);
      const maxY = Math.max(0, (h - CROP_VIEW) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [baseCover, session.naturalH, session.naturalW, zoom],
  );

  useEffect(() => {
    setOffset((o) => clampOffset(o.x, o.y, zoom));
  }, [zoom, clampOffset]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset(clampOffset(drag.current.ox + dx, drag.current.oy + dy));
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function cropRect() {
    const left = (CROP_VIEW - imgW) / 2 + offset.x;
    const top = (CROP_VIEW - imgH) / 2 + offset.y;
    const sx = Math.max(0, Math.min(session.naturalW - 1, -left / displayScale));
    const sy = Math.max(0, Math.min(session.naturalH - 1, -top / displayScale));
    const size = Math.min(session.naturalW, session.naturalH, CROP_VIEW / displayScale);
    const sxClamped = Math.max(0, Math.min(session.naturalW - size, sx));
    const syClamped = Math.max(0, Math.min(session.naturalH - size, sy));
    return { sx: sxClamped, sy: syClamped, size };
  }

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await cropSourceToDataUrl(session.src, cropRect());
      onApply(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save photo");
      setBusy(false);
    }
  }

  const radius = shape === "circle" ? "999px" : shape === "rounded" ? "18px" : "8px";

  return (
    <div className="cv-photo-adjust" role="dialog" aria-label="Adjust photo">
      <button type="button" className="cv-photo-adjust-backdrop" aria-label="Cancel" onClick={onCancel} />
      <div className="cv-photo-adjust-sheet">
        <header className="cv-photo-adjust-head">
          <h3>Adjust photo</h3>
          <p>Drag to reposition, zoom to frame the face.</p>
        </header>

        <div
          className="cv-photo-adjust-stage"
          style={{ width: CROP_VIEW, height: CROP_VIEW, borderRadius: radius, borderColor: accent }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={session.src}
            alt=""
            draggable={false}
            style={{
              width: imgW,
              height: imgH,
              left: (CROP_VIEW - imgW) / 2 + offset.x,
              top: (CROP_VIEW - imgH) / 2 + offset.y,
            }}
          />
        </div>

        <label className="cv-photo-adjust-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        {error ? (
          <p className="cv-photo-adjust-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="cv-photo-adjust-actions">
          <button type="button" className="btn btn-ghost btn-compact" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-compact" onClick={() => void apply()} disabled={busy}>
            {busy ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CvPhotoSlot({
  photo,
  onChange,
  size = 96,
  shape = "circle",
  accent,
  label = "Add photo",
  dark,
}: {
  photo?: string;
  onChange: (next: string | undefined) => void;
  size?: number;
  shape?: "circle" | "rounded" | "square";
  accent: string;
  label?: string;
  dark?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<AdjustSession | null>(null);
  const radius = shape === "circle" ? "999px" : shape === "rounded" ? "12px" : "6px";

  const frame: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: "hidden",
    border: photo ? `2px solid ${accent}` : `2px dashed ${dark ? "rgba(255,255,255,0.45)" : accent}`,
    background: photo ? "#fff" : dark ? "rgba(255,255,255,0.08)" : `${accent}14`,
  };

  function closeSession() {
    setSession((prev) => {
      if (prev?.revoke) URL.revokeObjectURL(prev.src);
      return null;
    });
  }

  async function openAdjuster(src: string, revoke: boolean) {
    try {
      const img = await loadHtmlImage(src);
      setSession({
        src,
        revoke,
        naturalW: img.naturalWidth || img.width,
        naturalH: img.naturalHeight || img.height,
      });
    } catch {
      if (revoke) URL.revokeObjectURL(src);
    }
  }

  async function onPick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    await openAdjuster(objectUrl, true);
  }

  function onApplied(dataUrl: string) {
    closeSession();
    onChange(dataUrl);
  }

  return (
    <>
      <div className={`cv-photo-slot${photo ? " has-photo" : ""}`} style={{ width: size, flexShrink: 0 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            void onPick(e.target.files?.[0] || null);
            e.target.value = "";
          }}
        />
        <div className="cv-photo-slot-frame" style={frame}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="cv-photo-slot-img" />
          ) : (
            <button
              type="button"
              className={`cv-photo-slot-add${dark ? " is-dark" : ""}`}
              onClick={() => inputRef.current?.click()}
              style={{ color: dark ? "rgba(255,255,255,0.9)" : accent }}
            >
              <span aria-hidden>＋</span>
              <em>{label}</em>
            </button>
          )}
        </div>
        {photo ? (
          <div className="cv-photo-slot-actions">
            <button
              type="button"
              className="cv-photo-slot-btn"
              onClick={() => void openAdjuster(photo, false)}
              title="Adjust photo"
            >
              ◈
            </button>
            <button type="button" className="cv-photo-slot-btn" onClick={() => inputRef.current?.click()} title="Replace photo">
              ✎
            </button>
            <button type="button" className="cv-photo-slot-btn" onClick={() => onChange(undefined)} title="Remove photo">
              ×
            </button>
          </div>
        ) : null}
      </div>

      {session ? (
        <PhotoAdjustModal
          session={session}
          shape={shape}
          accent={accent}
          onCancel={closeSession}
          onApply={onApplied}
        />
      ) : null}
    </>
  );
}
