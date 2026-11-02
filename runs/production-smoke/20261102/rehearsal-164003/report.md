# 生产环境只读点检——发版前演练

- 状态：演练完成，存在未覆盖项和待排查现象；不能作为今晚新版本验收结论。
- 环境：商用订单管理端公网生产，https://salescloud.gree.com/admin/；当前运行版本未知。
- 登录身份：李博（A80646），个人中心显示“普通员工”；业务权限以本轮实际可见菜单为准。用户确认原页签及使用其登录态。
- 时间：2026-11-02 16:40:03 起核对身份和接续，16:40:39 前进入点检，16:47:21 停止页面操作，报告整理至 16:47:58，计时部分合计约 7 分 55 秒。可计时部分准备不超过 36 秒、实际点检约 6 分 42 秒；前一轮等待用户确认之前的准备开始时间未记录。
- 工具与并发：Chrome DevTools MCP；headless 配置目录被既有进程占用，不能接续，用户明确允许使用现有生产登录态后新建 4 个临时页签。先 2 路验证页面独立，再升至 4 路，未升至 6 路。临时页签已关闭，原页签保留。多标签共享系统内页签导航记录，页面主体按 pageId 分别操作。
- 范围：当前账号可见管理端菜单的展示、默认加载、轻量查询和只读详情；没有操作写业务、导出、下载、打印或审批。

## 覆盖与判断

发现 38 个叶子菜单，实际进入 38 个；其中 36 个管理端页面展示了内容或空态，另 2 个仅确认管理端容器和外部 BI 嵌入请求，未验证内部显示。34 个菜单以改变筛选条件后观察到新请求、成功业务响应及页面结果，计为查询完成；销售任务品类、配送类型配置未找到适用的常规查询；2 个 BI 内部查询未操作。

默认加载显示空态 19 页；空态本身不视为异常，详情记未验证。另 16 页默认有列表数据，1 页为分类展示，2 页为 BI 容器。10 页打开只读详情且至少一个所选行字段与详情内容相符，其中 3 页详情响应体未复核；商品管理详情打开但未取到原行字段，记录对应性未确认。月计划机型未发现明确查看入口；其余有数据页面未全部抽样。字段重合是有限的对应性证据，不能替代完整业务规则核验。

月计划管理抽样翻至第 2 页，显示 20 行，新增列表请求 HTTP 200、业务消息“一切ok”。其余页面分页未逐一验证。

## 逐菜单结果

表中空态为默认加载时观察；查询完成以变更筛选条件后的新增请求和结果为依据。接口列出本轮自然触发的代表性请求；其他请求、未取得响应体及 BI 内部请求不因此被认定正常。

