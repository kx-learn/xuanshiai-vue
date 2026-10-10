---
name: 宣誓爱
description: 以移动端组件尺寸、排版和布局为核心的 UniApp 设计规范。
typography:
  display:
    fontFamily: "ui-serif, Songti SC, STSong, Noto Serif SC, serif"
    fontSize: "clamp(2rem, 8vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "ui-serif, Songti SC, STSong, Noto Serif SC, serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.02em"
rounded:
  xs: "4px"
  sm: "6px"
  control: "8px"
  input: "9px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "50px"
  button-secondary:
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "44px"
  story-card:
    rounded: "{rounded.md}"
    padding: "16px"
  trust-card:
    rounded: "{rounded.md}"
    padding: "13px"
---

## Overview

本文档只记录组件尺寸、排版、间距、圆角、响应式范围和动效时长。具体页面应优先复用现有 UniApp 组件，并保持微信小程序 320px—428px 宽度范围内的可用性。

## Typography

### 字体角色

- `--serif`：`ui-serif, "Songti SC", "STSong", "Noto Serif SC", serif`。用于人物姓名、故事标题、关系期待和重要确认标题。
- `--sans`：`Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`。用于正文、标签、按钮、时间、表单和系统信息。

### 层级

- 页面 / Sheet 标题：20—22px，宋体，700。
- 人物姓名：22—25px，宋体，700。
- 段落正文：13—15px，`1.6—1.8` 行高；故事段落优先使用 `--serif`。
- 标签、按钮、状态：9—13px，`--sans`，通常 700—800。
- 辅助说明：11—12px，不能代替核心说明。
- 标题可使用轻微负字距，建议不低于 `-0.04em`；长标题自然换行，不强制单行。

## Components

### Story / 人物首屏

- 内容顺序保持：人物照片 → 基础资料与认证 → 自我介绍 → 声音 / 生活切片 → 关系期待 → 合拍度参考 → 动作栏。
- 照片卡片采用 `8px 26px 8px 8px` 非对称圆角；该形态只用于人物和特色媒体。

### Cards / 信任档案

- 标准卡片：`12px` 圆角、`13—16px` 内边距。
- 用户卡片：头像区域保持清晰裁切，信息标签不过度堆叠。
- 特色卡片：保留明确标题与正文，不强制统一成固定高度。
- 列表页使用纵向节奏，不把每段内容都包装成相同大小的卡片。

### Buttons / Actions

- 主按钮默认高度 `44—50px`、圆角 `8—10px`。
- 次按钮默认高度 `44px`，用于筛选、查看档案和跳过等并列动作。
- 文字按钮用于低权重辅助操作，不伪装成主要 CTA。
- 主要交互目标不小于 `44px`，包括发送、发布和确认操作。

### Tabs / Navigation

- 一级导航顺序固定为：首页、牵线、社区、消息、我的。
- 页面内 Tab 使用胶囊或底部线条两种既有尺寸变体。
- 底部 Tab、页面顶部栏和内容滚动区预留稳定高度，避免内容被固定栏遮挡。

### Inputs / Tags / Feedback

- 输入框高度约 `44px`，圆角 `9px`。
- 次级文本按钮通过 padding 扩大触控区域。
- `XsaTag` 和 `choice-chip` 保持统一内边距与最小触控高度。
- Sheet 用于筛选、完整档案和可回看内容；Modal 用于需要明确决策的场景。
- 空状态保留说明与下一步操作；Toast 只提示结果。

## Layout / Responsive / Motion

- 小程序优先，覆盖 `320px—428px`；内容左右内边距通常 `16px`，页面底部为固定操作栏预留空间。
- 使用 `view` / `text` / `scroll-view` / `image` 和 UniApp API；不得依赖 `window`、`document` 或 DOM 操作。
- 间距以 `8px` 为主网格，允许 `4px`、`6px`、`10px`、`12px`、`13px` 做控件细调。
- 动效时长以 `0.18s—0.22s` 为主，采用 ease-out；按压可使用 `scale(0.98)`。
- 悬浮仅用于 H5，不依赖 hover 完成功能；关闭动效后信息仍必须立即可获取。

## Moxiang / 墨相心帖与海报视觉规范

- **命名分层（2026-10-06）**：本节登记的是**视觉品牌标识**（「墨相心帖」海报标题、「知遇墨相」印文、「知遇墨相 · 灵魂底色」卡片标题），与**用户可见角色与栏目文案**是两套命名；后者（角色「知遇」、「我的真实画像」/「期待的长期关系」）以根目录 `PRODUCT.md` 为准，视觉标识不因角色文案调整而改动。
- **连续对话与小猫（2026-10-08）**：外部入口和对话内统一复用 `XsaZhiyuMark` 与 `/static/ai-cat/ai-cat.webp`；`MoxiangMasterAvatar` 保留尺寸/状态接口作为兼容包装，不再选择另一套人物立绘。倾听、思考、说话使用同一形象与文字状态，不把动画当任务完成证据。
- **双画像状态**：对话顶部并列“我的真实画像”和“期待的长期关系”，不作为主体切换 Tab。理解覆盖率与真实生成任务状态分开；待确认稿被冻结，有新信息只提示显式合并。结果页使用“确认整份画像”，展示正文、生效字段、差异及底线变化，确认不等于公开。
- **色调与布局继承**：新增状态卡沿用所在页 `--surface`、`--border`、`--primary`、`--text-main` / `--text-sub`，回退到全局 Token；不修改海报四主题。对话优先采用紧凑角色区，双卡可换行文本，主要触控区域至少 44px，保留键盘和输入栏空间。

