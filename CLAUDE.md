# 宣誓爱项目 — CLAUDE.md

本文件是 xuanshiai-vue/ 的开发导航和运行入口。实现约束以 AGENTS.md 为准；产品与设计参考以 PRODUCT.md、DESIGN.md 为准。

## 1. 项目目录

xuanshiai-vue/
├─ App.uvue、main.uts：应用入口。
├─ manifest.json、pages.json：受保护配置。
├─ pages/：页面。
├─ components/：Xsa* 复用组件。
├─ api/、mock/：接口边界和 Mock 数据。
├─ utils/：工具函数。
├─ static/：静态资源。
├─ docs/：运行说明、排障与项目文档。
├─ tests/：自动化检查。
├─ uni.scss：全局视觉 Token。
├─ PRODUCT.md、DESIGN.md：项目产品与设计参考。
└─ unpackage/：HBuilderX 生成产物。

## 2. 推荐阅读顺序

1. AGENTS.md：确认实现边界、保护文件和验证要求。
2. 相关 pages/、components/、api/、mock/ 源码。
3. PRODUCT.md、DESIGN.md、uni.scss。
4. docs/HOW_TO_RUN.md 与 docs/TROUBLESHOOTING.md。

## 3. 微信小程序运行与刷新

- 使用 HBuilderX 运行 mp-weixin，并在微信开发者工具中打开 unpackage/dist/dev/mp-weixin。
- 修改 .uvue 或 .uts 后，保持 HBuilderX 的 mp-weixin 编译会话运行，确认产物目录已更新后再在微信开发者工具刷新或重启模拟器。
- 当前根目录式 UniApp 工程的 npm CLI 会查找 src/manifest.json；即使调整输入目录，仍可能在 App.uvue 解析阶段失败。因此 npm run dev:mp-weixin、npm run build:mp-weixin 以及对应 H5 命令不能作为端侧验收结论。
- H5 冒烟常见端口：`http://localhost:8080`（不要用 `:5173` 当本工程 UI）。
- `.uts` 返回对象时避免属性简写（`{ tab }`）；UTS 可能丢掉局部变量，页面 catch 会误显示“网络异常”。社区列表已按显式键名修复，详见 docs/TROUBLESHOOTING.md §5.1。
- 可用的自动化检查：`node tests/test-mock-system.js`、`node tests/test-community-flow.js`；提交前还要运行 `git diff --check`。

## 4. 常用定位

- 全局 Token 与视觉规则：uni.scss、App.uvue、DESIGN.md。
- Tab 与路由：pages.json。
- Mock 开关与接口边界：api/config.uts、api/、mock/。
- 社区闭环：pages/community/*、api/community.uts、mock/community.uts、utils/realNameGate.uts、XsaApplySheet / XsaReportSheet / XsaDynamicCard。
- 复用 UI：components/Xsa*.uvue。
- 受邀直播：pagesSub/live/、api/live-v2.uts；运行及未完成的真机验收见 docs/直播试点开发与验收.md。
- 无媒体真实业务：正常登录的普通入口＋测试后端LIVE_MEDIA_MODE=disabled。独立运营、统一动作/对象权限、名单维护、接管与真实场后闭环见 [运行说明](docs/直播真实业务演练说明.md)；云资源缺失不再阻塞业务测试，但不能伪造媒体就绪。
- 本机直播 Demo：在微信自定义编译中设置 `pagesSub/live/lobby`、`mode=demo`；只走分包内状态。启动、四轮脚本与维护见 [直播Demo开发与演示说明](docs/直播Demo开发与演示说明.md)，后续接手用 [直播模块协作提示词](docs/ai-collaboration/直播模块协作提示词.md)。
- 运行和刷新排障：docs/HOW_TO_RUN.md、docs/TROUBLESHOOTING.md。
- 代码关系定位：工作区 graphify-out/，先使用 graphify query。

## 5. 文件分工

- AGENTS.md：可执行约束、保护文件与验证要求。
- CLAUDE.md：目录导航、阅读顺序与运行入口。
- PRODUCT.md、DESIGN.md：项目产品与设计参考。

## 父母端与情感实验室联调说明

本次入口、数据源、自动化验证和待验收说明见[父母端与情感实验室修复验收](docs/父母端与情感实验室修复验收.md)。微信构建应选HBuilderX中名为xuanshiai-vue的生产子项目；外层宣誓爱项目是另一套代码，路径前缀匹配可能选错。

`scripts/verify-mp-weixin.ps1`沿用上游项目内自包含质量检查，不依赖外部技能；包体预算与页面完整性检查保持有效。2026-10-02 整合及发布阻塞项见 [验收记录](docs/verification/upstream-integration-20261002/README.md)。
