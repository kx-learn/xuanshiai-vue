---
name: 宣誓爱
description: 以故事、可信档案和清晰行动为骨架的认真婚恋 UniApp 视觉系统。
colors:
  canvas: "#F4F8F7"
  paper: "#FAFCFC"
  surface: "#FFFFFF"
  warm: "#E7ECEC"
  ink: "#0C1313"
  ink2: "#42494A"
  muted: "#7B8282"
  line: "#D3D9D8"
  accent: "#38988D"
  accent2: "#007565"
  soft: "#79B1A9"
  brown: "#2C807C"
  navy: "#18415D"
  sage: "#338D6B"
  sage-soft: "#C2E0CF"
  text-invert: "#FCFCFC"
  overlays:
    surface: "rgba(250, 252, 252, 0.96)"
    image: "linear-gradient(180deg, rgba(17, 23, 24, 0.20) 0%, rgba(17, 23, 24, 0.78) 100%)"
    imageHero: "linear-gradient(180deg, rgba(17, 23, 24, 0.25) 0%, rgba(17, 23, 24, 0.82) 100%)"
    imageText: "rgba(231, 236, 236, 0.75)"
    imageTextMuted: "rgba(231, 236, 236, 0.72)"
    imageTextStrong: "rgba(231, 236, 236, 0.88)"
    imageSurface: "rgba(250, 252, 252, 0.10)"
    imageLine: "rgba(231, 236, 236, 0.16)"
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
    fontFamily: "PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "PingFang SC, Microsoft YaHei, system-ui, sans-serif"
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
    backgroundColor: "{colors.brown}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "50px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "44px"
  story-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  trust-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px"
---

> **文档状态（2026-08-16 冻结，见 [`docs/decisions/2026-08-15-ai-phase1-contract-baseline.md`](../docs/decisions/2026-08-15-ai-phase1-contract-baseline.md) D6）：本文件是前端实现镜像，不是视觉规则事实源。**
>
> - **视觉规则唯一权威：[`../DESIGN.md`](../DESIGN.md)（工作区根）。** 视觉规则、Token 语义与组件语言冲突时以根文件为准。
> - **Token 代码来源：[`uni.scss`](./uni.scss)**（见 `AGENTS.md` §4）；本文件 frontmatter 及正文中的 Token 值仅是实现快照。
> - 本文件保留前端特有实现细节（overlays、牵线域 `--match-*` Token 等）；与根文件或 `uni.scss` 不一致时，按 根 DESIGN.md > uni.scss > 本文件 的顺序裁决，并应回报同步根文件而不是反向覆盖。

## Overview

宣誓爱是一款以移动端小程序为第一目标的认真婚恋产品。视觉设计不是装饰层，而是帮助用户完成三件事：先通过**真实故事**产生理解，再通过**可信档案**降低不确定性，最后用**清晰行动**表达喜欢、申请认识或暂不继续。

当前实现的视觉真相来自：

1. `uni.scss`：UniApp 的全局 Token 与通用工具类，是开发时的首要来源。
2. `App.uvue` 的 `page { --token: ... }`：运行时 Token 注入点，保证微信小程序 `app.wxss` 包含变量定义。
3. 历史交互原型已退出开发链路，不再维护；如需校准首页节奏或动作文案，以当前页面源码和 Mock 为准。

**场景句：** 用户在通勤、午休或夜间的手机屏幕前，用 15—30 分钟认真阅读一个人的生活片段，在决定申请认识前，希望界面安静、可信、没有被催促的感觉。

设计关键词：冷瓷白、青瓷绿、宋体叙事、清晰分层、轻量边界、非对称人物卡片、克制的安全感。

## Colors

### 核心色板

> **运行时约定（2026-07-22 方案 A）**  
> Token **语义名**不变；**运行时色值**统一为 hex / rgba，保证微信小程序、H5、APP 同一套颜色。  
> 全局注入点：`App.uvue` 的 `page { --token: ... }`（会进入微信 `app.wxss`），并与 `uni.scss` 保持一致。  
> 业务代码继续写 `var(--token)`，不要在页面散落字面色值；不要再写 `oklch()`。

