# 无音视频真实业务验证记录

日期：2026-09-27。前端 `D:/项目/宣誓爱/xuanshiai-vue`，后端 `D:/项目/宣誓爱后端/xuanshiai`。本记录区分源码、编译、模拟器、真实数据库与平台验收；不是正式开播许可。

## 已实现

- 服务端统一角色／动作／目标范围；独立运营、唯一控场者、接管／交还和过期拒绝审计。主持不能移出运营，其他管理员没有跨场次特权。
- 完整名单创建、分页搜索现有账号、场前版本化编辑、变更后的重新确认与签到、邀请拒绝、排期／取消／结果站内通知。
- `LIVE_MEDIA_MODE=disabled`只供独立开发／测试。场次固定媒体模式，无云配置也能运行正常登录、签到、四轮与申请闭环；没有假凭证、假检测或假连麦。
- 红娘／本轮候选人问答举手与撤回；候场嘉宾不可举手；暂停、主嘉宾离场跳轮、依席位交流、退出及同对去重。
- 私密选择只向本人返回，Redis仅传版本；每个订阅按登录账号生成快照。场后共享机会与既有申请、答复及聊天服务衔接，不自动申请，不绕过实名、封禁或拉黑。
- 前端六页、名单编辑器、操作记录与通知入口；离线Demo新增独立运营。切号或页面失效后旧选择／申请／离场／举报确认不继续提交。
- 后端环境模板、接口字段／OpenAPI、模块说明、产品定义及AI协作提示词同步。真实密钥不写模板或前端；没有操作GitHub、云控制台或正式库。

## 已验证：结果与证据

| 层级 | 实际执行与结果 |
| --- | --- |
| 后端直播专项 | `test_live_business_domain.py`、`test_live_domain.py`、`test_live_media.py`、`test_live_disabled_media.py`：90通过。包含权限矩阵、角色兼任、阶段／截止、名单重签、接管、退出、配置隔离及运营仅CDN凭证 |
| 真实MySQL＋Redis集成 | `test_live_business_mysql.py`与`test_live_business_ws.py`：2通过，7.22秒；[原始脱敏结果](backend-integration.txt)。账号正常登录、真实HTTP、事务及Redis执行，不使用直播API假响应 |
| 既有MySQL直播回归 | `test_live_mysql.py`另行1通过；[结果](backend-legacy-live.txt)。该历史测试含媒体／Redis替身，不替代上行新增的真实Redis集成 |
| 后端全量 | 274通过、4项既有社区失败、17跳过，2.62秒。环境门控跳过项中的两项新直播集成已在隔离执行器单独运行，不把跳过写成通过 |
| 后端静态 | 本轮config、schema、route、service、测试与执行器的Ruff检查通过 |
| 前端源码／组件回归 | 9个`test-live-*.js`脚本＋Mock、消息flow/API安全/UI安全、账号隔离、角色路由、分包资源，共16组通过。原生SDK测试有平台替身，不是媒体验收 |
| HBuilderX | 18:46:58（北京时间）生产子项目mp-weixin编译成功，52页；既有未关联uniCloud、样式隔离提示保留，未借此改保护配置 |
| 严格包体门禁 | `npm run verify:mp`通过；主包2023.4KiB、直播分包246.8KiB，其余分包均≤2048KiB；17个媒体文件、lazyCodeLoading、52页JS/WXML完整性通过。主包仅余约24.6KiB，未提高阈值 |
| 微信真实后端交互 | 18:59:33（北京时间）390px模拟器完成正常测试Provider登录、搜索12个真实测试账号、完整名单、四轮顺序、创建、排期、版本化标题修改；[机器结果](devtools-result.json)。页面显示无音视频，没有请求替身或注入登录票据 |
| 离线Demo微信交互 | 18:57:10（北京时间）390×844完整四轮及场后同意／聊天／拒绝通过；[Demo机器记录](../live-demo/devtools-result.json)及15张截图已更新，不能代替上行真实接口验证 |

