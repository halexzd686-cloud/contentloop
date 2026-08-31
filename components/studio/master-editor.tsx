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

import { Badge } from "@/components/ui/badge";
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
  hook: "Hook",
  core_message: "Core Message",
  section: "Section",
  demo: "Demo / Example",
  evidence: "Evidence",
  conclusion: "Conclusion",
  cta: "CTA",
};

const SAVE_LABEL: Record<SaveQueueState, string> = {
  idle: "",
  pending: "Editing…",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed",
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
        <p className="text-xs text-ink-muted">
          {modules.length} modules · drag the handle to reorder
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
              Retry
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
          <div className="space-y-2">
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
      }}
      className={`rounded-[8px] border bg-workspace ${
        isDragging ? "border-mint-600 shadow-sm" : "border-border"
      }`}
    >
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {!readOnly && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-ink-faint hover:text-ink-primary active:cursor-grabbing"
            aria-label={`Drag ${MODULE_LABEL[module.type]} module`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <Badge variant="default">{MODULE_LABEL[module.type]}</Badge>
        <div className="ml-auto flex items-center gap-0.5">
          {!readOnly && (
            <>
              <button
                onClick={() => onMove(module.id, -1)}
                disabled={index === 0}
                className="p-1 text-ink-faint hover:text-ink-primary disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => onMove(module.id, 1)}
                disabled={index === total - 1}
                className="p-1 text-ink-faint hover:text-ink-primary disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </>
          )}
          {deletable && (
            <button
              onClick={() => onRemove(module.id)}
              className="p-1 text-ink-faint hover:text-danger"
              aria-label="Delete module"
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
        rows={focused || module.content ? 4 : 2}
        placeholder={
          module.type === "evidence"
            ? 'Evidence from real data only. If none: "Evidence still needs verification."'
            : `${MODULE_LABEL[module.type]} content…`
        }
        className="w-full resize-y rounded-b-[8px] bg-transparent px-3 py-2 text-sm text-ink-primary placeholder:text-ink-faint focus-visible:outline-none read-only:text-ink-secondary"
      />
    </div>
  );
}