| Token | 运行时值（hex/rgba） | 用途 |
|---|---|---|
| `--canvas` | `#F4F8F7` | 页面底色、滚动区域背景 |
| `--paper` | `#FAFCFC` | 顶部栏、Sheet 内衬、轻背景 |
| `--surface` | `#FFFFFF` | 卡片、输入框、按钮表面 |
| `--warm` | `#E7ECEC` | 提示块、媒体占位、筛选提示 |
| `--ink` | `#0C1313` | 主标题、正文重点、核心数字 |
| `--ink2` | `#42494A` | 次级正文、叙事内容 |
| `--muted` | `#7B8282` | 辅助说明、时间、状态描述 |
| `--line` | `#D3D9D8` | 分割线、浅边界 |
| `--accent` | `#38988D` | 青瓷绿主强调、选中态、进度填充 |
| `--accent2` | `#007565` | 主强调文字、可读的深色强调 |
| `--soft` | `#79B1A9` | 强调背景、播放按钮、徽章底色 |
| `--brown` | `#2C807C` | 语音卡片、行动色块等高权重表面 |
| `--navy` | `#18415D` | AI / 专业服务等深色功能卡片 |
| `--sage` | `#338D6B` | 在线、已认证、成功提示 |
| `--sage-soft` | `#C2E0CF` | 安全提示、认证背景 |
| `--security-hero` | `#E5F7E7` | 安全中心顶部渐变起始色，与 `--paper` 过渡 |
| `--heart-red` | `#F08282` | 收藏爱心（已收藏实心态）；低饱和红，非婚庆红金，仅用于收藏语义 |
| `--text-invert` | `#FCFCFC` | 深色表面上的反白文字 |
| `--bg-hover` | `#E7ECEC` | 轻悬停 / 次级底 |
| `--bg-subtle` | `#DCE3E2` | 更浅的分区底 |
| `--accent-bg` | `#C3DEDA` | 强调浅底 |
| `--accent-glow` | `rgba(56, 152, 141, 0.15)` | 强调光晕 / 弱高亮 |
| `--review-*` | 见 `uni.scss` | 仅限服务红娘「资料待审」工作台；按导图使用紫粉操作、橙色审核和弃海失败状态，不扩散至普通用户页面 |
| `--match-paper` | `#FFFDF8` | 牵线域纸张主表面 |
| `--match-mist` | `#E6F0EC` | 牵线域青绿雾面弱强调底 |
| `--match-sky` | `#E9F1F5` | 牵线域资料 / 流程浅色底 |
| `--match-blush` | `#F9E7E8` | 牵线域关系与身份提示底 |
| `--match-deep` | `#1B5B56` | 牵线域深青主色与高权重操作 |
| `--match-coral` | `#C95C58` | 牵线域少量编号与提示点缀 |
| `--match-line` | `#DBE4DF` | 牵线域纸张分隔线 |
| `--match-shadow` | `0 12px 28px rgba(27, 91, 86, 0.09)` | 牵线域纸片层级阴影 |

### 使用规则

- 颜色通过 `var(--token)` 使用，不在页面中复制色值。新增语义颜色前，先判断能否由现有 Token 表达；确有必要时先更新本文档与 `uni.scss`。
- 主色采用**低饱和青瓷绿**，强调信任和行动，不使用婚庆红金、荧光色或高饱和冷蓝。
- 大面积保持 `--canvas` / `--paper` 的冷瓷白；`--accent` 只承担关键状态和决策动作，不铺满所有区域。
- 文本优先使用 `--ink`、`--ink2`，`--muted` 只用于辅助信息，不承载必须阅读的正文。
- `--surface` 是代码中的表面白，不应在页面里直接写 `#fff`；同理不得直接写 `#000`。
- 认证成功与在线状态使用 `--sage` 系列；AI 结果必须同时展示“仅供参考”说明，不能用颜色暗示确定性结果。
- **页面色调继承：** 新页面、内嵌二级视图、详情页和 Sheet 必须继承其上级页面所属业务域的 `--canvas` / `--paper` / `--surface`、主强调色、浅强调色、状态色、圆角、阴影和按压反馈。外部参考图只可用于布局、信息层级和交互结构，不得把其紫色、粉色或其他独立色系直接带入现有业务域。需要改变上级色调时，先取得用户明确确认，再同步调整本文档和 `uni.scss`。

### 对比度与状态

