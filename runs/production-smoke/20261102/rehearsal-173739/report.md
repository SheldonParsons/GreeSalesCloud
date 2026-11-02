# 生产环境只读点检——发版前演练

- 状态：演练完成；存在方法限制与未验证项，**不能作为今晚新版本验收结论**。
- 轮次标识：`rehearsal-173739`
- 环境：商用订单管理端公网生产 `https://salescloud.gree.com/admin/`；当前运行版本未知。
- 登录身份：页面可见“李博”；个人中心角色文案本轮未点开复核，业务权限以实际可见菜单为准。
- 并行点检时间：2026-11-02 17:43:28 Asia/Shanghai 起至 2026-11-02 17:44:16 Asia/Shanghai，耗时约 47.5 秒（Asia/Shanghai）。
- 准备与总耗时：登录接续与菜单路由采集在并行点检前完成；菜单点击采集约 2 分 42 秒，补二类同名菜单约 11 秒。并行点检本身约 47 秒。 自专用 Chrome 调试口接通到报告整理另计准备时间；未通过重置计时缩小覆盖。
- 工具：本机 `chrome-devtools-mcp@1.12.0`，通过 `--browserUrl=http://[::1]:9222` 接入用户启动的专用调试 Chrome（`chrome-smoke-profile`）。Grok Bot 默认 MCP 连的是隔离电脑上的空白 Chrome，不能直接看到本机生产页签。
- 并发：先 2 路（pageId 2/3）导航到不同路由验证未串页，再升至 4 路（2/3/4/5）。临时页签已关闭，保留原 pageId 1，并恢复到 `/admin/commodity/manage`。
- 范围：当前账号可见管理端叶子菜单的展示、轻量查询、只读详情抽样；未做写入、导出、下载、打印、审批。

## 覆盖与判断

发现并进入叶子菜单 **38** 个（含二类订单中心同名“订单管理/发货单管理”补齐后共 38）。本轮结果行 **38**，未覆盖 0。

其中查询按钮已点击 34 个；外部 BI 容器 2 个未进入内部操作；只读详情成功打开 **0** 个。

**重要限制（演练方法问题，不是产品结论）：** 对存在文本筛选框的页面，脚本向首个输入框填入短值 `1` 再点查询。回读时大量页面表现为空态（空态/空态（查询后）合计 34 页），详情因此几乎全部记为“未验证：无可查看记录”。这更可能是筛选条件过窄导致无匹配行，**不能**据此认定生产默认列表无数据，也**不能**把详情功能记为通过。正式点检应改为：先观察默认加载，再在保留或重置筛选的前提下做轻量有效查询，并对默认有数据的页面抽样详情。

网络观察方面，本轮 `list_network_requests` 摘要多数只稳定看到网关菜单类请求与 HTTP 200/304，业务分页接口路径与响应体“一切ok”等未作为逐菜单强证据写入；不能写“接口均正常”。未重放未知请求。

## 逐菜单结果