- **视觉定位**：东方雅致「墨相心帖」纸质感，承袭中式留白、印章与书法美学；配合 `theme="atelier"` 暖纸质感。
  页面内的墨相卡片沿用原纸感 token（下一条）；**海报画布则是满幅插画星空山海**，两者是不同载体，配色不互通。
- **海报四主题规范**（2026-09-11 依 4 套标准参考图重构，代码见 `utils/moxiang-poster-drawer.uts` 的
  `MOXIANG_POSTER_THEMES`）。主题键名与配色唯一定义处是代码，本节只登记口径：
  - 情绪频率（`mood`）：天空 `#4E6190` → `#86729F` → `#D79BB0` → `#F0C2C8`（暮紫落日霞粉）；水天 `560`；粉金日轮 `#FFFDF8`→`#FFE8E0`→`#F7CAD2`；海面 `#A77395` → `#1A1826`。
  - 风格档案（`profile`）：天空 `#1E3C42` → `#4E787F` → `#D8B3A0`（雅致黛青晨曦）；水天 `562`；柔暖满月 `#FFFDF6`→`#F4DCBA`→`#E6C69C`；海面 `#53757C` → `#131E21`。
  - 心相诗笺（`poem`）：天空 `#12202C` → `#2D4B60` → `#C9A98F`（深黛水墨夜空）；水天 `564`；明澈皎月 `#FFFDF5`→`#EAD1A6`→`#D8BA8A`；海面 `#466072` → `#111A20`。
  - 能量图谱（`relationship`）：天空 `#253554` → `#98667D` → `#E68A91`（落霞熔金双星暮色）；水天 `566`；主日轮 `#FFFDF8`→`#FBC8B2`→`#F3A69A`，另有伴星轮 `orb1`；海面 `#965E77` → `#180E1A`。
- **朱砂方印 token**（落款元素，随主题取值）：`mood` / `relationship` 用 `#A8383B` 底 + `#FDF6F2` 印文；
  `profile` 用 `#C03639` 底 + `#FFF8F5` 印文；`poem` 用 `#D4B170` 底 + `#2A2118` 印文。
  印文固定「知遇墨相」两行，尺寸 40px×40px、圆角 6px。
- **档案与名片特质标签配色**（「我的」页头部徽章区、个人主页「知遇墨相 · 灵魂底色」卡片）：宣纸底 `#F5F2EB`、深赭墨字 `#6E4535`、宋代茶褐红描边与依恋微标 `#9C5B42`、称号文字 `#5D3B2C`、朱砂标记 `#A8383B`。这些色值此前直接写在页面样式里而未登记，现固化为该模块 token；后续复用它们，不要就地另创近似米色。
- **海报排版结构**（逻辑栅格 `600px × 940px`，以 2x Retina 导出，实际画布 `1200px × 1880px`）；
  所有几何以逻辑坐标书写，靠 `ctx.scale(2, 2)` 放大：
  - 页边距 44px；左栏诗笺、右栏真实数据栏、中栏日月轮三段式。
  - 顶部刊头（左上）：主题中文大标题（36px serif）+ 宽字距英文标（10px）+ 真实特质标签单行短题（11px，
    随宽度截断，固定单行以免行数浮动顶飞下方诗句）+ 左栏双节诗与极细分隔线。
  - 右上：主题哲思短语与英文标（`rightHeader` / `rightEn`，12px / 9px，右对齐）。
  - 右栏「知遇眼中的你」（`drawRightColumn`）：相处闪光点（≤3 条）与相处安全边界（≤2 条），
    逐条圆点 + 11px 文本 + 细分隔线，行宽 142px；**无数据时整栏留白**。
  - 中栏日月轮（`drawCenterQuote`）：巨型柔光圆盘（半径 138–145px，圆心 `y = 475–495`，逐主题微调），
    盘心依次为真实人格标题（15px serif，≤2 行居中）、英文副标（9px）、依恋微标胶囊（10px，
    朱砂底 `rgba(168,56,59,0.16)` + 印文色 `#8C3A3E`）与依恋诠释（10px，≤2 行）。
    整块先量后画并夹紧在 `[圆心-半径+30, 水天线-34]` 之间，避免文字压到地平线以下的深色山峦。
  - 中部水文与中景：天际星轨、蛾眉月、归巢飞鸟、浮花、千纸鹤；水天线处远山叠嶂，
    右景为海岛灯塔（`mood` / `profile` / `relationship`）或水榭亭台（`poem`），另配轻舟白帆。
  - 前景与人物：左下礁石近景 + 野花（粉樱 / 白雏菊）；人物剪影为独坐女子（`mood` / `profile` / `poem`）
    或并肩依偎情侣（`relationship`）。
  - 落款区（`drawBottomFooter`）：左下主题短句（12px）+ 英文标（9px）+ 真实身份行
    「昵称 · 年龄 · 城市 · 认证 · 宣誓爱知遇心相」（11px，随宽度截断，缺项省略不补占位符）；
    右下为知遇寄语（真实 `master_message`，13px serif，≤2 行）或主题书法短句（22px serif），
    其下细分隔线与英文标；**右下角 40px×40px 方角朱砂印章「知遇墨相」**。
- **海报内容铁律**：画布上任何数值都会被用户读作本人画像结论，**禁止绘制后端无出处的数值**
  （覆盖度百分比、四维占比等均不在白名单内）；白名单字段无数据时留白或省略，不得用占位数值配平版面。