四轮HTTP集成覆盖：第一轮三组完成交流，第二轮无人互选，第三轮一组完成另一组退出，第四轮同对去重与新组合收尾，共5个有效共享机会。测试只推进服务端业务时钟以缩短等待，不替换登录、数据库、Redis或业务响应；云调用边界设置“触发即失败”，不是返回假成功。

真实TCP WebSocket运行实际uvicorn，7路角色连接。覆盖正常会话、未受邀／无登录握手拒绝、客户端伪造角色无效、工作人员看不到单方意愿、名单角色变更、接管后的旧主持拒绝、移出断开、注销撤销会话及断线重进快照。不能将这些断言等同于多人手机弱网验证。

真实UI截图：[名单表单](01-roster.png)、[主嘉宾顺序与告知](01b-roster-order.png)、[排期后的房间](02-operator.png)、[运营控件](03-operator-controls.png)、[版本修改后](04-edited.png)。截图来自实际模拟器；本机显示缩放使文件约149×322px，逻辑视口390px，不放大伪装真机或高分辨率截图。长表单由滚动截图及操作断言共同覆盖。

场后集成覆盖日常次数用完仍可申请、双方并发同一机会只形成同一有效申请、重复发送、拒绝不退款、机会过期、拉黑以及未同意不能聊天／同意后沿用原聊天。合成账号资料由测试夹具准备，既有真实资格检查没有移除。

## 可复现命令

后端目录执行：

```powershell
.venv/Scripts/python.exe -m pytest tests/test_live_business_domain.py tests/test_live_domain.py tests/test_live_media.py tests/test_live_disabled_media.py -q
.venv/Scripts/python.exe scripts/verify_parent_mbti_mysql.py --mysqld 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe' --artifacts 'C:/Users/Administrator/AppData/Local/Temp/xsa-live-business-verification' --live-business --tests tests/test_live_business_mysql.py tests/test_live_business_ws.py --serve-port 8000 --serve-seconds 900
```

执行器创建随机端口、随机密码的私有MySQL与WSL Ubuntu中的Redis，仅操作自己创建的进程和合成库。测试后API在127.0.0.1最多运行15分钟，随后停API／MySQL／Redis并删除本次临时凭据文件；保留合成数据和诊断日志。长期测试环境另按后端配置说明部署，不把临时服务视为已部署。

最新集成诊断目录：`C:/Users/Administrator/AppData/Local/Temp/xsa-live-business-verification/parent-mbti-mysql-05bqzoql`。此目录不是交付密钥位置，不复制临时凭据；已把脱敏pytest结果另存到本记录目录。

前端目录执行：

```powershell
node tests/test-live-business.js
node tests/test-live-business-ui.js
node tests/test-live-runtime.js
node tests/test-live-controls.js
node tests/test-live-demo.js
node tests/test-live-demo-client.js
node tests/test-live-demo-follow-up.js
node tests/test-live-demo-launch.js
node tests/test-live-native-sdk.js
node tests/test-mock-system.js
node tests/test-message-flow.js
node tests/test-message-api-security.js
node tests/test-message-ui-security.js
node tests/test-account-request-isolation.js
node tests/test-role-routing.js
node tests/test-mp-subpackage-assets.js
& 'D:/HBuilderX/cli.exe' launch mp-weixin --project xuanshiai-vue --compile true
npm run verify:mp
```

微信工具打开生成目录并开启IDE服务端口，再执行：

```powershell
& 'D:/soft/wxkaifa/微信web开发者工具/cli.bat' auto --project 'D:/项目/宣誓爱/xuanshiai-vue/unpackage/dist/dev/mp-weixin' --auto-port 9420 --trust-project
node scripts/verify-live-business-devtools.cjs 'C:/Users/Administrator/AppData/Local/Temp/xsa-live-tools-20260927/node_modules/miniprogram-automator'
node scripts/verify-live-demo-devtools.cjs 'C:/Users/Administrator/AppData/Local/Temp/xsa-live-tools-20260927/node_modules/miniprogram-automator' --screenshots
```

真实UI脚本拒绝覆盖已有登录，使用合成运营1020通过正常手机号登录，结束时调用注销并只清除自己登录的三个会话存储键；不写父母身份。只临时捕获showToast用于诊断，不替换业务响应。两个微信脚本须顺序执行，不要在执行途中重新编译。测试工具包位于临时目录，不是项目生产依赖。

