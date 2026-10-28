# 已撤回候选：排序非法值自动修正为合法值

2026-10-28用户明确确认自动修正或提示均可，只要最终持久化为0—9999的整数。原候选不再作为BUG；原执行证据及菜单ID112保留。复核见 observations/menu-sort-invalid-reassessment.json。

--- 原候选（保留历史） ---

# 候选问题：排序输入负数被改为0后仍创建菜单

- 关联场景：`mcp-node-mvhu73w6-44`；是否与排序范围候选合并，由主脑按原因审查。
- 需求依据：`requirements/68701/sources/menu-requirements-extract.txt` 排序范围0–9999；正式用例预期非法排序时不新增目标菜单并保留其他输入。
- 环境：QA，实际构建未知；管理员账号引用`qa.jinyelun.admin`。
- 步骤：新增菜单填写合法名称、编码、权限、图标及备注，在排序输入-1并移开焦点；点击【提 交】一次，刷新后打开该菜单编辑。
- 实际：输入-1时控件显示文本-1，移开焦点后变为0；提交请求排序为0，创建菜单ID112，刷新编辑仍为0。
- 期望：不接受-1，且按本场景预期不得新建目标菜单并保留其他输入。
- 真实原图：`.local/68701/qa-ui-20261028/menu-sort-negative-before-submit.png`、`.local/68701/qa-ui-20261028/menu-sort-negative-edit.png`。本机请求及树响应：`network-2-7372.network-request`、`network-2-7373.network-response`。需主脑核对“限制为0后允许提交”与原始验收规则是否冲突，避免仅凭推断归因。
- 测试对象ID112保留，未重复提交。
