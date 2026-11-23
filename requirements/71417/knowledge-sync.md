# 71417 知识同步

## 2026-11-23 已录入并回读

- 目标：asynctest-kb「客户资源管理系统」（项目 3），一条跨端主条目。
- 条目：71417 单点登录：跨系统业务规则与本次补充。
- 范围：CRM、订单管理端、订单客户端的单点规则，以及统一用户平台的账号匹配和资格依赖；单点入口、认证、权限与异常；本会话的UAT简测、BUG关闭和简报要求单列为当次工作安排。
- 最新口径：本期不支持路由回登录前业务页面；历史BUG-71417-002撤回。历史测试观察与现行业务规则分开。
- 写入：用户确认最终预览后，通过 asynctest-kb MCP 单次录入；回执 MCP-7EDECBD0，operation=insert，状态 completed，verification.ok=true，commit_seq=22。
- 回读：按项目3及条目名称读取现行正文，MCP-56AF8278，complete=true、truncated=false，正文与用户确认预览一致。
- `knowledge_ref`：`ntc_eyJjb21taXRfc2VxIjoyMiwicG9vbF9jb21wbGV0ZSI6ZmFsc2UsInByb2plY3RfaWQiOiIzIiwidGFyZ2V0X2RpZ2VzdCI6ImNjYjliNWZmNjk1NGE2NjljNDA0ZDE5YzkzODc2NWUwZGIxYjIyMjFmYTdmYjBlMDQxOGFjMWM2ZTliN2U2ZjQiLCJ0YXJnZXRzIjpbeyJkb2N1bWVudF9pZCI6ImRvY182ZWUyNTQyNmZhZGE0MzdiODg0YmNjMTlkMDFiZTE4YyIsImdlbmVyYXRpb25faWQiOiJnZW5fNDdiZTE5OTdmNWViNDg2N2E2NDc0MzA2YjcxNGM5MTkiLCJzZWN0aW9uX3BhdGgiOltdfV19.kG1WYkabm8f3CEJtNPaQtgsKbg2YCv3mU-qL0XIwiEA`
- 去重：对客户资源管理系统、商用订单两端、统一用户管理平台做有界搜索；未在返回片段找到直接可复用的71417单点条目。客户资源管理系统现行目录核对为19项（录入前）；CRM与管理端检索有更多候选，不声称全库无重复。
- 关联维护：正文明确覆盖订单两端与统一用户平台依赖。当前只在客户资源管理系统项目保存主条目；其他项目未新增副本或独立引用。按其他项目检索时需跨项目包含客户资源管理系统，不能假定其本项目目录中已有副本。
- 原用户误指定 Mind 后先建了独立需求图，纠正为知识库后已实际录入本条；Mind图和34条测试用例均独立保留，不将图文件误称为知识库提交。

知识库写入校验只证明本次确认的正文已写入；测试边界仍按原记录，不表示全部测试通过。