正文和关键操作必须保持可读对比度；占位文本、禁用态、错误说明也要有足够辨识度。焦点态使用青瓷绿描边：`outline: 3px solid rgba(56, 152, 141, 0.45)`，并保留 `outline-offset: 2px`。错误状态沿用现有组件行为，但新代码不应继续散落硬编码颜色；需要统一错误 Token 时先走设计评审。

## 图片与浮层 Token

图片 Hero、渐变浮层、半透明底栏与阴影应使用 `uni.scss` 中实际存在并经评审的语义 Token；本段旧名称 `--surface-overlay` / `--image-*` / `--shadow-overlay` 仅为历史设计意图，当前代码未完整定义，不得据此新增未评审变量或散落新的 rgba 值。

## Typography

### 字体角色

- `--serif`：`ui-serif, "Songti SC", "STSong", "Noto Serif SC", serif`。用于人物姓名、故事标题、关系期待、重要确认标题，传达阅读感与承诺感。
- `--sans`：`Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`。用于正文、标签、按钮、时间、表单与系统信息，保证小字号清晰。

### 层级

- 页面 / Sheet 标题：20—22px，宋体，700。
- 人物姓名：22—25px，宋体，700；不要额外堆叠大号装饰字。
- 段落正文：13—15px，`1.6—1.8` 行高；故事段落优先 `--serif`。
- 标签、按钮、状态：9—13px，`--sans`，通常 700—800。
- 辅助说明：11—12px，颜色使用 `--muted`，不能代替核心说明。

标题可使用轻微负字距（建议不低于 `-0.04em`），禁止让中文笔画挤压或溢出。长标题使用自然换行，移动端不以强制单行换行换取“整齐”。

### 父母端可访问性变体

父母端在页面根节点启用局部可读性变体，不修改 `uni.scss` 或普通用户页面：页面标题 24px、卡片标题 20px、正文 16px、辅助文字 13—14px；父母端 UI 使用无衬线字体，不使用叙事 serif 标题。按钮、列表项、Tab 和图标操作的触控目标不小于 48px。行高保持至少 1.45，长文案允许自然换行，不能用缩小字号维持单行。

父母 shell 使用安全区感知的固定头部、可滚动内容和固定底部导航，滚动内容必须预留 `112px + env(safe-area-inset-bottom)`。身份头部以“父母空间 / 当前协助子女 / 授权状态”形成单一层级，不能让标题贴近状态栏。卡片优先使用 `16—20px` 圆角、轻边界或 `shadow-sm`，不要同时叠加厚边框和重阴影。

复用组件通过 `largeText` / `large-text` 变体放大内部标题、正文、状态、空态和反馈文案。父母端的消息、申请、Sheet、Toast、红娘卡片与底部导航必须完整传递该变体，不能只放大页面外层标题。所有颜色和字体仍使用现有 Token，不建立第二套父母端色板。

## Elevation

阴影表达层级，不制造漂浮的营销感。全局工具类是首选：

```css
.shadow-sm { box-shadow: var(--shadow-sm); } /* 0 2px 12px rgba(17, 23, 24, 0.04) */
.shadow-md { box-shadow: var(--shadow-md); } /* 0 4px 16px rgba(17, 23, 24, 0.08) */
.shadow-lg { box-shadow: var(--shadow-lg); } /* 0 8px 24px rgba(17, 23, 24, 0.10) */
```

- 普通卡片：优先使用 `shadow-sm`，或仅使用 `1px solid var(--line)`；不要同时叠加重边框和大阴影。
- Sheet / Modal：可以使用 `shadow-md` 或 `shadow-lg`，同时依靠遮罩和位置表达层级。
- 首页人物图、语音卡片、深色功能卡片主要靠色块、裁切和间距建立层级，不靠阴影堆效果。
- 不使用纯黑阴影、发光渐变、装饰性玻璃拟态。阴影模糊半径通常不超过 24px。

## Components

### Story / 人物首屏

首页推荐的核心顺序是：人物照片 → 基础资料与认证 → 自我介绍 → 声音 / 生活切片 → 关系期待 → 合拍度参考 → 动作栏。照片卡片采用 `8px 26px 8px 8px` 的非对称圆角作为品牌识别；这个形态只用于人物 / 特色媒体，不扩散到所有卡片。