| 菜单 | 路由 | 默认展示 | 查询 | 详情 | 接口观察或限制 |
| --- | --- | --- | --- | --- | --- |
| 商品中心/商品管理 | `/admin/commodity/manage` | 有数据 | 调整条件查询完成 | 已打开，对应性未核实 | HTTP 200、业务“一切ok”；gree-cos-commodity/admin-api/v1/commodity/pageForGree |
| 商城管理/上下架管理 | `/admin/commodity-management/grounding-commodity` | 有数据 | 筛选查询完成 | 已打开，行字段匹配 | HTTP 200、业务“一切ok”；gree-cos-commodity/admin-api/v1/commodityShelf/page |
| 商品中心/生产信息 | `/admin/commodity/produce` | 有数据 | 筛选查询完成 | 已打开，行字段匹配 | HTTP 200、业务“一切ok”；gree-cos-commodity/admin-api/v1/commodityProductionInfo/page |
| 销售任务/品类 | `/admin/sales-task/category` | 分类展示 | 无可核实查询 | 不适用 | 默认请求 HTTP 200；业务体未全面核对 |
| 销售任务/销售任务管理 | `/admin/sales-task/manage` | 空态 | 调整条件查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-cos-quota/admin-api/v1/manager/salesQuota/page；曾有控制台错误 |
| 商城管理/月计划机型 | `/admin/commodity-management/monthly-plan-commodity` | 有数据 | 筛选查询完成 | 未验证：未发现明确查看入口 | HTTP 200、业务“一切ok”；gree-cos-commodity/admin-api/v1/commodityMonthPlanModelChannel/pageList |
| 财务中心/价格表管理 | `/admin/finance/price-list` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-cos-commodity/admin-api/v1/commodityPrice/page |
| 财务中心/价格申请管理 | `/admin/finance/price-apply` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-cos-finance/admin-api/v1/financePriceApplicationManager/page |
| 授权管理/商品授权 | `/admin/auth-management/product-auth` | 有数据 | 筛选查询完成 | 已打开，行字段匹配 | HTTP 200、业务“一切ok”；gree-business-order-tool/admin-api/v1/toolAuthorization/authorizationPage；曾有控制台错误 |
| 授权管理/投放管理 | `/admin/auth-management/launch-management` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-tool/admin-api/v1/toolAuthorization/deliveryPage |
| 授权管理/外仓管理 | `/admin/auth-management/outside-store` | 有数据 | 筛选查询完成 | 已打开，行字段匹配 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderExternalWarehouseAuthConfig/pageList；曾有控制台错误 |
| 系统设置/操作日志 | `/admin/system/operation-log` | 有数据 | 筛选查询完成 | 未验证：未发现明确查看入口 | HTTP 200、业务“一切ok”；gree-business-order-tool/admin-api/v1/operationLog/page |
| 系统设置/产品线配置 | `/admin/system/product-line` | 有数据 | 筛选查询完成 | 已打开，行字段匹配 | HTTP 200、业务“一切ok”；gree-cos-commodity/admin-api/v1/commodityProductLine/page；曾有控制台错误 |
| 系统设置/业务链路配置 | `/admin/system/link-config` | 有数据 | 筛选查询完成 | 已打开，行字段匹配 | HTTP 200、业务“一切ok”；gree-business-order-tool/admin-api/v1/toolLink/page |
| 系统设置/月计划配置 | `/admin/system/monthly-plan` | 有数据 | 筛选查询完成 | 已打开，行字段匹配；响应体未复核 | HTTP 200、业务“一切ok”；gree-cos-commodity/admin-api/v1/commodityMonthPlanConfig/page；曾有控制台错误 |
| 系统设置/销司小库配置 | `/admin/system/warehouse-config` | 有数据 | 筛选查询完成 | 已打开，行字段匹配；响应体未复核 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderSalesCompanyWarehouseConfig/page；曾有控制台错误 |
| 系统设置/配送类型配置 | `/admin/system/delivery-type` | 有数据 | 无可核实查询 | 已打开，行字段匹配；响应体未复核 | 默认请求 HTTP 200；业务体未全面核对 |
| 订单中心/订单管理 | `/admin/order-management/order` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderInfo/page |
| 订单中心/发货单管理 | `/admin/order-management/delivery` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/deliveryInfo/page |
| 订单中心/月计划管理 | `/admin/order-management/monthly` | 有数据 | 筛选查询完成 | 已打开，行字段匹配 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderMonthPlan/page |
| 订单中心/改发申请表 | `/admin/order-management/redelivery-application` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderDeliveryInfoRedevelopment/notLtlPageList |
| 订单中心/订单取消申请 | `/admin/order-management/cancel-order` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderInfoCancelApply/pageList；曾有控制台错误 |
| 订单中心/发货跟踪表 | `/admin/order-management/shipment-tracking` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order-report/order-api/v1/manager/orderDeliveryInfoTrack/pageOrderDeliveryInfoTrack |
| 订单中心/订单跟踪表 | `/admin/order-management/order-tracking` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order-report/order-api/v1/manager/orderInfoTrack/pageOrderInfoTrack |
| 订单中心/开单明细报表 | `/admin/order-management/billing-detail` | 有数据 | 调整条件查询完成 | 未验证：未发现明确查看入口 | HTTP 200、业务“一切ok”；gree-business-order-order-report/order-api/v1/manager/orderDeliveryBillingDetail/displayBillingDetailManagerCustomerList |
| 咨询单/价格咨询 | `/admin/consult/consult-price` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-consult/consult-api/v1/manager/consult-order-price/getPageList |
| 咨询单/成品码申请单 | `/admin/consult/consult-sku-apply` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-consult/consult-api/v1/manager/consultSkuCodeApplication/pageList |
| 咨询单/商用工具咨询单 | `/admin/consult/consult-commercial-tools` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-consult/consult-api/v1/manager/consultCommercialTool/page |
| 二类订单中心/订单管理 | `/admin/second-order-management/second-order` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderInfo/secondCategoryOrderInfoPage |
| 二类订单中心/发货单管理 | `/admin/second-order-management/second-delivery` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/deliveryInfo/secondCategoryPageList |
| 二类订单中心/二类结算管理 | `/admin/second-order-management/second-settle` | 有数据 | 筛选查询完成 | 未验证：未发现明确查看入口 | HTTP 200、业务“一切ok”；gree-business-order-order-report/order-api/v1/manager/orderSecondarySettlement/pageList |
| 审批中心 | `/admin/approval` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-crm-activiti/activiti-api/v1/activitiFlow/approval/page；曾有控制台错误 |
| 报表中心/销售报表-销售订单维度 | `/admin/report-center/sales-report-bi` | 外部 BI 容器 | BI 内未操作 | 未验证：外部 BI | 嵌入请求 HTTP 200，内部未核 |
| 报表中心/项目技术咨询单审批报表 | `/admin/report-center/technical-report` | 空态 | 调整条件查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-consult/consult-api/v1/manager/consultTechnology/report/listForTechApproval |
| 报表中心/月计划报表BI | `/admin/report-center/monthly-report-bi` | 外部 BI 容器 | BI 内未操作 | 未验证：外部 BI | 嵌入请求 HTTP 200，内部未核 |
| 报表中心/货期咨询单报表 | `/admin/report-center/consult-report` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-consult/consult-api/v1/manager/consult-order-delivery/report/pageListForCommonMachine |
| 报表中心/二类订单咨询单审批报表 | `/admin/report-center/second-consult-report` | 空态 | 筛选查询完成 | 未验证：默认无数据 | HTTP 200、业务“一切ok”；gree-business-order-consult/consult-api/v1/manager/second-order-consult/report/pageListForSecondClassOrder |
| 报表中心/月计划报表 | `/admin/report-center/monthly-report` | 有数据 | 筛选查询完成 | 未验证：未发现明确查看入口 | HTTP 200、业务“一切ok”；gree-business-order-order/order-api/v1/manager/orderMonthPlan/reportPage |

