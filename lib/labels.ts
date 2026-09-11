/**
 * M6 — Authoritative Chinese product-language layer (presentation only).
 *
 * Chinese-first V1: one authoritative mapping from internal enum keys
 * (unchanged) to user-facing Simplified Chinese. Known enums are fully
 * covered; unknown values fall back to a humanized form so raw
 * snake_case never reaches the UI. No domain/enum/schema semantics
 * live here — display only. Page-specific sentences stay local.
 */

function humanize(key: string): string {
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fromMap(map: Record<string, string>) {
  return (key: string | null | undefined): string => {
    if (!key) return "";
    return map[key] ?? humanize(key);
  };
}

// ─── Platforms（小红书 / Bilibili / 抖音） ─────────────

export const platformLabel = fromMap({
  xiaohongshu: "小红书",
  bilibili: "Bilibili",
  douyin: "抖音",
});

// ─── Navigation ────────────────────────────────────────

export const NAV_LABELS = {
  home: "首页",
  radar: "选题雷达",
  studio: "内容工作台",
  pipeline: "内容流程",
  analytics: "数据复盘",
  settings: "设置",
} as const;

// ─── Content / workflow statuses ───────────────────────

export const contentStatusLabel = fromMap({
  planning: "策划中",
  in_progress: "制作中",
  review: "待审核",
  scheduled: "待发布",
  published: "已发布",
});

export const versionStatusLabel = fromMap({
  draft: "草稿",
  review: "审核中",
  approved: "已通过",
  published: "已发布",
});

export const signalStatusLabel = fromMap({
  new: "新线索",
  reviewing: "评估中",
  selected: "已选用",
  skipped: "已跳过",
});

export const briefStatusLabel = fromMap({
  draft: "草稿",
  approved: "已确认",
});

// ─── Tests ─────────────────────────────────────────────

export const testStatusLabel = fromMap({
  running: "进行中",
  concluded: "已完成",
});

export const testMethodLabel = fromMap({
  ab: "A/B",
  sequential: "连续对比",
  before_after: "前后对比",
  content_comparison: "内容对比",
});

export const testRoleLabel = fromMap({
  control: "对照",
  variant: "变体",
  comparison: "对比项",
});

export const testOutcomeLabel = fromMap({
  win: "支持假设",
  loss: "不支持假设",
  trade_off: "有得有失",
  no_clear_result: "无明确结论",
});

export const confidenceLabel = fromMap({
  high: "高置信度",
  medium: "中置信度",
  low: "低置信度",
  insufficient_evidence: "证据不足",
});

// ─── Metric snapshot status ────────────────────────────

export const snapshotStatusLabel = fromMap({
  submitted: "已提交",
  due: "待录入",
  not_due: "未到时间",
});

// ─── Helpers (static product copy) ─────────────────────

export const TEST_METHOD_HELPERS: Record<string, string> = {
  ab: "对同一改动做两个变体，比较同一指标。",
  sequential: "在连续多篇内容上做同一改动，依次对比。",
  before_after: "对比策略调整前后的表现。",
  content_comparison: "比较两条或多条内容的同一指标。",
};

export const TEST_METHODS_FOOTNOTE =
  "方法只描述对比方式。ContentLoop 不做统计显著性检验。";

export const TEST_SECTION_HELPER =
  "运营测试用来回答一个具体的运营问题——对照已发布内容的真实数据。";

export const TEST_ROLE_HELPER =
  "角色只是用于解读的组织标记，不影响证据计算和结论条件。";

export const CHECKPOINT_HELPER =
  "选择读取哪个数据点：发布后约 24 或 72 小时。";

export const PRIMARY_METRIC_HELPER =
  "你判断这次测试时主要看的那项指标，它不会自动决定结论。";

export const TEST_OUTCOME_HELPERS: Record<string, string> = {
  win: "观察到的证据支持这个假设。",
  loss: "观察到的证据不支持这个假设。",
  trade_off: "证据明显好坏参半。",
  no_clear_result: "观察到的证据没有明确指向任何一个方向。",
};

/** 与 no_clear_result 不同：是数据不足以解读。 */
export const INSUFFICIENT_EVIDENCE_HELPER =
  "没有足够的可用证据来可靠地解读这个结果。";

// ─── Baseline copy（自身历史，绝非行业基准） ───────────

export const BASELINE_ACCOUNT_HELPER =
  "来自本工作区同平台、同数据点的最近 20 条可比发布的中位数。不是行业基准。";

export const BASELINE_PILLAR_HELPER =
  "来自同内容方向、同平台、同数据点的最近 20 条可比发布的中位数。不是行业基准。";

/** n = 单项指标有历史数据的发布数，不是候选总数。 */
export const BASELINE_N_HELPER =
  "n = 该指标有历史数据的发布数。";

/**
 * 基线说明（Analytics 对比表）。必须完整承载 M2.4 口径：
 * 自身工作区历史、最多 20 条、同平台同数据点、方向基线再加同内容方向、
 * 绝非行业基准、n 为单项指标有值的发布数。
 */
export const BASELINE_COHORT_HELPER =
  "中位数来自本工作区最近 20 条同平台、同数据点的可比发布；方向中位数还要求同内容方向。它们不是行业基准。n = 该指标有历史数据的发布数。";

// ─── Metric input semantics（blank ≠ N/A ≠ 0） ─────────

export const METRIC_NA_HELPER =
  "N/A 表示本次没有该项数据，并不等于 0；0 表示实际记录到的数值为 0。";

export const METRIC_BLANK_HELPER =
  "留空表示这项数据还没录入。保存前请填数字，或标记为 N/A。";

// ─── Learning / Apply boundaries ───────────────────────

export const LEARNING_APPLY_HELPER =
  "仅作为参考标记——不会改变内容简报、内容母稿或平台版本。";

export const AI_PROPOSAL_APPLY_HELPER =
  "应用只是把草稿放进编辑区。保存后才会真正写入。";

// ─── Demo provenance（DEMO 徽章保留英文） ──────────────

/**
 * DEMO visual trust. Authority is contents.isDemo only — never title
 * or notes heuristics. Badge stays "DEMO"; explanation is Chinese.
 */
export const DEMO_BADGE_LABEL = "DEMO";

/** 与 M4.1 行为一致：demo 目标可读，cohort 仅真实数据。 */
export const DEMO_NOTICE =
  "演示数据——仅供产品体验。演示发布不进入运营基线。";

// ─── Home sections ─────────────────────────────────────

export const HOME_SECTIONS = {
  needsAttention: "待处理",
  continueWorking: "继续创作",
  monitoring: "跟进中",
} as const;

/** 品牌陈述：语义化产品主张，非操作标签。 */
export const HOME_THESIS = "让每次表现，成为下一次创作的依据。";
