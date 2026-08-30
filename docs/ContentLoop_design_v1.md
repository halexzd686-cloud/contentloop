# ContentLoop V1 — Design System & UI Specification

> **文档角色**：视觉与交互真相源（Source of Truth for Visual & Interaction Design）  
> **适用版本**：V1（3–5 人小型内容团队）  
> **目标**：约束所有页面的视觉语言、组件规则、信息密度、响应式和动效，防止 Coding Agent 自行发挥成另一套风格。  
> **依赖文档**：`ContentLoop_PRD_v1.md`、`ContentLoop_data-model_v1.md`

---

# 0. 设计总原则

ContentLoop V1 的视觉方向固定为：

# Editorial SaaS

比例：

- **75% Professional SaaS**
- **20% Editorial**
- **5% Experimental Motion**

核心要求：

> **看起来像一个真正会被内容团队每天使用的工作台，而不是一个 AI Demo。**

设计优先级：

1. 可读性
2. 操作效率
3. 信息层级
4. 一致性
5. 品牌感
6. 动效表现

不得为了“未来感”“AI 感”牺牲前四项。

---

# 1. Brand Personality

ContentLoop 的视觉人格应体现：

- 清楚
- 冷静
- 专业
- 编辑部感
- 轻实验性
- AI Native，但不炫技

不应呈现为：

- 赛博朋克
- 大面积霓虹
- 游戏 HUD
- 加密货币 Dashboard
- 企业 ERP
- 大量玻璃拟态
- 大量渐变
- Awwwards 风交互网站
- 极端极简到缺乏层级
- AI 紫色模板

---

# 2. 核心视觉语言

## 2.1 Base Theme

默认仅支持：

> **Light Theme**

V1 不做 Dark Mode。

## 2.2 Background System

采用三级背景体系。

### Canvas

整个 App 基础背景：

```css
--canvas: #F5F4EF;
```

用途：

- App 全局背景
- Editorial 区域
- Home 主背景
- Radar Feed 背景
- Calendar 背景

要求：

> 是轻微 warm neutral，不是明显黄色纸张。

---

### Workspace

主要工作区域：

```css
--workspace: #FFFFFF;
```

用途：

- Studio 中央编辑区
- Analytics 数据主区
- Settings 表单主区
- Modal 内主要内容区

---

### Subtle Surface

辅助区域：

```css
--surface-subtle: #EFEEE9;
```

用途：

- Sources panel
- Ask Loop panel
- Filter area
- Secondary section
- Empty placeholder

不得大面积叠加多个不同灰背景。

---

# 3. Ink Palette

禁止直接使用纯黑作为所有文字。

推荐：

```css
--ink-primary: #181A18;
--ink-secondary: #5F625D;
--ink-muted: #92968F;
--ink-faint: #B8BBB5;
```

用途：

### Primary

- Page Title
- 正文主信息
- 核心数据
- Active navigation

### Secondary

- 描述
- 次级指标
- Card metadata

### Muted

- 时间
- Source
- 辅助说明
- Placeholder

### Faint

- Disabled
- Empty metadata
- Decorative divider text

不要创建十几个无意义 Gray Token。

---

# 4. Accent Color

Mint 是 ContentLoop 唯一主要品牌强调色。

建议：

```css
--mint-600: #4E9F84;
--mint-500: #68B79B;
--mint-300: #A9D9C7;
--mint-100: #E7F3EE;
```

Mint 只允许承担：

- Primary Action
- Active State
- Selected State
- Positive Comparison
- AI Ready
- Published confirmation
- Current Tab
- Highlight / Focus

Mint 不允许用于：

- 所有 Card 背景
- 所有 Heading
- 整页背景
- 所有图表 Series
- 所有 Icon
- 大面积渐变

原则：

> **Mint 是功能强调色，不是页面底色。**

---

# 5. Semantic Colors

保持克制。

建议：

```css
--success: #4E9F84;
--warning: #C38A3A;
--danger: #B85B57;
--neutral-status: #858982;
```

## 5.1 使用规则

### Success / Positive

用于：

- Above Baseline
- Completed
- Approved
- Published confirmation

### Warning

用于：

- Needs Review
- Evidence Missing
- Pending

### Danger

仅用于：

- Overdue
- Failed
- Blocking Risk
- Delete

不得因为：

> “指标比平均低 5%”

就使用强烈红色。

数据分析不是告警系统。

---

# 6. Typography

采用：

> **Sans 主体 + Serif 品牌语义**

## 6.1 Sans