### Cards / 信任档案

- 标准卡片：`--surface`、`12px` 圆角、`13—16px` 内边距，内容分区用 `--line`。
- 用户卡片：头像区域保持清晰裁切，认证使用圆形徽章或 `XsaTag`，信息不叠加过多标签。
- 特色卡片：可使用 `--navy` 或 `--brown`，必须保留明确标题与正文，不做纯装饰渐变。
- 列表页优先使用真实内容的纵向节奏，不把每一段都包装成相同大小的“图标 + 卡片”。

### Buttons / Actions

- 主按钮用于“申请认识”“确认”“开始聊天”等不可逆或高价值行动；默认 `44—50px` 高度、`8—10px` 圆角。
- 次按钮用于筛选、查看档案、跳过等并列动作；白色表面 + `--line` 边界。
- 文字按钮用于低权重辅助操作；不可伪装成主要 CTA。
- 申请认识必须先经过说明 / 附言 / 安全提示，再确认提交；拒绝不会扣除次数的产品承诺要在相关界面可见。

### Tabs / Navigation

- 一级导航固定为 **首页、牵线、社区、消息、我的**（定版顺序）；路由由 `pages.json` 管理。修改顺序前须与决策层 / PRODUCT 一致并获确认。
- 父母角色使用单页内的 **首页、牵线、消息、我的** 四面板和自定义底部导航；它不替换、不重排普通用户原生五 Tab，也不展示社区或情感实验室。
- 页面内 Tab 使用胶囊或底部线条两种既有变体；选中态使用 `--accent`，未选中使用 `--muted`。
- 底部 Tab、页面顶部栏和内容滚动区要有清晰层级，避免内容被固定栏遮挡。

### Inputs / Tags / Feedback

- 输入框高度约 44px，`9px` 圆角，`--surface` 背景和 `--line` 边框；聚焦时使用统一青瓷绿 outline。
- 标签使用 `XsaTag`；筛选项采用 `choice-chip`，选中时 `--soft` + `--accent` 边界。
- Sheet 用于筛选、完整档案和 AI 解读等可回看内容；Modal 用于申请确认、成功、双方同意等需要明确决策的场景。
- 空状态必须说明发生了什么，并给出可选下一步；Toast 只提示结果，不承载完整业务说明。

### 认证中心 / 手写承诺

- 认证进度固定统计实名认证、学历认证、头像认证、单身承诺四项；手机号绑定作为账号安全项展示，不计入 `已完成 X/4`。
- 学历认证二级视图采用开放式表单层级：最高学历、毕业学校、单张证书图片和隐私提示；图片支持预览与删除重选，底部提交栏必须预留安全区。
- 单身承诺须在实名通过后进入，正文使用 `--warm` 提示表面，签名画布使用 `--surface` + `--line`，不将参考图的紫粉色带入认证域。
- 提交后使用认证中心内的全页状态视图呈现审核中 / 已通过 / 未通过；审核中和已通过可查看本人材料，未通过展示后台原因并提供重新签署或重新提交入口。
- 证书与签名原件只用于本人回看和后台审核，不在公开档案中直接展示。

### 情感实验室 / MBTI

- 页面底色 `--canvas`，卡片 `--surface` + 20px 圆角 + `--shadow-sm`；主 CTA 为 `--accent2` 填充、24px 胶囊、48px 最小高度。整体沿用全站青瓷绿，不为本模块另起色系。
- 答题页单独使用 `--lab-bg: #f8fafa` 背景，避免刺眼纯白；题号/标签/辅助文字使用 `--muted`，题干使用 `--ink` 深炭灰，进度条与选中态使用 `--accent2` 柔和墨绿。
- 三态结构：**未测试**（引导文案 + 插画 +「完成测试」CTA）、**答题中**（题号 + 进度条 + 题干 + 评分点）、**已测试**（结果卡 +「合拍的人」列表 + 底部操作）。
- 开始方式收纳在 `XsaSheet` 动作面板（开始测试 / 设置我的人格类型 / 取消）；16 型选择复用同一 Sheet 组件，标题「选择我的人格类型」。
- **16 型分组底色复用既有 Token，不新增色值**：分析家 NT 用 `--review-lilac` + `--review-deep` 文字，外交家 NF 用 `--sage-soft` + `--sage`，守卫者 SJ 用 `--plane-sky-deep` + `--navy`，探索者 SP 用 `--shortcut-lab` + `--ink2`。选中态统一为 `--accent2` 描边，不因分组改变。
- 插画（笑脸、星形、文档卡、对话气泡）用 `view` 与既有 Token 拼出，不引入位图，避免占用主包体积。
- 答题评分点为大小渐变的圆形（24px—40px），**档位数由后端 `question.options` 决定**，前端不写死 7 档；未选中 `--line` 描边，选中 `--accent2` 填充。
- 合拍卡片的头像、昵称、学校、合拍度与标签均为占位结构，后端 `/emotion-lab/matches` 未就绪前走 `mock/emotionLab.uts`，渲染契约保持不变。

