"use client";

/**
 * ReceiptImageViewer
 *
 * Exports two things:
 *   1. <ReceiptThumbnail>  — 40×40 clickable thumbnail (or placeholder icon)
 *   2. <ReceiptCompareOverlay>  — full-screen split: image left, parsed items right
 *
 * Brand tokens: navy #080c18, gold #c9a84c, surface #0d1120, border #1a1f32
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type { ReceiptItem } from "@/lib/inventory-api";
import { getErrorMessage } from "@/lib/errors";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const FRAPPE_SITE =
  process.env.NEXT_PUBLIC_FRAPPE_SITE || "https://erp.manytalentsmore.com";

function receiptUrl(receiptFile: string): string {
  if (!receiptFile) return "";
  if (receiptFile.startsWith("http")) return receiptFile;
  return `${FRAPPE_SITE}${receiptFile}`;
}

/** Fetch receipt image via backend API (returns base64 data URL) */
async function fetchAuthImage(receiptName: string): Promise<string | null> {
  if (!receiptName) return null;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("mtm_web_auth") : null;
    if (!raw) return null;
    const { apiKey, apiSecret } = JSON.parse(raw);
    const resp = await fetch(`${FRAPPE_SITE}/api/method/hcp_replacement.hcp_replacement.api.inventory.get_receipt_image`, {
      method: "POST",
      headers: {
        Authorization: `token ${apiKey}:${apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ receipt_name: receiptName }),
    });
    if (!resp.ok) {
      console.warn("[ReceiptImage] API failed:", resp.status);
      return null;
    }
    const data = await resp.json();
    return data?.message?.data_url || null;
  } catch (e: unknown) {
    console.warn("[ReceiptImage] error:", getErrorMessage(e));
    return null;
  }
}

function fmt$$(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ──────────────────────────────────────────────
// Match confidence dot
// ──────────────────────────────────────────────

function MatchDot({ score }: { score: number }) {
  let color = "#dc3545"; // red — no/low match
  if (score >= 90) color = "#28a745"; // green
  else if (score >= 70) color = "#E67E22"; // orange

  return (
    <span
      className="inline-block h-2 w-2 rounded-full flex-shrink-0 mt-1"
      style={{ backgroundColor: color }}
      title={score ? `${Math.round(score)}% match` : "No match"}
    />
  );
}

// ──────────────────────────────────────────────
// Zoomable image pane
// ──────────────────────────────────────────────

interface ZoomPaneProps {
  src: string;
  alt: string;
}

function ZoomPane({ src, alt }: ZoomPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(true);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  // Reset zoom/pan when src changes
  useEffect(() => {
    setScale(1);
    setOrigin({ x: 0, y: 0 });
    setImgLoading(false);
    setBlobSrc(src);
  }, [src]);

  // Scroll-wheel zoom — zoom toward cursor position
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    setScale((prev) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const next = Math.min(Math.max(prev * delta, 0.5), 8);
      // Adjust origin so zoom anchors to cursor
      const ratio = next / prev;
      setOrigin((o) => ({
        x: cursorX - ratio * (cursorX - o.x),
        y: cursorY - ratio * (cursorY - o.y),
      }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Mouse drag to pan
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: origin.x, oy: origin.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setOrigin({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const onMouseUp = () => setDragging(false);

  // Touch pinch-to-zoom
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchMid = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      lastTouchDist.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      lastTouchMid.current = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const ratio = dist / lastTouchDist.current;
      lastTouchDist.current = dist;

      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = lastTouchMid.current!;
      const cursorX = mid.x - rect.left;
      const cursorY = mid.y - rect.top;

      setScale((prev) => {
        const next = Math.min(Math.max(prev * ratio, 0.5), 8);
        const r = next / prev;
        setOrigin((o) => ({
          x: cursorX - r * (cursorX - o.x),
          y: cursorY - r * (cursorY - o.y),
        }));
        return next;
      });
    }
  };

  const onTouchEnd = () => {
    lastTouchDist.current = null;
    lastTouchMid.current = null;
  };

  const resetZoom = () => {
    setScale(1);
    setOrigin({ x: 0, y: 0 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080c18] flex flex-col">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          onClick={() =>
            setScale((s) => {
              const next = Math.min(s * 1.25, 8);
              return next;
            })
          }
          className="h-8 w-8 rounded-lg bg-[#0d1120]/90 border border-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] flex items-center justify-center text-lg leading-none transition"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() =>
            setScale((s) => Math.max(s * 0.8, 0.5))
          }
          className="h-8 w-8 rounded-lg bg-[#0d1120]/90 border border-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] flex items-center justify-center text-lg leading-none transition"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="h-8 px-2 rounded-lg bg-[#0d1120]/90 border border-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] text-[11px] font-semibold transition"
          title="Reset zoom"
        >
          Reset
        </button>
      </div>

      {/* Scale indicator */}
      {scale !== 1 && (
        <div className="absolute bottom-3 left-3 z-10 bg-[#0d1120]/80 border border-[#1a1f32] text-neutral-400 text-[11px] font-mono px-2 py-1 rounded pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden select-none"
        style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {imgLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobSrc || src}
          alt={alt}
          draggable={false}
          className="absolute top-0 left-0 max-w-none"
          style={{
            transform: `translate(${origin.x}px, ${origin.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            width: "100%",
            objectFit: "contain",
            // Override above width when zoomed — let natural dimensions take over
            ...(scale !== 1 ? { width: "100%", height: "100%", objectFit: "contain" } : {}),
          }}
        />
      </div>

      <p className="absolute bottom-3 right-3 text-[10px] text-neutral-600 pointer-events-none select-none">
        Scroll to zoom · Drag to pan
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Items pane (right side of overlay)
// ──────────────────────────────────────────────

interface ItemsPaneProps {
  items: ReceiptItem[];
  supplier?: string;
  receiptName?: string;
}

function ItemsPane({ items, supplier, receiptName }: ItemsPaneProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Pane header */}
      <div className="px-5 py-4 border-b border-[#1a1f32] flex-shrink-0">
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
          Parsed Items
        </p>
        <p className="text-white font-semibold mt-0.5">
          {supplier || receiptName || "Receipt"}
        </p>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          {items.length} line{items.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm px-6 text-center">
            No parsed items found for this receipt.
          </div>
        ) : (
          <div className="divide-y divide-[#1a1f32]">
            {items.map((item) => (
              <div key={item.name} className="px-5 py-3.5 hover:bg-[#111627] transition">
                <div className="flex items-start gap-2.5">
                  <MatchDot score={item.match_score} />
                  <div className="min-w-0 flex-1">
                    {/* Description (raw from receipt) */}
                    <p className="text-[#f0ebe0] text-sm font-medium leading-tight">
                      {item.description}
                    </p>

                    {/* Matched pricebook item */}
                    {item.matched_item_name && item.matched_item_name !== item.description && (
                      <p className="text-[11px] text-[#c9a84c] mt-0.5 leading-tight">
                        {item.matched_item_name}
                      </p>
                    )}

                    {/* Product code */}
                    {item.product_code && (
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {item.product_code}
                      </p>
                    )}

                    {/* Qty + price + score row */}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500">
                      <span>Qty: <span className="text-neutral-300 font-mono">{item.quantity}</span></span>
                      <span>{fmt$$(item.unit_price)}</span>
                      {item.match_score > 0 && (
                        <span
                          className={
                            item.match_score >= 90
                              ? "text-[#28a745]"
                              : item.match_score >= 70
                              ? "text-[#E67E22]"
                              : "text-[#dc3545]"
                          }
                        >
                          {Math.round(item.match_score)}% match
                        </span>
                      )}
                      {item.destination && item.destination !== "Limbo" && (
                        <span className="text-neutral-600">{item.destination}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Overlay
// ──────────────────────────────────────────────

export interface ReceiptCompareOverlayProps {
  receiptFile: string | null | undefined;
  items: ReceiptItem[];
  supplier?: string;
  receiptName?: string;
  onClose: () => void;
}

export function ReceiptCompareOverlay({
  receiptFile,
  items,
  supplier,
  receiptName,
  onClose,
}: ReceiptCompareOverlayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    setImgLoading(true);
    if (receiptName) {
      fetchAuthImage(receiptName).then((url) => {
        setImageUrl(url);
        setImgLoading(false);
      });
    } else if (receiptFile) {
      setImageUrl(receiptUrl(receiptFile));
      setImgLoading(false);
    } else {
      setImgLoading(false);
    }
  }, [receiptFile, receiptName]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#080c18]"
      role="dialog"
      aria-modal="true"
      aria-label="Receipt comparison"
    >
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[#1a1f32] flex-shrink-0 bg-[#0d1120]">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
            Receipt Verification
          </p>
          <p className="text-white font-semibold text-sm truncate">
            {supplier || receiptName || "Receipt"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-xl bg-[#1a1f32] hover:bg-[#252b44] text-neutral-400 hover:text-white transition flex items-center justify-center flex-shrink-0"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Two-pane body */}
      {/* Desktop: side by side. Mobile: stacked (image top, items bottom). */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

        {/* LEFT — receipt image */}
        <div className="relative flex-1 md:flex-[3] min-h-0 md:min-h-full border-b border-[#1a1f32] md:border-b-0 md:border-r md:border-[#1a1f32]"
          style={{ minHeight: "40vh", maxHeight: "60vh" }}
        >
          {/* On md+ the explicit heights are irrelevant — flex handles it */}
          <div className="h-full w-full" style={{ minHeight: "inherit", maxHeight: "inherit" }}>
            {imgLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : imageUrl ? (
              <ZoomPane src={imageUrl} alt={`Receipt from ${supplier || receiptName || "supplier"}`} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 gap-4">
                <svg
                  className="w-14 h-14 text-neutral-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.25}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-neutral-500 text-sm font-medium">No receipt image available</p>
                <p className="text-neutral-600 text-xs">
                  This receipt was submitted without an image (e.g. Lowe&apos;s body receipt).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — parsed items */}
        <div className="flex-1 md:flex-[2] overflow-hidden bg-[#0d1120] min-h-0" style={{ minHeight: "40vh" }}>
          <ItemsPane items={items} supplier={supplier} receiptName={receiptName} />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Thumbnail
// ──────────────────────────────────────────────

export interface ReceiptThumbnailProps {
  receiptFile: string | null | undefined;
  items: ReceiptItem[];
  supplier?: string;
  receiptName?: string;
  /** Extra class on the outer wrapper */
  className?: string;
}

export function ReceiptThumbnail({
  receiptFile,
  items,
  supplier,
  receiptName,
  className = "",
}: ReceiptThumbnailProps) {
  const [open, setOpen] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (receiptName) {
      fetchAuthImage(receiptName).then(setThumbUrl);
    } else if (receiptFile) {
      setThumbUrl(receiptUrl(receiptFile));
    }
  }, [receiptFile, receiptName]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden border border-[#1a1f32] hover:border-[#c9a84c]/60 transition relative group ${className}`}
        title={receiptFile ? "View receipt" : "No image — view parsed items"}
        aria-label="View receipt"
      >
        {thumbUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbUrl}
            alt="Receipt thumbnail"
            className="h-full w-full object-cover"
          />
        ) : (
          /* Placeholder icon */
          <div className="h-full w-full bg-[#1a1f32] flex items-center justify-center">
            <svg
              className="w-5 h-5 text-neutral-500 group-hover:text-[#c9a84c] transition"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        )}

        {/* Hover magnify indicator */}
        <div className="absolute inset-0 bg-[#c9a84c]/0 group-hover:bg-[#c9a84c]/10 transition rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition drop-shadow"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0zM11 8v6M8 11h6" />
          </svg>
        </div>
      </button>

      {open && (
        <ReceiptCompareOverlay
          receiptFile={receiptFile}
          items={items}
          supplier={supplier}
          receiptName={receiptName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
