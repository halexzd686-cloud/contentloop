# M6 Summary — Chinese UX Localization（Frozen）

> Status: M6 **Frozen**（最终 Human 中文 UX 验收通过）。
>
> 前置：M5 系列见 `M5-summary.md`；M5.7 Functional Freeze 仍生效。

## Completed

### M6 — Chinese UX Localization（Frozen）

- **Chinese-first V1**：产品主体简体中文；用户内容原文不动；无 locale 路由/切换器/双词典/翻译框架/i18n 基础设施
- **权威语言层**：`lib/labels.ts` 成为权威中文产品语言层——枚举键保持英文不变，标签全部中文；fallback humanize 不裸漏 snake_case；导航/状态/平台/测试方法/角色/结果/置信度/快照状态/helper 文案集中
- **六面传播**：首页 / 选题雷达 / 内容工作台（列表+详情）/ 内容流程 / 数据复盘 / 设置 + sidebar
- **交互文案**：modal/drawer/确认/校验/空态/AI 状态/DEMO notice/lib 服务端 ReviewError 全中文化；破坏性确认精确到对象（归档这条内容？/ 放弃这个测试？）；lib/import 行级 reason 中文化并同步客户端解析
- **定稿术语**：选题线索/内容简报/**内容母稿**（非母版）/发布记录/表现诊断/运营测试/运营经验/内容方向/平台规范/选题评分
- **结果四态**：支持假设 / 不支持假设 / 有得有失 / 无明确结论（不用"假设成立"，不暗示统计显著性）
- **AI 权威语言**：AI 提供建议，最终由你确认。Loop AI 名称保留；AI 三类脱敏错误文案中文化（状态码/边界/手动流不变）
- **数据语义**：留空=还没录入 / N/A=本次没有该项数据≠0 / 0=真实 0；"待录入"用于 due；N/A 视觉保留
- **内置 caution**：seed 持久英文系统提示经展示层 `metricCautionLabel` 中文化（seed 数据与 DB 未动，自定义注意事项原文呈现）
- **混合语言白名单**：ContentLoop / Loop AI / AI / URL / CSV / XLSX / Bilibili / DEMO / N/A / 24h / 72h / n=
- **文档**：README 产品层中文优先（runbook 保留英文）；demo-script 完整中文面试版+完整版（英文版保留参考）
- **验收**：1280/1440 实拍通过；English-leak 审计通过；最终 Human 中文 UX 验收通过
- **零** schema/migration/enum/API/workflow/AI 权威/指标语义/baseline/Diagnosis/Test/Learning/seed 变更；`learnings.evidenceSummary` 英文 canonical 模板按冻结数据契约保留

## Frozen Constraints（M6 新增）

- 中文术语契约冻结：导航六词、核心领域词、结果四态、AI 原则句——M7 不得随意改写（除非真实可用性阻塞）
- M7 只能改 layout/视觉层级/排版/间距/表面/导航呈现/卡片/表格/面板/响应式呈现/交互呈现

## Known Issues / Limitations

- G-56 保持已记录 known limitation（M5.7 决策）
- M5.3B 真实 dogfood 仍 pending

## Next

- M7 — Visual Redesign V2（规划门未开）
