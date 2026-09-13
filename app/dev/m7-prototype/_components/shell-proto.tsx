"use client";

import { M7RailDemo } from "./rail";

/**
 * M7 High-Fidelity Prototype — App Shell / Editorial Rail
 * Route: /dev/m7-prototype/shell (isolated, no production nav entry)
 *
 * Spec: ContentLoop_M7_Visual_Design_Spec.md §34–37
 * Icons: set XIII 金属刻度 (approved via mock .shots/hd-i13.png).
 * The right side is a neutral workspace placeholder — page bodies are
 * separate prototypes.
 */
export function ShellProto() {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#F5F6F3", color: "#20231F" }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+SC:wght@400;500;600&display=swap"
      />
      <M7RailDemo />

      {/* ── Main workspace: paper surface, neutral placeholder ── */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <p
          className="text-[11px] font-medium"
          style={{ color: "#8B8E87", letterSpacing: "0.14em" }}
        >
          工作区基底（Home 正文为独立原型 /dev/m7-prototype/home）
        </p>
        <div className="mt-6 space-y-3">
          {[0.42, 0.3, 0.36].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded-[3px]"
              style={{
                width: `${w * 100}%`,
                background: "rgba(200,201,203,0.35)",
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