本机localhost要求用户启用“不校验合法域名…”；用户已确认并完成。HBuilderX重编译会重建生成目录中的private配置，本轮只恢复用户选择的`urlCheck=false`，未改源码的受保护配置。该设置不可用于正式上线。

## 本轮定位并修复

1. 权限从零散角色判断收敛为同一策略，同时用于执行与快照：修复主持移出运营、候场嘉宾举手、红娘在无效阶段操作及兼任问题。测试先失败再实现。
2. 真实微信排期返回“Input should be a valid list”：UTS生成的可选字段为null。HTTP边界显式省略未填字段，保留空数组／false；后端严格类型不放宽。新增失败回归后修正，并通过实际排期请求。
3. 切号或页面关闭后的旧申请／离场／举报确认可继续调用：捕获原操作身份及版本，在回调处核验当前页面／账号，不为新身份代提交。
4. 自动化连续触发四个picker时未等待父子组件更新：按每次选择的实际渲染结果等待，未在产品代码增加延时或重复本地状态。原生picker同时绑定已选值，重新打开时对应当前席位。
5. 微信开发者工具热更新后仍加载旧函数：核对实际运行模块与磁盘产物，使用官方CLI仅清理此生成项目的编译缓存后重开，未清登录／用户缓存。验证以重新加载后的运行结果为准。

## 既有失败与未完成事项

| 项目 | 事实与下一步 |
| --- | --- |
| 后端全量4项失败 | `test_community_interactions_require_realname`、`test_community_browsing_does_not_require_realname`、`test_paper_plane_rollback_failure_preserves_database_error_and_attempts_refund`、`test_community_media_routes_registered`；与任务前基线相同，社区模块另行处理 |
| 通用初始化器 | 私有MySQL初始化时仍报既有TABLE_SCHEMA外键自检警告；不是本轮新增直播表，未为消除输出修改通用初始化逻辑 |
| 工作区全量差异检查 | 前端已有api/community.uts:26行尾空格及HOW_TO_RUN、MOCK_API_GUIDE、PROJECT_STATUS、TROUBLESHOOTING、前端开发注意事项中的冲突标记；不覆盖他人改动，本轮范围单独检查 |
| 320／375／428px | 未实际切换，用户此前要求先记录待验收；不以390px截图替代 |
| iOS／Android及多人多机整场 | 未执行；正常会话多连接测试与单台模拟器不能代替真实设备、后台切换和弱网 |
| 目标测试部署 | 尚未部署长期测试MySQL／Redis／HTTPS/WSS和合法域名；本轮本机临时服务不触碰正式数据 |
| Pen同步 | 官方Pencil工具返回transport not connected，未更新D:/项目/xuanshiai-pen/直播.pen；新增运营、名单、接管与无媒体状态待连接后同步和重新打开验收 |
| TRTC与正式开放 | 真机音视频权限、服务端密钥、安全轮换、八路连麦、强制下台、混流/CDN、弱网、留存与正式开放均未验证。本轮无任何真实云操作 |

设计与平台限制不影响已经验证的本机真实业务链，但整份计划仍有上述设计／设备验收未完成项。后续操作入口见[模块运行说明](../../直播真实业务演练说明.md)，接手要求见[AI协作提示词](../../ai-collaboration/直播模块协作提示词.md)。

## 差异与代码关系索引

本轮已跟踪修改范围`git diff --check`通过；后端全量差异检查通过。对未跟踪的直播源码、测试、脚本和新文档另行扫描，无冲突标记／行尾空格。前端全工作区仍存在表中历史失败，没有删除或修补无关改动。

从`D:/项目/宣誓爱`执行`graphify update .`成功，更新`graphify-out/graph.json`、`graph.html`和`GRAPH_REPORT.md`，自动备份旧图。当前2459节点、2584边、243社区；旧社区标签变化仅作提示，未调用外部LLM重新标注。相邻后端没有既有graph.json；本轮没有另建索引体系或修改Graphify配置。