负责产品 90% 信息：

- Navigation
- Button
- Form
- Editor
- Data
- Table
- Card
- Status
- Metric
- Body
- Dialog
- Drawer

推荐字体方向：

- Inter
- Geist
- IBM Plex Sans
- system sans

最终开发只选一种主 Sans。

---

## 6.2 Serif

只用于：

- Editorial Page Heading
- Insight Statement
- Landing 大标题
- Calendar 日期大数字
- 极少量品牌句

推荐方向：

- Instrument Serif
- Source Serif 4
- Libre Baskerville
- Georgia fallback

最终只选一种。

---

# 7. Type Scale

桌面端建议：

```text
Landing Hero          64–80px
App Page Title        30–36px
Editorial Statement   24–30px
Section Title         18–20px
Card Title            15–17px
Normal UI             14–16px
Data                  14–18px
Meta                  12–13px
```

规则：

- 不依赖 11px 字体堆信息密度。
- 数据页宁可减少字段，也不要极小字号。
- Title 不使用过度 Bold。
- 正文默认 line-height 保持舒适。

推荐：

```css
line-height: 1.45–1.6;
```

---

# 8. Layout Grid

## 8.1 App Frame

Desktop 最佳宽度：

```text
1280px+
```

主布局：

```text
Sidebar
+
Main Content
```

内容区建议：

```text
max-width: 1600px
```

但 Studio 等工作台页面允许更宽。

## 8.2 Horizontal Padding

桌面：

```text
24–32px
```

大屏：

```text
32–40px
```

不得每个页面使用不同 padding。

---

# 9. Sidebar

## 9.1 Collapsed

宽度：

```text
68px
```

显示：

- Logo
- Home
- Radar
- Studio
- Pipeline
- Analytics
- Settings

底部：

- Brand Avatar / User Avatar

## 9.2 Expanded

宽度：

```text
216–224px
```

显示：

- Icon
- Label

支持：

- Collapse
- Expand
- Pin

## 9.3 Active State

不使用大面积实色块。

推荐：

- Mint indicator
- Slight surface change
- Stronger text

---

# 10. Radius

保持偏编辑工具的硬朗感。

推荐：

```css
--radius-button: 8px;
--radius-input: 8px;
--radius-card: 10px;
--radius-card-large: 12px;
--radius-modal: 14px;
--radius-media: 16px;
--radius-pill: 999px;
```

Pill 仅用于：

- Status Chip
- Tag
- Filter Chip

禁止：

> 所有组件都做成大圆角胶囊。

---

# 11. Border & Shadow

设计原则：

> **Border-first, Shadow-second**

## 11.1 Border

推荐：

```css
--border: #DADCD6;
--border-strong: #C7CAC3;
```

大部分 Card 通过：

- Border
- Background
- Whitespace

建立层级。

## 11.2 Shadow

仅使用于：

- Drawer
- Dropdown
- Floating Menu
- Dragging Card
- Modal

普通 Card 不使用明显阴影。

---

# 12. Card Rule

这是整个产品必须严格执行的规则：

# Object = Card
# Information = Layout

## 12.1 应该用 Card

一个独立业务对象：

- Signal
- Content
- Priority Item
- Publication
- Test
- Competitor Reference
- Source

## 12.2 不应该用 Card

纯信息区：

- KPI
- Baseline comparison
- Filters
- Section heading
- Page summary
- Metric group
- Navigation

这些使用：

- Divider
- Grid
- Spacing
- Typography

禁止：

> Card 套 Card 套 Card。

---

# 13. Divider

Editorial SaaS 的重要组成。

推荐：

```css
border-color: #DADCD6;
```

使用场景：

- Section 分隔
- Metric group
- Sidebar group
- List item
- Editorial grid

Divider 应细、轻、稳定。

---

# 14. Button System

只保留四层。

## 14.1 Primary

用途：

- Create Content
- Approve
- Save
- Import
- Publish confirmation

视觉：

- Mint background
- Dark / white readable label

## 14.2 Secondary

用途：

- Analyze
- Add Source
- View Analytics
- Generate Draft

视觉：

- White / transparent
- Border

## 14.3 Ghost

用途：

- Cancel
- Skip
- More
- Low priority actions

## 14.4 Danger

仅：

- Delete
- Destructive Reset

不得混入：

- 蓝
- 紫
- 黑
- 绿

多种主按钮色。

---

# 15. Input & Form

输入框统一：

- 8px radius
- Border-first
- Focus = Mint border / ring
- Error = Muted Red
- Label 置于输入框上方

