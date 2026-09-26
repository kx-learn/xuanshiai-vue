# 运行与编译排错

## 1. 先确认执行目录

所有 npm 命令都应在 `xuanshiai-vue` 项目目录执行：

```bash
npm install
node tests/test-mock-system.js
```

如果提示找不到 `package.json`，说明当前目录不正确。

## 2. npm CLI 与根目录式工程

当前工程把 `manifest.json`、`pages.json`、`App.uvue` 和 `main.uts` 放在项目根目录。当前 npm CLI 默认把 `src/` 视为输入目录，因此可能先报：

```text
ENOENT: no such file or directory, open '<项目目录>\\src\\manifest.json'
```

即使临时把 `UNI_INPUT_DIR` 指向项目根目录，当前依赖组合仍会在 `App.uvue` 上出现 `.uvue` 未被正确转换的解析错误。这是入口和编译链问题，不是 `manifest.json` 内容错误。

处理原则：

1. 当前优先使用 HBuilderX 做 H5 与微信小程序编译。
2. 保留完整首错、Node/npm/HBuilderX 版本和目标端。
3. 不复制或移动 `manifest.json`、`pages.json` 到 `src/`。
4. 不批量重命名 `.uvue` / `.uts`，也不直接修改 `node_modules`。
5. 若要修复 CLI，先提交独立迁移方案并做双端回归。

## 3. uniCloud 服务空间提示

当前全局请求使用 FastAPI HTTP；社区 1.0 验收保持 HTTP，只有结构预览或尚未接入后端的模块才临时使用 Mock：

```uts
// api/config.uts
export const USE_MOCK = false
```

消息、父母端和情感实验室仍使用显式模块 Mock。`manifest.json` 当前包含 `"uniCloud": false`，但工程中仍保留受保护的 `uniCloud-aliyun/` 目录。若 HBuilderX 仍提示关联服务空间：

1. 先取消或跳过关联提示并重新编译。
2. 确认目标模块 Mock 开关符合本次验证场景；社区 1.0 真实接口排查保持为 `false`。
3. 清理构建缓存后重试。
4. 记录 HBuilderX 版本和完整错误信息。

不要为了绕过提示删除、重命名 `uniCloud-aliyun/`，也不要擅自修改 `manifest.json`。

## 4. 页面空白或编译失败

按顺序检查终端第一条错误、导入路径和文件名大小写、浏览器专用 API、依赖安装状态。必要时重新执行 `npm install`，清理 `unpackage/` 后重新构建，但不要修改其中产物。

## 5. Mock 没有生效

检查 `api/config.uts` 的 `USE_MOCK`、页面是否从 `@/api` 导入、对应 API 是否传入 `mockData`，并查看控制台的 `[Mock Request]` 日志或真实错误。

## 5.1 社区显示“网络异常”但并非真断网

**现象：** 社区 Tab 或动态列表 toast/空态为“网络异常，请检查后重试”，H5 与小程序都可能出现；`USE_MOCK = true` 时仍复现。

**原因（2026-07-23 已定位并修源码）：**

1. 页面 `catch` 把任意异常都映射成“网络异常”文案（见 `pages/community/community.uvue` 的 `loadDynamics`）。
2. 真实抛错来自 UTS 编译坑：`api/community.uts` 的 `normalizeListQuery` 使用对象属性简写（如 `return { tab, filter, page }`）时，编译产物可能丢掉局部变量绑定，运行时报 `ReferenceError: tab is not defined`。
3. 该错误被页面 catch 后伪装成网络问题。

**处理：**

1. 源码保持 `resolveTabValue` + 显式属性名（`tab: tabName` 等），避免 UTS 对象简写。
2. 用 HBuilderX **重新**运行到微信 / 浏览器，确认 `unpackage/dist/dev/mp-weixin/api/community.js` 中为 `tab: tabName_1` 一类显式键值，而不是裸 `tab`。
3. 若仍失败：在开发者工具 Console 看首条真实堆栈，不要只信 toast 文案。

同类风险：其它 `.uts` 里 `return { foo }` / 短属性简写若再出现诡异 ReferenceError，优先对照编译产物，而不是先查网络。

## 5.2 更改微信 AppID 失败或“改了没生效”

常见原因（开发期）：

