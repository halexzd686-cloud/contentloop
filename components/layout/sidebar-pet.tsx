"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { platformLabel } from "@/lib/labels";
import type { AttentionModel } from "@/lib/attention";

/**
 * 小环 — sidebar pet (M9, user-approved 2026-09-23).
 *
 * Hand-drawn SVG mint blob (GLOB-style: soft blob + two capsule eyes),
 * token-only colors — dark mode follows for free; the volume gradient
 * stops use style="stop-color:var(--…)" because SVG presentation
 * attributes don't support var().
 *
 * Real data only: badge / gaze / panel all come from GET /api/attention,
 * fetched on mount + pathname change (no polling, no global store).
 * Fetch failure is silent — the pet stays calm, no error chrome.
 *
 * Idle motion: ~6s blink only (CSS, transform-only keyframes — §25
 * approved exception); otherwise still. Pointer drag tilts ±15° with a
 * slight translate and settles back in 260ms (single return, no bounce);
 * <5px displacement counts as a click and toggles the attention panel.
 */

const BLOB =
  "M20 5 C27.5 5 34 10.5 34.8 19.5 C35.6 28.5 28.5 35.5 20 35.5 C11.5 35.5 4.4 28.5 5.2 19.5 C6 10.5 12.5 5 20 5 Z";

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

