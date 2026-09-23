"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MODULE_TYPES,
  canAddModule,
  canDeleteModule,
  type MasterModule,
  type ModuleType,
} from "@/lib/validation/master";
import type { SaveQueueState } from "@/lib/save-queue";

/**
 * Master Editor — M1.4
 * Structured modules: drag reorder (primary) + up/down (a11y fallback),
 * add/delete per module rules, plain-text editing.
 * Auto-save: text edits debounced (parent), structural changes immediate.
 */

const MODULE_LABEL: Record<ModuleType, string> = {
  hook: "开头钩子",
  core_message: "核心信息",
  section: "章节",
  demo: "演示示例",
  evidence: "证据",
  conclusion: "总结",
  cta: "行动引导",
};

const SAVE_LABEL: Record<SaveQueueState, string> = {
  idle: "",
  pending: "编辑中…",
  saving: "保存中…",
  saved: "已保存",
  failed: "保存失败",
};

interface MasterEditorProps {
  modules: MasterModule[];
  readOnly: boolean;
  saveState: SaveQueueState;
  onTextChange: (id: string, content: string) => void;
  onStructuralChange: (modules: MasterModule[]) => void;
  onRetrySave: () => void;
}

export function MasterEditor({
  modules,
  readOnly,
  saveState,
  onTextChange,
  onStructuralChange,
  onRetrySave,
}: MasterEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = modules.findIndex((m) => m.id === active.id);
    const to = modules.findIndex((m) => m.id === over.id);
    if (from === -1 || to === -1) return;
    onStructuralChange(arrayMove(modules, from, to));
  }

  function move(id: string, dir: -1 | 1) {
    const from = modules.findIndex((m) => m.id === id);
    const to = from + dir;
    if (from === -1 || to < 0 || to >= modules.length) return;
    onStructuralChange(arrayMove(modules, from, to));
  }

  function remove(id: string) {
    onStructuralChange(modules.filter((m) => m.id !== id));
  }

  function add(type: ModuleType) {
    if (!canAddModule(type, modules)) return;
    onStructuralChange([
      ...modules,
      { id: crypto.randomUUID(), type, content: "", order: modules.length },
    ]);
  }

  const addableTypes = useMemo(
    () => MODULE_TYPES.filter((t) => canAddModule(t, modules)),
    [modules]
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
          {modules.length} 个模块 · 拖动手柄调整顺序
        </p>
        <span
          className={`text-xs ${
            saveState === "failed"
              ? "text-danger"
              : saveState === "saved"
                ? "text-mint-600"
                : "text-ink-muted"
          }`}
        >
          {SAVE_LABEL[saveState]}
          {saveState === "failed" && (
            <button className="ml-1 underline" onClick={onRetrySave}>
              重试
            </button>
          )}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={modules.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {modules.map((m, i) => (
              <SortableModule
                key={m.id}
                module={m}
                index={i}
                total={modules.length}
                readOnly={readOnly}
                deletable={!readOnly && canDeleteModule(m.type, modules)}
                onTextChange={onTextChange}
                onMove={move}
                onRemove={remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {addableTypes.map((t) => (
            <Button
              key={t}
              variant="ghost"
              size="sm"
              onClick={() => add(t)}
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              {MODULE_LABEL[t]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sortable module row ───────────────────────────────

interface SortableModuleProps {
  module: MasterModule;
  index: number;
  total: number;
  readOnly: boolean;
  deletable: boolean;
  onTextChange: (id: string, content: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
}

function SortableModule({
  module,
  index,
  total,
  readOnly,
  deletable,
  onTextChange,
  onMove,
  onRemove,
}: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: readOnly });

  const [focused, setFocused] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        borderBottom:
          index < total - 1 ? "1px solid var(--border-hairline)" : "none",
        background: isDragging ? "var(--mint-tint)" : undefined,
      }}
      className="group py-[18px]"
    >
      <div className="flex items-center gap-2">
        {!readOnly && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-ink-faint transition-colors hover:text-ink-primary active:cursor-grabbing"
            aria-label={`拖动${MODULE_LABEL[module.type]}模块`}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <span
          className="text-xs font-semibold tracking-[0.04em]"
          style={{ color: "var(--cl-neutral)" }}
        >
          {MODULE_LABEL[module.type]}
        </span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {!readOnly && (
            <>
              <button
                onClick={() => onMove(module.id, -1)}
                disabled={index === 0}
                className="p-1 text-ink-faint hover:text-ink-primary disabled:opacity-30"
                aria-label="上移"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => onMove(module.id, 1)}
                disabled={index === total - 1}
                className="p-1 text-ink-faint hover:text-ink-primary disabled:opacity-30"
                aria-label="下移"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </>
          )}
          {deletable && (
            <button
              onClick={() => onRemove(module.id)}
              className="p-1 text-ink-faint hover:text-danger"
              aria-label="删除模块"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <textarea
        value={module.content}
        onChange={(e) => onTextChange(module.id, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={readOnly}
        rows={
          focused
            ? Math.max(4, module.content.split("\n").length)
            : Math.max(
                2,
                module.content.split("\n").length,
                Math.ceil(module.content.length / 52)
              )
        }
        placeholder={
          module.type === "evidence"
            ? "只写来自真实数据的证据。没有就写：证据仍需验证。"
            : `${MODULE_LABEL[module.type]}内容…`
        }
        className="mt-2 w-full resize-none border-0 bg-transparent text-[14.5px] leading-[1.7] text-ink-primary placeholder:text-ink-faint focus:outline-none read-only:text-ink-secondary"
      />
    </div>
  );
}
