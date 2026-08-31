import { describe, it, expect } from "vitest";

import {
  masterModulesSchema,
  buildDefaultModules,
  normalizeModuleOrder,
  canDeleteModule,
  canAddModule,
  SINGLETON_TYPES,
  type MasterModule,
} from "@/lib/validation/master";
import { createSaveQueue, type SaveQueueState } from "@/lib/save-queue";

/**
 * M1.4 — Content Master Core tests.
 */

// ─── Fixtures ──────────────────────────────────────────

let idSeq = 0;
const nextId = () => `m-${++idSeq}`;

function skeleton(): MasterModule[] {
  return buildDefaultModules(nextId);
}

// ─── Default skeleton ──────────────────────────────────

describe("buildDefaultModules", () => {
  it("creates the PRD §8.7 skeleton with stable unique ids", () => {
    const m = skeleton();
    expect(m.map((x) => x.type)).toEqual([
      "hook",
      "core_message",
      "section",
      "section",
      "demo",
      "evidence",
      "conclusion",
      "cta",
    ]);
    expect(new Set(m.map((x) => x.id)).size).toBe(m.length);
    expect(m.every((x) => x.content === "")).toBe(true);
    expect(m.map((x) => x.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("skeleton passes validation (empty content allowed)", () => {
    expect(masterModulesSchema.safeParse(skeleton()).success).toBe(true);
  });
});

// ─── Validation rules ──────────────────────────────────

describe("masterModulesSchema", () => {
  it("rejects unknown module type", () => {
    const bad = [{ id: "x", type: "unknown_type", content: "", order: 0 }];
    expect(masterModulesSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate module ids", () => {
    const m = skeleton();
    m[1].id = m[0].id;
    expect(masterModulesSchema.safeParse(m).success).toBe(false);
  });

  it("enforces singletons: missing hook rejected, two hooks rejected", () => {
    const missing = skeleton().filter((m) => m.type !== "hook");
    expect(masterModulesSchema.safeParse(missing).success).toBe(false);

    const doubled = [...skeleton(), { id: "extra", type: "hook", content: "", order: 8 }];
    expect(masterModulesSchema.safeParse(doubled).success).toBe(false);
  });

  it("enforces all four singletons", () => {
    for (const t of SINGLETON_TYPES) {
      const removed = skeleton().filter((m) => m.type !== t);
      expect(masterModulesSchema.safeParse(removed).success).toBe(false);
    }
  });

  it("requires at least one section; multiple sections allowed", () => {
    const none = skeleton().filter((m) => m.type !== "section");
    expect(masterModulesSchema.safeParse(none).success).toBe(false);

    const many = [
      ...skeleton(),
      { id: "s3", type: "section", content: "x", order: 8 },
    ];
    expect(masterModulesSchema.safeParse(many).success).toBe(true);
  });

  it("demo and evidence may be zero or many", () => {
    const zero = skeleton().filter(
      (m) => m.type !== "demo" && m.type !== "evidence"
    );
    expect(masterModulesSchema.safeParse(zero).success).toBe(true);

    const many = [
      ...skeleton(),
      { id: "d2", type: "demo", content: "", order: 8 },
      { id: "e2", type: "evidence", content: "", order: 9 },
    ];
    expect(masterModulesSchema.safeParse(many).success).toBe(true);
  });

  it("incomplete drafts persistable: empty content strings accepted", () => {
    const m = skeleton();
    m[0].content = "";
    expect(masterModulesSchema.safeParse(m).success).toBe(true);
  });
});

// ─── Deletion / addition rules ─────────────────────────

describe("canDeleteModule", () => {
  it("singletons cannot be deleted", () => {
    const m = skeleton();
    for (const t of SINGLETON_TYPES) {
      expect(canDeleteModule(t, m)).toBe(false);
    }
  });

  it("section deletable only while more than one remains", () => {
    const m = skeleton(); // 2 sections
    expect(canDeleteModule("section", m)).toBe(true);
    const one = m.filter((x, i) => x.type !== "section" || i === 2);
    expect(canDeleteModule("section", one)).toBe(false);
  });

  it("demo and evidence freely deletable", () => {
    const m = skeleton();
    expect(canDeleteModule("demo", m)).toBe(true);
    expect(canDeleteModule("evidence", m)).toBe(true);
  });
});

describe("canAddModule", () => {
  it("singleton cannot be re-added while present", () => {
    const m = skeleton();
    for (const t of SINGLETON_TYPES) {
      expect(canAddModule(t, m)).toBe(false);
    }
  });

  it("repeatable types always addable", () => {
    const m = skeleton();
    expect(canAddModule("section", m)).toBe(true);
    expect(canAddModule("demo", m)).toBe(true);
    expect(canAddModule("evidence", m)).toBe(true);
  });
});

// ─── Identity stability + order normalization ──────────

describe("identity and order", () => {
  it("edit and reorder preserve module ids (array index is not identity)", () => {
    const m = skeleton();
    const idsBefore = m.map((x) => x.id);
    const edited = m.map((x) => ({ ...x, content: "edited" }));
    const reordered = [edited[3], edited[0], ...edited.slice(1, 3), ...edited.slice(4)];
    expect(reordered.find((x) => x.id === idsBefore[3])).toBeDefined();
    expect(new Set(reordered.map((x) => x.id))).toEqual(new Set(idsBefore));
  });

  it("server normalizes order to 0..n-1 regardless of client order", () => {
    const m = skeleton().map((x, i) => ({ ...x, order: 100 - i }));
    const normalized = normalizeModuleOrder(m);
    expect(normalized.map((x) => x.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // ids unchanged by normalization
    expect(normalized.map((x) => x.id)).toEqual(m.map((x) => x.id));
  });
});

// ─── Save queue: serialized writes, stale-ack guard ────

describe("createSaveQueue", () => {
  it("serializes writes — latest state sent after in-flight completes", async () => {
    const sent: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let calls = 0;

    const q = createSaveQueue<string>(async (s) => {
      calls++;
      if (calls === 1) await gate; // first request stays in flight
      sent.push(s);
    });

    q.enqueue("v1"); // goes in flight
    q.enqueue("v2"); // queued
    q.enqueue("v3"); // supersedes v2
    release();
    await new Promise((r) => setTimeout(r, 20));

    expect(sent).toEqual(["v1", "v3"]); // latest wins, no v2
  });

  it("stale response does not report saved when newer state exists", async () => {
    const states: SaveQueueState[] = [];
    const q = createSaveQueue<string>(async () => {}, (s) => states.push(s));

    q.enqueue("a");
    q.enqueue("b");
    await new Promise((r) => setTimeout(r, 20));

    expect(states.filter((s) => s === "saved").length).toBe(1);
    expect(states[states.length - 1]).toBe("saved");
  });

  it("failure preserves latest snapshot for retry", async () => {
    const sent: string[] = [];
    let fail = true;
    const states: SaveQueueState[] = [];
    const q = createSaveQueue<string>(
      async (s) => {
        if (fail) throw new Error("network");
        sent.push(s);
      },
      (s) => states.push(s)
    );

    q.enqueue("x");
    await new Promise((r) => setTimeout(r, 20));
    expect(states).toContain("failed");
    expect(sent).toEqual([]);

    fail = false;
    q.retry();
    await new Promise((r) => setTimeout(r, 20));
    expect(sent).toEqual(["x"]); // latest state wins after retry
  });
});