export function SidebarPet() {
  const pathname = usePathname();
  const [model, setModel] = useState<AttentionModel | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const total = model?.total ?? 0;

  useEffect(() => {
    let alive = true;
    fetch("/api/attention")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setModel(d);
      })
      .catch(() => {
        /* silent: the pet stays calm, no error chrome */
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (blobRef.current) blobRef.current.style.transition = "none";
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    const el = blobRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) movedRef.current = true;
    if (!movedRef.current) return;
    el.style.transform = `translate(${clamp(dx * 0.2, 6)}px, ${clamp(
      dy * 0.2,
      6
    )}px) rotate(${clamp(dx * 0.5, 15)}deg)`;
  }

  function onPointerUp() {
    dragRef.current = null;
    const el = blobRef.current;
    if (el) {
      el.style.transition = "transform 260ms ease-out";
      el.style.transform = "";
    }
  }

  function onClick() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={wrapRef} className="relative flex justify-center pb-2">
      <button
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`小环 · 需要关注${total > 0 ? `（${total} 项）` : ""}`}
        aria-expanded={open}
        className="relative flex cursor-pointer touch-none items-center justify-center py-1"
      >
        <span ref={blobRef} className="block will-change-transform">
          <svg viewBox="0 0 40 40" className="sidebar-pet block" aria-hidden>
            <defs>
              <radialGradient id="pet-volume" cx="0.35" cy="0.3" r="1">
                <stop
                  offset="0%"
                  style={{ stopColor: "var(--cl-primary)", stopOpacity: 0 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "var(--cl-primary-deep)" }}
                />
              </radialGradient>
            </defs>
            <path d={BLOB} style={{ fill: "var(--cl-primary)" }} />
            <path d={BLOB} fill="url(#pet-volume)" opacity="0.55" />
            {/* gaze: outer group shifts toward the panel when attention
                items exist (150ms); inner group owns the blink animation
                so the two transforms never fight */}
            <g
              style={{
                transform:
                  total > 0 ? "translate(1.6px, 1.2px)" : "translate(0px, 0px)",
                transition: "transform 150ms ease-out",
              }}
            >
              <g className="pet-eyes">
                <rect
                  x="13.4"
                  y="14"
                  width="4.2"
                  height="7.6"
                  rx="2.1"
                  style={{ fill: "var(--cl-surface)" }}
                />
                <rect
                  x="22.4"
                  y="14"
                  width="4.2"
                  height="7.6"
                  rx="2.1"
                  style={{ fill: "var(--cl-surface)" }}
                />
              </g>
            </g>
          </svg>
        </span>
        {total > 0 && (
          <span
            className="absolute -right-1.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
            style={{ background: "var(--cl-gold)", color: "#20231F" }}
          >
            {total}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="小环 · 需要关注"
          className="absolute bottom-full left-2 z-40 mb-2 w-[264px] rounded-[9px] p-4"
          style={{
            background: "var(--cl-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 28px var(--ink-tint)",
          }}
        >
          <div className="flex items-baseline justify-between">
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--cl-ink-strong)" }}
            >
              小环 · 需要关注
            </span>
            <span
              className="text-xs tabular-nums"
              style={{ color: "var(--ink-muted)" }}
            >
              {total}
            </span>
          </div>

          {!model || total === 0 ? (
            <p className="mt-3 text-xs" style={{ color: "var(--cl-neutral)" }}>
              一切就绪，没有待办。
            </p>
          ) : (
            <div className="mt-3 space-y-3.5">
              {model.dueMetrics.length > 0 && (
                <section>
                  <p
                    className="text-[11px] font-medium tracking-[0.14em]"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    待录入指标
                  </p>
                  <div className="mt-1">
                    {model.dueMetrics.map((d, i) => (
                      <Link
                        key={`${d.publicationId}:${d.checkpoint}`}
                        href="/app/analytics"
                        onClick={() => setOpen(false)}
                        className="-mx-2 block rounded-[5px] px-2 py-2 transition-colors duration-150 hover:bg-[var(--mint-tint)]"
                        style={{
                          borderTop:
                            i === 0
                              ? "none"
                              : "1px solid var(--border-hairline)",
                        }}
                      >
                        <span
                          className="block truncate text-[13px]"
                          style={{ color: "var(--cl-ink-strong)" }}
                        >
                          {d.finalTitle}
                        </span>
                        <span
                          className="mt-0.5 block text-[11px]"
                          style={{ color: "var(--cl-neutral)" }}
                        >
                          {platformLabel(d.platform)} · {d.checkpoint} 待录入
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {model.reviewContents.length > 0 && (
                <section>
                  <p
                    className="text-[11px] font-medium tracking-[0.14em]"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    待审核
                  </p>
                  <div className="mt-1">
                    {model.reviewContents.map((c, i) => (
                      <Link
                        key={c.id}
                        href="/app/pipeline"
                        onClick={() => setOpen(false)}
                        className="-mx-2 block rounded-[5px] px-2 py-2 transition-colors duration-150 hover:bg-[var(--mint-tint)]"
                        style={{
                          borderTop:
                            i === 0
                              ? "none"
                              : "1px solid var(--border-hairline)",
                        }}
                      >
                        <span
                          className="block truncate text-[13px]"
                          style={{ color: "var(--cl-ink-strong)" }}
                        >
                          {c.title}
                        </span>
                        <span
                          className="mt-0.5 block text-[11px]"
                          style={{ color: "var(--cl-neutral)" }}
                        >
                          等待审核
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {model.runningTests.length > 0 && (
                <section>
                  <p
                    className="text-[11px] font-medium tracking-[0.14em]"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    进行中测试
                  </p>
                  <div className="mt-1">
                    {model.runningTests.map((t, i) => (
                      <Link
                        key={t.id}
                        href="/app/analytics"
                        onClick={() => setOpen(false)}
                        className="-mx-2 block rounded-[5px] px-2 py-2 transition-colors duration-150 hover:bg-[var(--mint-tint)]"
                        style={{
                          borderTop:
                            i === 0
                              ? "none"
                              : "1px solid var(--border-hairline)",
                        }}
                      >
                        <span
                          className="block truncate text-[13px]"
                          style={{ color: "var(--cl-ink-strong)" }}
                        >
                          {t.title}
                        </span>
                        <span
                          className="mt-0.5 block text-[11px]"
                          style={{ color: "var(--cl-neutral)" }}
                        >
                          进行中
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