### 消息页 / 快捷入口

- 页面底色 `--paper`（纯白），整体低饱和莫兰迪奶油 ins 风。
- 快捷入口 2×2 网格，卡片圆角 18px，横向纵向间距统一 16px，无阴影。
- 四张卡片底色为新增 Token：
  - 交友申请：`--shortcut-lilac` #F3EEF9（淡香芋紫）
  - 匿名纸飞机：`--shortcut-sky` #E7F3F6（冰雾青蓝）
  - Ta 的动态：`--shortcut-mint` #E9F3EF（清薄荷绿）
  - 匹配实验室：`--shortcut-apricot` #FAEDE4（奶杏暖橘）
- 角标使用 `--badge-coral` #E85D5D（浅红），支持数字圆点和「NEW」标签两种形态。
- 右上角箭头为 24px 圆形 `--surface` 白底 + `--ink2` 深灰字，不使用字符透明度。
- CSS 插画（聊天气泡、纸飞机、照片、烧瓶）保留但缩小至 48px，opacity 0.45，位置右下 14px。
- 聊天记录列表区标题「聊天」+ 右侧「清除未读」文字链接；列表背景 `--paper`，无负 margin 撑满需求。

### AI 画像与语音输入

- **画像页**：自定义导航 +「关于我 / 关于对方」双 Tab（底部线条变体，选中 `--accent` 描边）；构建进度条用 `--accent` 填充、`--warm` 轨道；模式选择卡（`--surface` + `--line` 边界）供用户在文字与语音间二选一；历史版本用 Sheet（上圆角 16px，内容滚动区不超过 50vh）。
- **XsaPortraitField 字段卡**：`--surface`、12px 圆角、`--line` 细边界。状态靠徽章表达：待确认（`--accent2` 文字 + `rgba(56, 152, 141, 0.12)` 底）、已确认（`--sage`）、已拒绝（`--muted` + 70% 透明度）；置信度分高（≥0.85）/ 中（≥0.65）/ 低三档；「引用原文」为可折叠辅助区，浅底用 `--warm`；确认 / 修改 / 拒绝 / 删除按文字按钮处理，确认按钮可用 `--accent` 填充；不使用带颜色的粗 `border-left` 作为状态装饰。
- **VoiceRecorder / VoiceWaveform**：录音键为 64px 圆形，五态——idle（`--surface`）、speaking（AI 播报，`--soft` 波形反向跳动）、listening（聆听，`--accent` 填充 + 脉动光环）、transcribing（旋转加载 + 三点弹跳）、reviewing（转写完成，`--sage`）。长按说话，上滑约 40px 拖拽取消（`--match-coral` 提示），单次录音上限 60 秒；波形由 7 根圆角柱组成，状态动画 0.4s—0.8s。
- 语音问答的转写结果先展示文本供用户修改，确认后才作为回答提交；AI 结果用「仅供参考」说明约束确定性，不用颜色暗示结果。

### 知遇 IP

- 产品内 AI 能力对外统一叫「知遇」。形象只用现有 `/static/ai-cat/ai-cat.webp`，字标组件是 `XsaZhiyuMark`，聚合入口是 `XsaZhiyuHub`。
- 出现位置：首页推荐悬浮、我的页专区与悬浮、他人资料详情悬浮与墨相卡、AI 分身会话头部、真人聊天里的回复建议。
- 颜色继续用 `--navy`、`--accent`、`--accent2`、`--sage` 与现有表面色，不新增 Token，也不另造吉祥物、印章字或「AI 军师」这类并列名字。
- 知遇只整理公开资料、交集和回复建议，必须保留「仅供参考」。不能写成替用户同意、发送消息或承诺关系结果。
### Layout / Responsive / Motion

