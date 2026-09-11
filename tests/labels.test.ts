import { describe, it, expect } from "vitest";

import {
  platformLabel,
  contentStatusLabel,
  versionStatusLabel,
  signalStatusLabel,
  briefStatusLabel,
  testStatusLabel,
  testMethodLabel,
  testRoleLabel,
  testOutcomeLabel,
  confidenceLabel,
  snapshotStatusLabel,
  NAV_LABELS,
  TEST_METHOD_HELPERS,
  TEST_METHODS_FOOTNOTE,
  TEST_ROLE_HELPER,
  CHECKPOINT_HELPER,
  PRIMARY_METRIC_HELPER,
  TEST_OUTCOME_HELPERS,
  INSUFFICIENT_EVIDENCE_HELPER,
  BASELINE_ACCOUNT_HELPER,
  BASELINE_PILLAR_HELPER,
  BASELINE_N_HELPER,
  BASELINE_COHORT_HELPER,
  METRIC_NA_HELPER,
  METRIC_BLANK_HELPER,
  LEARNING_APPLY_HELPER,
  HOME_THESIS,
} from "@/lib/labels";
import { TEST_METHODS, TEST_ROLES } from "@/lib/validation/test";

/**
 * M6 — authoritative Chinese product-language layer. Frozen enums keep
 * English keys; labels are Simplified Chinese. Known enums fully
 * covered; unknown values never leak raw snake_case.
 */

describe("label coverage (Chinese-first)", () => {
  it("platforms: 小红书 / Bilibili / 抖音", () => {
    expect(platformLabel("xiaohongshu")).toBe("小红书");
    expect(platformLabel("bilibili")).toBe("Bilibili");
    expect(platformLabel("douyin")).toBe("抖音");
  });

  it("navigation set is the approved six", () => {
    expect(NAV_LABELS).toEqual({
      home: "首页",
      radar: "选题雷达",
      studio: "内容工作台",
      pipeline: "内容流程",
      analytics: "数据复盘",
      settings: "设置",
    });
  });

  it("content statuses", () => {
    expect(contentStatusLabel("planning")).toBe("策划中");
    expect(contentStatusLabel("in_progress")).toBe("制作中");
    expect(contentStatusLabel("review")).toBe("待审核");
    expect(contentStatusLabel("scheduled")).toBe("待发布");
    expect(contentStatusLabel("published")).toBe("已发布");
  });

  it("version statuses", () => {
    expect(versionStatusLabel("review")).toBe("审核中");
    for (const s of ["draft", "review", "approved", "published"])
      expect(versionStatusLabel(s)).not.toContain("_");
  });

  it("signal statuses", () => {
    expect(signalStatusLabel("new")).toBe("新线索");
    expect(signalStatusLabel("reviewing")).toBe("评估中");
    expect(signalStatusLabel("selected")).toBe("已选用");
    expect(signalStatusLabel("skipped")).toBe("已跳过");
  });

  it("brief: 草稿 / 已确认（确认 not 批准）", () => {
    expect(briefStatusLabel("draft")).toBe("草稿");
    expect(briefStatusLabel("approved")).toBe("已确认");
  });

  it("test statuses", () => {
    expect(testStatusLabel("running")).toBe("进行中");
    expect(testStatusLabel("concluded")).toBe("已完成");
  });

  it("every known test method has a Chinese label and helper", () => {
    for (const m of TEST_METHODS) {
      expect(testMethodLabel(m)).not.toContain("_");
      expect(TEST_METHOD_HELPERS[m]).toBeTruthy();
    }
    expect(TEST_METHODS_FOOTNOTE).toContain("统计显著性");
  });

  it("every known test role has a Chinese label", () => {
    for (const r of TEST_ROLES) expect(testRoleLabel(r)).not.toContain("_");
    expect(TEST_ROLE_HELPER).toContain("不影响证据计算");
  });

  it("outcomes: 支持假设/不支持假设/有得有失/无明确结论 — never 假设成立", () => {
    expect(testOutcomeLabel("win")).toBe("支持假设");
    expect(testOutcomeLabel("loss")).toBe("不支持假设");
    expect(testOutcomeLabel("trade_off")).toBe("有得有失");
    expect(testOutcomeLabel("no_clear_result")).toBe("无明确结论");
    for (const o of ["win", "loss", "trade_off", "no_clear_result"]) {
      expect(TEST_OUTCOME_HELPERS[o]).toBeTruthy();
    }
  });

  it("confidence: 证据不足 reads correctly", () => {
    expect(confidenceLabel("insufficient_evidence")).toBe("证据不足");
  });

  it("snapshot statuses: 已提交 / 待录入 / 未到时间", () => {
    expect(snapshotStatusLabel("submitted")).toBe("已提交");
    expect(snapshotStatusLabel("due")).toBe("待录入");
    expect(snapshotStatusLabel("not_due")).toBe("未到时间");
  });

  it("unknown fallback humanizes instead of exposing snake_case", () => {
    expect(platformLabel("some_future_platform")).toBe("Some future platform");
    expect(testOutcomeLabel("future_outcome")).not.toContain("_");
  });

  it("null/empty stays empty", () => {
    expect(platformLabel(null)).toBe("");
    expect(testStatusLabel(undefined)).toBe("");
  });
});

describe("semantic boundaries (Chinese)", () => {
  it("无明确结论 ≠ 证据不足", () => {
    expect(TEST_OUTCOME_HELPERS.no_clear_result).toContain("没有明确指向");
    expect(INSUFFICIENT_EVIDENCE_HELPER).toContain("没有足够的可用证据");
    expect(TEST_OUTCOME_HELPERS.no_clear_result).not.toBe(INSUFFICIENT_EVIDENCE_HELPER);
  });

  it("baseline copy: 自身历史 / 最多 20 条 / 同平台同数据点 / 方向基线加同方向 / 非行业基准", () => {
    for (const h of [BASELINE_ACCOUNT_HELPER, BASELINE_PILLAR_HELPER]) {
      expect(h).toContain("20");
      expect(h).toContain("不是行业基准");
      expect(h).not.toContain("industry average");
    }
    const c = BASELINE_COHORT_HELPER;
    expect(c).toContain("本工作区");
    expect(c).toContain("20");
    expect(c).toContain("同平台");
    expect(c).toContain("方向中位数还要求同内容方向");
    expect(c).toContain("不是行业基准");
    expect(c).toContain("n = 该指标有历史数据的发布数");
  });

  it("n helper 是单项指标有值发布数", () => {
    expect(BASELINE_N_HELPER).toContain("该指标有历史数据");
  });

  it("N/A ≠ 0；留空 = 未录入；不归因平台", () => {
    expect(METRIC_NA_HELPER).toContain("并不等于 0");
    expect(METRIC_NA_HELPER).not.toContain("平台不提供");
    expect(METRIC_BLANK_HELPER).toContain("还没录入");
  });

  it("Learning Apply 不暗示改写内容", () => {
    expect(LEARNING_APPLY_HELPER).toContain("不会改变");
  });

  it("checkpoint / primary metric helpers 符合冻结语义", () => {
    expect(CHECKPOINT_HELPER).toContain("发布后约 24 或 72 小时");
    expect(PRIMARY_METRIC_HELPER).toContain("不会自动决定结论");
  });

  it("Home thesis 是批准的中文陈述", () => {
    expect(HOME_THESIS).toBe("让每次表现，成为下一次创作的依据。");
  });
});