## 现象与限制

1. 首轮销售任务管理、商品授权、外仓管理、产品线配置、月计划配置、销司小库配置、订单取消申请、审批中心出现未处理 Promise 控制台错误；商品授权另见 `fetchError: Failed to fetch`。对应页面主体可见；本轮未保留初发时的完整堆栈或截图，不能确定请求来源及实际影响。对销售任务管理、商品授权、外仓管理、月计划配置重新进入后未复现；不能据此证明其他页面已恢复，也不归因或提交 BUG。
2. 初次以不变条件点击查询未产生新增请求；之后使用短筛选值或缩小日期范围补验。部分长筛选值被字段长度校验拦截，换短值后通过；这属于本轮操作调整，非产品缺陷结论。
3. 多数列表的代表性查询请求 HTTP 200 且响应消息为“一切ok”；部分默认加载、详情及其他业务请求的响应体未读到或未全面核对，不能推断全部接口正常。控制台和网络观察限于页面操作期间；未对未知请求重放。
4. 两个 BI 容器自然加载了 di.gree.com 嵌入资源，本轮未进入外部系统操作，也未核实图表、筛选和业务响应；不能判内部可用。
5. 原始截图和网络响应未形成完整归档，初发错误缺少可复现证据；当前报告是演练摘要，不能用于缺陷归因。未覆盖详情、其他分页、导出及写入操作均未验证。

## 今晚准备

- 页面公告显示 2026-11-02 18:00—22:00 营销一体化平台升级，期间无法登录使用；具体上线与可用时间以用户通知和实际页面为准。
- 正式轮次重新确认登录身份、版本、实际菜单和可用性，另起目录计时，不复用本轮覆盖结论；用户通知开始后才执行。
- 提前解决专用 headless Chrome 配置目录占用或明确本次可用的登录接续方式；正式轮次优先确认查询请求确实产生，保留脱敏后的控制台、网络及必要截图证据；按 2→4 路验证稳定性，遇限流、串页或持续错误及时降速。