避免：

- Material Floating Label
- 强烈阴影
- 大面积灰色 input background

Textarea 应支持：

- Auto resize
- 适当最大高度

---

# 16. Status Chips

状态采用轻量 Pill。

示例：

```text
NEW
SELECTED
DRAFT
REVIEW
SCHEDULED
PUBLISHED
OVERDUE
HIGH MATCH
```

颜色规则：

- New / Draft → Gray
- Selected / Active → Mint
- Review → Amber
- Overdue → Muted Red
- Published → Mint / Dark

Chip 不应比正文更抢眼。

---

# 17. Icons

统一使用：

> Line Icon System

推荐：

- Lucide

尺寸：

```text
16px
18px
20px
```

禁止混用：

- Filled icon
- Emoji icon
- 多套 Icon Library

平台 Logo 可作为例外，但尺寸必须克制。

---

# 18. Charts

Analytics 图表必须优先可读。

允许：

- Line Chart
- Bar Chart
- Horizontal Comparison Bar
- Simple Funnel
- Metric Delta

禁止：

- Radar Chart
- 3D Chart
- 大量 Pie Chart
- Neon Chart
- 动态发光图
- Decorative Data Viz

## 18.1 Color

当前对象：

> Mint

Baseline：

> Neutral Gray / dashed

其他系列：

> 中性灰阶

不创建彩虹 Dashboard。

---

# 19. Table

表格用于：

- Analytics content list
- CSV Field Mapping
- Competitor Breakdown

规则：

- Row height 44–52px
- Header 12–13px muted
- Data 14px
- Hover 轻 Surface
- 不用重边框网格
- Column align 必须一致

数值：

> 右对齐

文字：

> 左对齐

---

# 20. Drawer

用于：

- Content Quick View
- Create Test
- Signal details
- Quick editing

宽度建议：

```text
380–480px
```

Studio 的 AI Panel 不属于 Drawer。

Drawer：

- 从右侧进入
- Normal motion
- 轻 shadow
- 保留背景上下文

---

# 21. Modal

只用于必须阻断式确认：

- Mark as Published
- Delete
- Review confirmation
- Add Signal
- Import Data step

不得所有编辑都使用 Modal。

---

# 22. Tabs

用于：

- Studio：Brief / Master / Platforms / Review
- Pipeline：Pipeline / Calendar
- Analytics：Performance / Tests
- Platform Playbook

Active 状态：

- Mint underline
- Stronger text

不使用大块 Filled Tab。

---

# 23. React Bits Usage

V1 最终只保留：

1. EchoText
2. HalftoneReveal
3. Prism

# MetaBalls — CUT
# Lanyard — CUT

如果 Coding Agent 自行加入其他 React Bits，视为违反 design.md。

---

# 24. EchoText

## 24.1 视觉语义

表示：

- Propagation
- Loop
- Momentum
- State completion

## 24.2 允许位置

### Landing

可明显使用。

### App

只允许极轻量：

- Page entrance
- Published
- Approved
- Important completed state

## 24.3 禁止

不得：

- 每个标题都 Echo
- 长时间循环
- 数据页常驻
- 输入时反复闪烁

---

# 25. HalftoneReveal

## 25.1 视觉语义

表示：

> 从信息噪音中显现出值得关注的内容。

## 25.2 允许位置

### Radar

仅：

- High Match
- Trending
- Editor Pick

重点 Signal。

### Landing

Discovery section。

## 25.3 禁止

- 所有 Signal
- Studio
- Analytics
- Pipeline
- Settings

---

# 26. Prism

## 26.1 视觉语义

表示：

> Intelligence / Analysis

## 26.2 允许位置

### Home

Loop Insight。

建议尺寸：

```text
110–150px
```

### Landing

可作为 Hero Intelligence visual。

## 26.3 Analytics

不使用完整 Prism。

只允许：

- 24–32px Prism-derived glyph

用于：

- AI Processing
- Loop Analysis state

## 26.4 禁止

- Studio
- Pipeline
- Settings
- Radar main feed

---

# 27. Motion System

全局统一三档。

## 27.1 Fast

```text
120–180ms
```

用于：

- Hover
- Checkbox
- Tooltip
- Filter
- Small status change

## 27.2 Normal

```text
220–300ms
```

用于：

- Tab
- Drawer content
- Card transition
- Diff
- Panel selection

## 27.3 Expressive

```text
400–650ms
```

只用于：

- Page entrance
- Echo
- Halftone
- Major success
- Landing

