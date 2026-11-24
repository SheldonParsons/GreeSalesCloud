# 申请型号自定义确认 QA 测试记录

**结果为通过。** 本次执行 1 条用例，共 8 步。手输短型号确认后成功保存，重开同一子单和进入下游审批时，申请型号都与手输值逐字一致。

| 项目 | 本次记录 |
| --- | --- |
| 日期 | 2026-11-24 |
| 环境 | 商用订单管理系统 QA，独立无界面 Chrome DevTools MCP，实际构建号未知 |
| QA 专用咨询子单 | `重明220261124001JS-001` |
| 完整候选 | `离心式压缩机 GCM620 顶(配GD-ALTF480-A4)` |
| 手输申请型号 | `离心式压缩机 GCM620` |
| 当前节点 | 商经部技术人员核对 |
| 用例状态 | Mind 场景标记为 `progress-100`，已从正式路径回读。 [正式 Mind 用例](/Users/sheldon/Documents/crm/2026/1130/V7.33版本_项目技术咨询审批申请型号自定义确认_lb_20261130.amind) |

## 测试过程和截图证据

### 1. 准备专用非标子单

在 QA 客户端创建带本次测试标识的专用非标子单。客户端技术主管同意后，李博在管理端接单，实际商经部答复人员将该单转给商技部。按完整子单号回查后确认当前节点为「商技部技术人员答复」。[建单回读](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/create-output.txt) · [商技部节点回读](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/technical-approval.json)

### 2. 确认短型号没有精确同名

原用例示例 `LHP832EE3EE3/Nb` 在 QA 查询无候选，本次实际使用上表中的 GCM620 长短型号。补查时，林莉在 QA 管理端「商品中心 → 商品管理」按短型号查询，商品编码留空，状态不设筛选。页面共 2 条，每页 20 条，两个结果都在第一页。

- `离心式压缩机 GCM620 顶(配GD-ALTF480-A4)`
- `离心式压缩机 GCM620D 顶(配GD-ALTD480-B)`

两条都与短型号不同。结论适用于林莉账号在该 QA 商品管理页可查询的范围。截图显示查询词和总数，完整型号在同次页面快照中。 [商品管理查询快照](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-commodity-result.txt)

![QA 商品管理页以短型号查询，返回两条](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-commodity-result.png)

### 3. 在仍有近似候选时确认短型号

林莉在同一子单的「商技部答复」选择【答复】和【衍生机】，先选完整候选，再在「申请型号」中手工删除后缀。短型号、两条近似候选及【点击这里确认使用该型号】同时出现。点击链接后，输入框读回 `离心式压缩机 GCM620`。 [点击后输入框快照](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-confirm.txt)

![短型号、近似候选与确认入口在同一审批页显示](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-match.png)

补齐参考型号、QA 参数表、说明和审批意见，选择【同意】并提交一次。页面显示「审批成功」，列表读回「答复中（李博）」。 [提交前快照](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-presubmit.txt) · [提交结果快照](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-submit2.txt)

### 4. 保存后按同一子单号重开

林莉按完整子单号 `重明220261124001JS-001` 重新查询并点【查看】。「商技部答复 → 产品选型信息」的申请型号仍为 `离心式压缩机 GCM620`。同次快照可核对子单号和字段值。 [重开查看快照](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-check-view.txt)

![同一子单保存后重开查看，商技部申请型号仍是短值](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-reopened-view.png)

### 5. 核对下游审批带入的值

李博按同一子单号打开【审批】，页面节点为「商经部技术人员核对」。「商经部最终答复销售公司 → 产品选型信息」自动带入的申请型号为 `离心式压缩机 GCM620`，与保存后重开的值逐字一致。本轮停在该节点。 [下游审批快照](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-down-check.txt)

![商经部技术人员核对页自动带入同一个短型号](/Users/sheldon/Documents/GithubProject/GreeSalesCloud/.local/1130-申请型号自定义确认/20261124-qa/1130-downstream-view.png)

## 2026-11-24 的中断与恢复

- 首轮尝试在 QA 登录页遇到 `net::ERR_HTTP2_PROTOCOL_ERROR)，用例尚未开始。用户连好测试网络后，QA 登录入口恢复访问。
- 建单并推进至商技部答复后，重新登录时滑块服务连接超时。恢复后在独立的持续无界面会话内继续同一子单，完成测试与只读补查。

截图和页面快照保存在本机证据目录，Markdown 中的证据链接可在本机打开。