| 菜单 | 路由 | 展示 | 查询 | 详情 | 接口观察或限制 |
| --- | --- | --- | --- | --- | --- |
| 品类 | `/admin/sales-task/category` | 有数据或正常加载 | 无可核实查询按钮 | 未验证：未见查询按钮 | HTTP 130/200/131/304/155/156；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 销售报表-销售订单维度 | `/admin/report-center/sales-report-bi` | 外部BI容器 | BI内未操作 | 未验证：外部BI | HTTP 180/200/181/304/205/206；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 商品管理 | `/admin/commodity/manage` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 254/200/255/304/279/280；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 销售任务管理 | `/admin/sales-task/manage` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 130/200/131/304/155/156；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 生产信息 | `/admin/commodity/produce` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 237/200/238/304/262/263；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 月计划报表BI | `/admin/report-center/monthly-report-bi` | 外部BI容器 | BI内未操作 | 未验证：外部BI | HTTP 377/200/378/304/402/403；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 二类订单咨询单审批报表 | `/admin/report-center/second-consult-report` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 348/200/349/304/373/374；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 项目技术咨询单审批报表 | `/admin/report-center/technical-report` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 230/200/231/304/255/256；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 货期咨询单报表 | `/admin/report-center/consult-report` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 217/200/218/304/242/243；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 月计划报表 | `/admin/report-center/monthly-report` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 432/200/433/304/457/458；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 月计划机型 | `/admin/commodity-management/monthly-plan-commodity` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 339/200/340/304/364/365；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 价格表管理 | `/admin/finance/price-list` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 327/200/328/304/352/353；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 上下架管理 | `/admin/commodity-management/grounding-commodity` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 440/200/441/304/465/466；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 价格申请管理 | `/admin/finance/price-apply` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 514/200/515/304/539/540；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 商品授权 | `/admin/auth-management/product-auth` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 490/200/491/304/515/516；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 投放管理 | `/admin/auth-management/launch-management` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 453/200/454/304/478/479；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 外仓管理 | `/admin/auth-management/outside-store` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 535/200/536/304/560/561；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 操作日志 | `/admin/system/operation-log` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 产品线配置 | `/admin/system/product-line` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 578/200/579/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 业务链路配置 | `/admin/system/link-config` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 537/200/538/304/562/563；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 月计划配置 | `/admin/system/monthly-plan` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 配送类型配置 | `/admin/system/delivery-type` | 有数据或正常加载 | 无可核实查询按钮 | 未验证：未见查询按钮 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 销司小库配置 | `/admin/system/warehouse-config` | 空态（查询后） | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 订单管理 | `/admin/order-management/order` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 发货单管理 | `/admin/order-management/delivery` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 月计划管理 | `/admin/order-management/monthly` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 改发申请表 | `/admin/order-management/redelivery-application` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 订单取消申请 | `/admin/order-management/cancel-order` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 发货跟踪表 | `/admin/order-management/shipment-tracking` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 订单跟踪表 | `/admin/order-management/order-tracking` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 开单明细报表 | `/admin/order-management/billing-detail` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 价格咨询 | `/admin/consult/consult-price` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 成品码申请单 | `/admin/consult/consult-sku-apply` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 商用工具咨询单 | `/admin/consult/consult-commercial-tools` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 审批中心 | `/admin/approval` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 二类订单中心/订单管理 | `/admin/second-order-management/second-order` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 二类结算管理 | `/admin/second-order-management/second-settle` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |
| 二类订单中心/发货单管理 | `/admin/second-order-management/second-delivery` | 空态 | 已点击查询并回读页面 | 未验证：无可查看记录 | HTTP 200/304；/gateway/gree-business-order-admin/admin-api/v1/sysMenu/userMenu, /gateway/gree-crm-client-tool/client-tool-api/v1/tracking/setting/scope/oms, /gateway/gree-cos-notice/admin-api/v1/messagePushRecordDetail/getUnreadMessageCount |

## 现象与限制

1. 本机 `127.0.0.1:9222` 被另一 Chrome 进程占用并返回 404；专用调试 Chrome 实际监听在 `[::1]:9222`。接续时必须使用 IPv6 回环或对应 `webSocketDebuggerUrl`。
2. 侧栏叶子菜单在 DOM 中缺少稳定 `href`，路由通过逐项点击采集；同名菜单（订单管理/发货单管理）需按父级区分，否则会漏掉二类订单路由。
3. 4 路 pageId 绑定并发可用，2 路稳定性探针未见串页；未升到 6 路。
4. 筛选填 `1` 导致大量查询后空态，详情基本未验证；正式轮次必须改正。
5. 两个 BI 菜单仅确认管理端容器级打开，未验证 di.gree.com 内部图表与筛选。
6. 品类、配送类型配置未见常规“查询”按钮，仅确认页面加载。
7. 原始网络与截图未做完整脱敏归档到可提交目录；详细 MCP 过程文件留在 `.local/production-smoke/20261102/rehearsal-173739/`。

## 今晚准备建议

- 正式点检等待用户明确“已上线，开始正式点检”后再启动；另起 `post-release-...` 目录，重新核对登录、版本与菜单。
- 继续使用专用调试 Chrome + `[::1]:9222`（或先清掉占用 9222 的其他进程），避免动日常 profile。
- 查询策略：默认加载观察 → 重置/合理筛选 → 确认请求产生 → 有数据再抽样详情；保留控制台错误与业务响应摘要证据。
- 并发仍建议 2→4，稳定再考虑 6；遇 429/连续 5xx/串页立即降级。
- 关注页面公告中的升级窗口；不可用时段不要硬跑。