---

# 28. Spring Motion

仅用于：

- Kanban Drag
- Calendar Drag
- Studio Module Reorder
- Drawer entrance（可选）

禁止：

- 所有按钮弹跳
- KPI 数字弹性
- 常规文字位移

---

# 29. Loading

采用 Contextual Loading。

## 29.1 普通数据

Skeleton。

## 29.2 AI 分析

显示当前过程：

```text
Analyzing signal…
Comparing sources…
Preparing angles…
```

Analytics：

```text
Comparing baseline…
Reviewing metrics…
Preparing diagnosis…
```

同时仅有轻量 Mint activity indicator。

## 29.3 File Import

Progress + Step State：

```text
Uploading
Detecting fields
Mapping
Ready to import
```

禁止统一满屏 Spinner。

---

# 30. Empty State

空状态必须告诉用户下一步。

## Home

> Nothing urgent today.

## Radar

> Add your first signal to start deciding what to create.

CTA：

> Add Signal

## Studio

> Select a topic or create a new content brief.

## Pipeline

> No active content yet.

CTA：

> Create Content

## Analytics

> No performance data yet. Publish content and add its 24h metrics here.

CTA：

> Import Data

## Tests

> No tests yet. Create one from a content diagnosis.

禁止只显示：

> No Data

---

# 31. Error State

错误必须：

1. 说明发生什么
2. 保留用户数据
3. 给恢复动作

例如：

> We couldn’t map 3 columns automatically.

不是：

> Something went wrong.

操作：

- Review Mapping
- Retry

---

# 32. Home Page Specification

## 32.1 Layout

采用：

> Hybrid Editorial Grid

### Top

中等高度：

```text
160–220px
```

显示：

- Date
- Greeting
- Attention count
- + New
- Ask Loop

### Main Grid

左：

> Today / Priority

右：

> Loop Insight + Prism

### Performance

一行 4 个 KPI。

### Bottom

左：

> Content Flow

右：

> Signals

---

## 32.2 Priority

一个主 Priority Card。

次级项目不继续套 Card。

---

## 32.3 KPI

用户 Pin 4 个。

示例：

- Views
- Like Rate
- Save Rate
- Follow Rate

仅轻趋势。

深度分析全部进入 Analytics。

---

## 32.4 Motion

允许：

- Greeting 轻 Echo
- Prism idle motion
- KPI count-up
- Trend draw
- Mint confirmation
- Card hover

禁止：

- Full background effects
- Cursor trails
- 多个 3D 元素

---

# 33. Radar Page Specification

## 33.1 Layout

Desktop：

```text
Signals Feed 65%
Quick Review 35%
```

## 33.2 Feed

Card 中等密度。

重点 Signal 才显示 HalftoneReveal。

## 33.3 Quick Review

固定块：

- Topic Score
- Why It Matters
- Audience Match
- Content Risk
- Possible Angles
- Competitor Gap
- Skip
- Create Content

## 33.4 Add Signal

支持：

- URL
- Idea

## 33.5 Motion

- Feed enter fade/slide
- HalftoneReveal
- Review panel crossfade
- Topic score smooth update
- Create Content success feedback

禁止：

- MetaBalls
- 全屏 AI loading animation

---

# 34. Studio Page Specification

Studio 是 V1 信息密度最高的页面。

## 34.1 Layout

三栏：

```text
Sources        22%
Workspace      53%
Loop AI        25%
```

允许用户轻微 Resize，但不是 P0 必须。

## 34.2 Main Workspace

White background。

顶部：

- Title
- Status
- Owner
- Reviewer
- Auto-save state

Tabs：

- Brief
- Master
- Platforms
- Review

## 34.3 Sources Panel

Warm / subtle surface。

分组：

- Official
- Community
- Competitors
- Notes

## 34.4 Content Master

模块化，不使用长白纸单一编辑器。

每个 module：

- 可 reorder
- 有轻量 handle
- 有 contextual actions

## 34.5 AI Panel

不是聊天页。

上部：

> Quick Actions

下部：

> Ask Loop

## 34.6 Diff

AI rewrite 后使用：

- OLD
- NEW
- Accept
- Reject

视觉上使用：

- 删除弱红
- 新增弱 Mint

避免 GitHub 代码 Diff 风过强。

## 34.7 Review

Checklist-first。

不要大评分。

## 34.8 Motion

- Tab crossfade
- Module spring reorder
- Source citation mint flash
- Diff slide-in
- Accept text transition
- QA warning → check
- Approved 轻 Echo

