"use client";

import { useRef, type CSSProperties } from "react";

/** Resize + compress an image file to a data URL suitable for draft JSON. */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 480;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process photo");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > 420_000) throw new Error("Photo is too large — try a smaller image");
  return dataUrl;
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
  const radius = shape === "circle" ? "999px" : shape === "rounded" ? "12px" : "6px";

  const shell: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
    border: photo ? `2px solid ${accent}` : `2px dashed ${dark ? "rgba(255,255,255,0.45)" : accent}`,
    background: photo ? "#fff" : dark ? "rgba(255,255,255,0.08)" : `${accent}14`,
  };

  async function onPick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    try {
      const url = await fileToPhotoDataUrl(file);
      onChange(url);
    } catch {
      /* ignore oversized / bad files */
    }
  }

  return (
    <div className="cv-photo-slot" style={shell}>
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
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="cv-photo-slot-img" />
          <div className="cv-photo-slot-actions">
            <button type="button" className="cv-photo-slot-btn" onClick={() => inputRef.current?.click()} title="Replace photo">
              ✎
            </button>
            <button type="button" className="cv-photo-slot-btn" onClick={() => onChange(undefined)} title="Remove photo">
              ×
            </button>
          </div>
        </>
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
  );
}