1. `manifest.json` 里的 `mp-weixin.appid` 必须是已授权的 `wxb5f4e639f4eb2591`；只改产物里的旧 `touristappid`，下次 HBuilderX 编译会覆盖产物。
2. 填成了 uni-app 应用标识（如 `__UNI__...`）而不是微信小程序 AppID。
3. 未获授权修改受保护的 `manifest.json`，或开发者工具无该 AppID 权限。
4. 微信开发者工具项目仍指向旧目录或旧产物。

当前授权 AppID 已写入 `manifest.json`；修改后必须重新用 HBuilderX 编译并导入最新产物。物理真机和生产发布还需正式 HTTPS 合法域名及相应权限。

## 6. 微信开发者工具未自动打开

确认已安装工具、开启“设置 → 安全设置 → 服务端口”，并在 HBuilderX 中检查工具路径。当前 npm CLI 入口未通过，不要依赖 `npm run dev:mp-weixin` 生成新产物；只能导入本次由 HBuilderX 成功生成且路径明确的构建目录。

若 HBuilderX 编译成功但未拉起微信开发者工具，可手动导入：

```text
unpackage/dist/dev/mp-weixin
```

命令行（服务端口已开启时）也可：

```bash
# Windows 示例，路径按本机安装位置调整
"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" open --project "<项目绝对路径>\unpackage\dist\dev\mp-weixin"
```

## 6.1 HBuilderX 导入不顺畅

优先核对：

1. 打开的是 `xuanshiai-vue` 目录本身，而不是上一级 `宣誓爱`，也不是 `unpackage/`。
2. 根目录必须有 `App.uvue`、`main.uts`、`manifest.json`、`pages.json`。
3. `static/logo.png` 应存在；缺失时 App 图标配置会报警。业务肖像在 `static/portraits/`。
4. 开发期 `uniCloud: false`；当前全局走 HTTP，社区 1.0 联调使用 `USE_MOCK = false`，部分模块走显式 Mock。若提示关联云服务空间，可取消/跳过，不要删 `uniCloud-aliyun/`。
5. 本工程是 **uni-app x（`.uvue` / `.uts`）**，需使用支持 uni-app x 的 HBuilderX 版本；旧版只认 `.vue` 时会识别异常。
6. 项目路径含中文（如 `宣誓爱`）在多数新版本可用；若工具链报路径编码错误，可临时复制到纯英文路径做对照验证，但不要把对照副本当唯一主仓库。
7. 导入后先清一次运行缓存，再“运行到微信开发者工具”，避免沿用旧 `unpackage` 产物误判。
8. 若提示打开不存在的旧路径（例如 `Desktop/前端/xuanshiai-vue/frontend`）：关闭对应标签，从最近项目移除旧工程，只保留 `Desktop/宣誓爱/xuanshiai-vue`。这是本机工作区迁移残留，不是当前源码缺失。

## 7. H5 正常但小程序异常

优先检查 DOM/浏览器 API、不受支持的 CSS、图片路径和大小写、键盘与安全区、滚动容器、固定定位、权限和网络域名配置。H5 结果不能替代微信小程序验收。

## 8. 提交问题时提供

```text
目标端：H5 / mp-weixin
执行命令：
Node/npm/HBuilderX 版本：
第一条完整错误：
相关页面：
全局及模块 Mock 开关：
复现步骤：
```

## 微信端颜色 / 组件“没样式”

**现象：** 小程序能打开，但卡片、按钮颜色发灰、背景不对，或像没加载全局色。

**原因（已按方案 A 修复源码）：**

1. 业务样式大量使用 `var(--canvas)` 等 Token。
2. Token 必须定义在会进入微信 `app.wxss` 的全局样式（`App.uvue` 的 `page`）；仅写在 `uni.scss` 且未注入时，小程序端变量为空。
3. 旧实现使用 `oklch()`，微信基础库支持差。

**处理：**

1. 确认 `App.uvue` 的 `page { --canvas: #F4F8F7; ... }` 仍在。
2. 用 HBuilderX 重新“运行到微信开发者工具”，不要只打开过期的 `unpackage` 目录。
3. 开发者工具里检查 `app.wxss` 是否包含 `--accent` 等变量定义。
4. 页面/组件继续用 `var(--token)`；不要为修色散落硬编码。