- 小程序优先，覆盖 320px—428px；内容左右内边距通常 16px，页面底部为固定操作栏预留空间。
- 父母端在 320px、375px、390px、428px 下必须保持 48px 触控目标、四栏底部导航和 16px 正文；空间不足时让信息与动作换行，不压缩字号或遮挡底部安全区。
- 使用 `view` / `text` / `scroll-view` / `image` 和 UniApp API；不得依赖 `window`、`document` 或 DOM 操作。
- 间距以 8px 为主网格，但允许 4px、6px、10px、12px、13px 等用于控件细调；先复用既有 Token，再局部调整。
- 动效以 `0.18s—0.22s` 为主，采用 ease-out；按压可 `scale(0.98)`，悬浮仅用于 H5，不依赖 hover 完成功能。尊重减少动效偏好，不能让内容只在动画完成后才出现。

## Do's and Don'ts

### Do

- 先讲清一个人的生活，再展示认证与关系期待，最后给行动。
- 使用 `XsaButton`、`XsaCard`、`XsaInput`、`XsaTag`、`XsaSheet`、`XsaModal` 等已有组件。
- 让安全提示、认证状态、申请门槛和付费权益在决策点附近出现。
- 用真实图片、真实内容结构和清晰的空 / 加载 / 错误状态建立信任。
- 让 H5 与微信小程序共享同一套 Token，关键路径在微信开发者工具回归。

### Don't

- 不做左右快速滑动匹配，不把首页写成 Tinder 式卡片堆。
- 不在双方同意前开放即时聊天，不展示联系方式，不弱化举报与隐私控制。
- 不新增未经评审的颜色、字体、渐变、超大圆角、纯黑 / 纯白字面色值或装饰性玻璃卡片。
- 不把历史 HTML 原型当作继续维护的生产入口，不新建根目录 `demo*.html`。
- 不使用带颜色的粗 `border-left` / `border-right` 作为卡片装饰，不使用渐变文字、重复网格背景或无意义的编号眉题。
- 不用“限时优惠”“马上脱单”等催促或夸大结果的文案；认真关系需要可核验、可撤回、可理解。


### 兴趣标签与关系期待（2026-09-10）

目录扩充后复用 XsaInput 提供「搜索兴趣标签」，延续上级页面现有 Token。默认按 17 个分区纵向滚动浏览；搜索时展示跨区结果、所属分区与结果数量，无结果给出更换关键词提示，清空恢复原分区。已选区和保存动作保持可见，结果独立滚动；较长标签允许换行，不截断表达。

资料编辑以一个「兴趣标签」卡片汇总兴趣、生活偏好与性格特质，统一青瓷强调色。标签编辑沿用上级的 canvas/surface、accent/accent-bg、line、shadow-sm 与圆角，不新增色值；左侧分区导航、右侧两列选项，已选区限制高度并支持滚动，底部保留安全区。选择达上限时给出明确提示，空选可保存；加载失败展示重试且禁用保存。

每个兴趣分区的选项网格以「＋ 自定义」卡片收尾，不在页面顶部放置常驻输入框。点击后使用 `XsaModal` 打开编辑弹窗，包含标签内容与所属分区；新建默认当前分区，编辑允许重命名和换分区，并提供删除操作。自定义标签创建即选中、移除即删除，在所属分区中显示编辑标记；全局最多 3 个，与系统标签共用 10 个名额。重复、字符、分区和总上限错误使用轻提示，服务端审核失败时保留弹窗内容供修改。

一级分区名称可以宽泛，二级标签必须具体。行为型标签采用「动作 + 明确对象或场景」，例如「逛独立书店」「去看 Livehouse」；不使用「音乐」「旅行」「常去看现场」等与分区重复或对象不明的选项。各分区数量按内容质量决定，不强求等量。

择偶标准「关系期待」使用现有 key 样式的可换行两列选项，长文案不挤进单行分段器；再次点选可取消，不预选关系目标、见面节奏或生育意愿。320/375/390/428px 使用同一 rpx 布局与安全区规则。