禁止：

- Prism
- Halftone
- MetaBalls

---

# 35. Pipeline Page Specification

## 35.1 Default

Pipeline。

顶部切：

- Pipeline
- Calendar

## 35.2 Columns

固定 5 列：

- 待策划
- 制作中
- 待审核
- 待发布
- 已发布

## 35.3 Card

显示：

- Title
- Platforms
- Owner
- Time
- Risk only when needed

## 35.4 Drag

Spring。

关键 Gate 不允许直接越过。

## 35.5 Content Drawer

从右侧打开。

提供：

- Open in Studio
- Review
- View Analytics

## 35.6 Calendar

Week + Month。

Editorial Calendar：

- Paper
- Thin grid
- Serif date
- Sans content

## 35.7 Motion

- Physical drag
- Layout animation
- Published mint pulse
- Overdue subtle breathing

禁止：

- Prism
- Halftone
- persistent Echo

---

# 36. Analytics Page Specification

Analytics 是视觉最理性的一页。

## 36.1 Background

- Data = White
- AI Analysis panel = Warm Paper
- Main type = Sans
- Serif only for key insight heading

## 36.2 Layout

Content detail：

```text
Metrics / Funnel / Comparison   65%
Loop Analysis                  35%
```

## 36.3 KPI

显示当前值 + baseline delta。

例如：

```text
7.3%
Save Rate
+48% vs baseline
```

## 36.4 24h / 72h

使用 Tabs，不做复杂 timeline。

## 36.5 Baseline

显示：

- Account
- Content Type

默认 Median。

## 36.6 Funnel

标准四层：

```text
Reach
↓
Consume
↓
Engage
↓
Convert
```

缺失数据：

> N/A

## 36.7 Loop Analysis

固定：

- What happened
- Evidence
- Possible reason
- Confidence
- Next actions

## 36.8 Insufficient Evidence

必须有独立 Neutral State。

不能用 Error styling。

## 36.9 Tests

Analytics 内部 Tab。

Test Card 是对象，可用 Card。

## 36.10 Motion

- Number transition
- Baseline bars
- 24h / 72h crossfade
- Funnel quick reveal
- AI glyph processing
- Test success confirmation

禁止：

- Full Prism
- Animated background
- 3D
- decorative chart morph

---

# 37. Settings Page Specification

Settings 是最安静的一页。

## 37.1 Layout

左侧：

- Brand
- Team
- Playbooks
- Metrics

右侧：

- Form

## 37.2 Visual

- White / Warm White
- Thin Divider
- Standard Form
- Minimal Motion

## 37.3 No React Bits

Settings 禁止：

- Prism
- Halftone
- Echo
- 3D

---

# 38. Platform Playbook UI

顶部平台 Tabs：

- Xiaohongshu
- Bilibili
- Douyin

表单 Sections：

- Voice
- Title Style
- Hook
- Structure
- CTA
- Avoid
- Good Examples

如果有 Learning：

显示轻量 Banner：

> 1 Learning may be relevant

操作：

- Add as Rule
- Ignore

---

# 39. Metric Settings UI

每个平台显示：

- Metric Name
- Alias
- Formula
- Meaning

编辑 Derived Metric 时：

需要明确：

- Numerator
- Denominator

不得只给自由文本 formula editor。

---

# 40. Navigation Behavior

Sidebar 一级导航固定：

```text
Home
Radar
Studio
Pipeline
Analytics
Settings
```

不允许增加：

- Experiment
- Knowledge
- Calendar
- AI
- Publications

为一级导航。

它们必须嵌入现有模块。

---

# 41. Quick Create

右上角统一：

> `+ New`

菜单：

- Add Signal
- New Content
- Import Metrics

不要在 Header 同时放 3 个 Primary Button。

---

# 42. Ask Loop Entry

右上角：

> Ask Loop

打开轻量 Context Panel。

如果当前页面无具体对象：

仅提供页面级帮助。

如果存在当前 Content / Signal / Publication：

显示 Context Chips，例如：

```text
Analytics
Xiaohongshu
24H
Claude Agent Test
```

---

# 43. Responsive

## 43.1 Primary Target

```text
≥1280px
```

最佳体验。

## 43.2 1024px

必须可用。

策略：

- Sidebar 默认 collapsed
- Studio side panel 可收起
- Analytics 右栏可折叠
- Radar Quick Review 可 Drawer 化

## 43.3 Mobile

V1 不保证完整编辑。

允许：

