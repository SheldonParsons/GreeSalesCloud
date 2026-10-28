# 候选问题：新增菜单后编辑时备注未回显

- 关联场景：`mcp-node-mvhu73w2-33`（该场景其余账号绑定和导航检查尚未完成）。
- 环境：QA；管理员账号引用 `qa.jinyelun.admin`；实际构建版本未知。
- 需求依据：`requirements/68701/sources/menu-requirements-extract.txt` 的菜单字段表列出备注（非必填、最大200），`requirements/68701/sources/menu-create-dialog-20261021.md` 记录新增表单存在备注输入。S8 `requirements/68701/sources/menu-operation-rules-20261021.md` 的编辑规则明确要求回显目标节点全部字段，涵盖已填写备注。
- 步骤：管理员进入平台设置→菜单管理→新增菜单，填写名称 `QA68701主菜单A`、编码 `QA68701RootA1028`、备注 `68701 QA独占菜单A`及其他必填项并提交；创建成功后刷新菜单树，打开该菜单编辑抽屉。
- 实际：已确认创建的菜单ID为104；编辑抽屉中备注为空。创建请求体包含上述备注；刷新后菜单树响应中的ID104对象不含remark字段。其他可见字段回显，未发出编辑提交。
- 期望：重新打开编辑时显示原备注。
- 原始截图：`.local/68701/qa-ui-20261028/menu-104-remark-empty.png`（真实页面，未经标注）。
- 本机必要接口证据：`.local/68701/qa-ui-20261028/network-2-440.network-request` 为创建请求，`network-2-440.network-response` 为创建响应，`network-2-747.network-response` 为刷新后的菜单树响应；原始请求可能包含敏感上下文，不直接复制或发布，按需只提取脱敏字段。
- 归因边界：现有证据不能判断服务端存储丢失还是树接口未返回或前端回填遗漏；无需重建ID104。主脑已建档 BUG-68701-002；本场景未判定结束，备注问题作为额外发现单独计数。