- Home 查看
- Analytics 查看
- Pipeline 简单查看

Studio 移动端：

> 可提示 Desktop recommended

禁止为了移动端强行重做整个三栏编辑器。

---

# 44. Accessibility

至少保证：

- 正文对比度合格
- Mint 不作为唯一状态表达
- Button 有 focus state
- Keyboard 可访问核心表单
- Drag 操作需要备用点击 / menu 操作
- 图表需有 text labels
- Status 不只依赖颜色

---

# 45. Content Density

整体：

> Medium Density

不要：

- 极密 Excel 风
- 大量空旷 Marketing SaaS 风

每页要有明确工作焦点。

一般一个屏幕建议：

- 1 个 Primary Task
- 2–4 个 Secondary Sections

而不是：

> 12 张等权重 Card。

---

# 46. Microcopy

语气：

- 简洁
- 具体
- 不夸张
- 不拟人过度

例如：

好：

> 2 claims need verification.

不好：

> Oops! Loop AI thinks your content might have some problems.

好：

> Not enough evidence yet.

不好：

> AI is still thinking...

---

# 47. AI State Copy

允许：

```text
Analyzing…
Checking sources…
Comparing baseline…
Preparing suggestions…
```

完成：

```text
Analysis ready
```

证据不足：

```text
Not enough evidence
```

失败：

```text
Analysis failed. Retry
```

不要写：

> AI magic happening...

---

# 48. Visual Hierarchy Rule

所有页面严格遵守：

# Action > Context > Detail

例如 Home：

1. Priority
2. Insight
3. Performance

Analytics：

1. Current metrics
2. Baseline
3. AI explanation

Studio：

1. Content
2. Source
3. AI action

AI 不得成为第一视觉层，除非页面本身就是分析结果。

---

# 49. Design QA Checklist

每完成一个页面，Coding Agent 必须检查：

### Structure

- 是否符合 PRD 页面结构？
- 是否增加了未经批准的模块？

### Typography

- Sans / Serif 是否按规则使用？
- 是否存在大量过小文字？

### Color

- Mint 是否被滥用？
- 是否出现无定义品牌色？

### Cards

- 是否把纯信息也包成 Card？
- 是否出现 Card 套 Card？

### Motion

- 是否解释状态？
- 是否有无意义装饰动画？

### React Bits

- 是否只使用 Echo / Halftone / Prism？
- 是否放在允许的位置？

### Data

- 是否清楚展示 Baseline / Evidence？
- 是否把缺失数据显示成 0？

### AI

- AI 建议是否覆盖正式内容？
- 是否保留 Human Confirm？

---

# 50. 禁止设计模式

V1 禁止：

- Glassmorphism
- Neon gradients
- Purple AI theme
- Fullscreen animated backgrounds
- Dense bento everywhere
- Huge rounded SaaS cards
- Every section is a card
- All buttons pill-shaped
- Charts with unnecessary colors
- 3D charts
- Floating AI orb on every page
- Emoji-heavy status
- Tiny 11px UI
- Sidebar with dozens of modules
- Multiple React Bits per workspace page
- Cursor effects
- Page transition that blocks interaction

---

# 51. 页面视觉强度排序

从最有表现力到最克制：

```text
Landing
↓
Home
↓
Radar
↓
Pipeline
↓
Studio
↓
Analytics
↓
Settings
```

注意：

Studio 虽然功能最复杂，但视觉应克制。

Analytics 虽然信息多，但必须最理性。

---

# 52. V1 Design Success Criteria

设计成功不是：

- 动效最多
- 卡片最漂亮
- AI 感最强

而是：

### 1

用户第一次进入 Home，5 秒内知道：

> 今天先做什么。

### 2

用户进入 Radar，能快速判断：

> 这条 Signal 值不值得做。

### 3

用户进入 Studio，不需要聊天 Prompt 就知道：

> 下一步编辑什么。

### 4

用户进入 Pipeline，立刻知道：

> 谁在做什么、做到哪里。

### 5

用户进入 Analytics，能够分清：

> 数据事实、Baseline、AI 推断。

### 6

产品截图有明显 ContentLoop 品牌感，但不牺牲工具属性。

---

# 53. 最终视觉一句话

> **A calm editorial workspace for content teams, with just enough AI motion to make intelligence visible.**

中文：

> **一个冷静、专业、有编辑部气质的内容工作台；AI 的存在通过信息结构和状态反馈被感知，而不是通过炫技被强调。**

---

**End of Design System — ContentLoop V1**
